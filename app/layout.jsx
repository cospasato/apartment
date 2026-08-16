import "./globals.css";
import AppShell from "@/components/layout/AppShell";

export const metadata = {
  title: "NIZAWADIE — Self Service Gift Registry Platform",
  description: "Create gift registries for weddings, birthdays, baby showers and more.",
  themeColor: "#7b1c2e",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "NIZAWADIE" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
