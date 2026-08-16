export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

function rewriteHtml(html, baseOrigin, appOrigin) {
  // 1. Inject base tag so relative assets (CSS, JS, images) load correctly
  html = html.replace(
    /<head([^>]*)>/i,
    `<head$1><base href="${baseOrigin}/">`
  );

  // 2. Rewrite stylesheet and script src URLs to load through same origin
  html = html.replace(
    /(href|src)="(\/\/[^"]+|https?:\/\/[^"]+)"/g,
    (match, attr, url) => {
      const absolute = url.startsWith("//") ? "https:" + url : url;
      // Only proxy same-domain resources to avoid breaking CDN assets
      if (absolute.startsWith(baseOrigin)) {
        return `${attr}="/api/proxy?url=${encodeURIComponent(absolute)}"`;
      }
      return match;
    }
  );

  // 3. Rewrite all internal anchor links to go through the browser
  html = html.replace(
    /href="(\/[^"#][^"]*|https?:\/\/[^"]+)"/g,
    (match, url) => {
      const absolute = url.startsWith("http") ? url : `${baseOrigin}${url}`;
      if (absolute.startsWith(baseOrigin)) {
        return `href="#" data-nav="${absolute}"`;
      }
      return match;
    }
  );

  // 4. Rewrite form actions
  html = html.replace(
    /action="(\/[^"]*|https?:\/\/[^"]+)"/g,
    (match, url) => {
      const absolute = url.startsWith("http") ? url : `${baseOrigin}${url}`;
      if (absolute.startsWith(baseOrigin)) {
        return `action="/api/proxy-post?url=${encodeURIComponent(absolute)}"`;
      }
      return match;
    }
  );

  // 5. Inject navigation bridge — intercepts clicks and tells the parent browser UI
  const bridge = `
<script>
(function(){
  // Tell parent our current URL
  try { window.parent.postMessage({type:'NAV',url:location.href},'*'); } catch(e){}

  // Intercept all link clicks
  document.addEventListener('click', function(e) {
    const a = e.target.closest('[data-nav]');
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    const url = a.getAttribute('data-nav');
    if (url) window.parent.postMessage({type:'NAV_REQUEST',url:url},'*');
  }, true);

  // Intercept Shopify AJAX navigation (for dynamic stores)
  const _pushState = history.pushState.bind(history);
  history.pushState = function(state, title, url) {
    _pushState(state, title, url);
    try { window.parent.postMessage({type:'NAV',url:location.href},'*'); } catch(e){}
  };
})();
</script>`;

  html = html.replace(/<\/body>/i, bridge + "</body>");
  return html;
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const target = searchParams.get("url");

  if (!target) {
    return NextResponse.json({ error: "No URL" }, { status: 400 });
  }

  let targetUrl;
  try {
    targetUrl = new URL(decodeURIComponent(target));
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    const contentType = res.headers.get("content-type") || "";
    const finalUrl = res.url;
    const baseOrigin = new URL(finalUrl).origin;

    // For non-HTML (images, CSS, JS) — pass through directly
    if (!contentType.includes("text/html")) {
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        status: res.status,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
          "X-Frame-Options": "SAMEORIGIN",
        },
      });
    }

    let html = await res.text();
    html = rewriteHtml(html, baseOrigin, origin);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "SAMEORIGIN",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    // Fallback error page shown inside the iframe
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
      <head><style>
        body{margin:0;background:#0a0a0a;color:#9a9690;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:40px}
        h2{color:#f0ede8;font-size:20px;margin-bottom:12px}
        a{color:#e8d5b0}
        .btn{display:inline-block;margin-top:20px;padding:12px 28px;background:#e8d5b0;color:#0a0a0a;border-radius:8px;text-decoration:none;font-weight:700}
      </style></head>
      <body>
        <div>
          <h2>Could not load this page</h2>
          <p>${err.message}</p>
          <a class="btn" href="${targetUrl}" target="_blank">Open store directly ↗</a>
          <br><br>
          <a href="#" onclick="window.parent.postMessage({type:'GO_BACK'},'*')">← Back to marketplace</a>
        </div>
      </body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }
}
