import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { siteConfig } from "@/config/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} - AI Workspace for Chat, Coding and Research`,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "technology",
  manifest: "/site.webmanifest",
  openGraph: {
    title: `${siteConfig.name} - AI Workspace for Builders`,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} product preview`,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} - AI Workspace for Builders`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: siteConfig.shortName,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#070a13",
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  alternateName: siteConfig.shortName,
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web",
  url: siteConfig.url,
  image: `${siteConfig.url}/logo.png`,
  description: siteConfig.description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "NGN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <body>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(structuredData),
            }}
          />
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
