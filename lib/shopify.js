export const dynamic = "force-dynamic";

// Uses Shopify Storefront API tokenless access
// No token needed — works on any public Shopify store
// Tokenless access supports: products, collections, shop info
// Complexity limit: 1000 per query (plenty for product listings)

export function createStorefrontClient(shopDomain) {
  const cleanDomain = shopDomain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "")
    .trim();

  const endpoint = `https://${cleanDomain}/api/2024-10/graphql.json`;

  return {
    async query(graphql, variables = {}) {
      let res;
      try {
        res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // No auth token needed for tokenless access
          },
          body: JSON.stringify({ query: graphql, variables }),
          cache: "no-store",
        });
      } catch (networkErr) {
        throw new Error(`Cannot reach ${cleanDomain}: ${networkErr.message}`);
      }

      const text = await res.text();

      if (!res.ok) {
        throw new Error(
          `Shopify returned ${res.status} for ${cleanDomain}. ` +
          `Make sure the domain is correct (must be x.myshopify.com). ` +
          `Response: ${text.slice(0, 200)}`
        );
      }

      let json;
      try { json = JSON.parse(text); } catch {
        throw new Error(`Invalid response from ${cleanDomain}: ${text.slice(0, 200)}`);
      }

      if (json.errors) {
        throw new Error(`GraphQL error from ${cleanDomain}: ${JSON.stringify(json.errors).slice(0, 300)}`);
      }

      return json.data;
    },
  };
}

// Simple products query — tokenless, no auth required
const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        handle
        descriptionHtml
        availableForSale
        tags
        productType
        priceRange {
          minVariantPrice { amount currencyCode }
        }
        compareAtPriceRange {
          minVariantPrice { amount currencyCode }
        }
        featuredImage { url altText }
      }
    }
  }
`;

export async function fetchStoreProducts(store) {
  // No token needed — tokenless access
  const client = createStorefrontClient(store.shopDomain);

  const storeBaseUrl = store.customDomain
    ? `https://${store.customDomain}`
    : `https://${store.shopDomain}`;

  let allProducts = [];
  let cursor = null;
  let hasMore = true;

  while (hasMore && allProducts.length < 250) {
    const data = await client.query(PRODUCTS_QUERY, {
      first: 50,
      after: cursor || undefined,
    });

    const nodes = data.products.nodes;
    allProducts = allProducts.concat(nodes);
    hasMore = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }

  return allProducts.map((p) => {
    const price = parseFloat(p.priceRange?.minVariantPrice?.amount || "0");
    const comparePrice = p.compareAtPriceRange?.minVariantPrice?.amount
      ? parseFloat(p.compareAtPriceRange.minVariantPrice.amount)
      : null;
    const description = p.descriptionHtml
      ? p.descriptionHtml.replace(/<[^>]*>/g, "").slice(0, 500)
      : null;

    return {
      id: p.id,
      storeId: store.id,
      title: p.title,
      handle: p.handle,
      description,
      price,
      comparePrice: comparePrice && comparePrice > price ? comparePrice : null,
      currency: p.priceRange?.minVariantPrice?.currencyCode || store.currency || "USD",
      imageUrl: p.featuredImage?.url || null,
      productUrl: `${storeBaseUrl}/products/${p.handle}`,
      tags: p.tags || [],
      category: p.productType || null,
      available: p.availableForSale,
      updatedAt: new Date(),
    };
  });
}

export async function verifyWebhookSignature(body, hmacHeader) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    return Buffer.from(sig).toString("base64") === hmacHeader;
  } catch { return false; }
}
