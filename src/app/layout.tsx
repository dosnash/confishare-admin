import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import "./admin-ui.css";

const siteUrl = process.env.SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  ?? (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)
  ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Admin | ConfiShare",
  description: "Platform-wide users, subscriptions and usage.",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "64x64" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "ConfiShare Admin",
    description: "Platform-wide users, subscriptions and usage.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "ConfiShare" }],
  },
  twitter: { card: "summary_large_image", images: ["/og-image.jpg"] },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
