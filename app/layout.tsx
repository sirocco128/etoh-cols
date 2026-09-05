import type { Metadata } from "next";
import { Geist, Noto_Sans_Thai, Sarabun } from "next/font/google";
import { BuyerAssistantWidget } from "@/components/BuyerAssistantWidget";
import { EnvironmentBanner } from "@/components/EnvironmentBanner";
import { FloatingQuoteDock } from "@/components/FloatingQuoteDock";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { MobileStickyCta } from "@/components/MobileStickyCta";
import { Navbar } from "@/components/Navbar";
import { SiteChrome } from "@/components/SiteChrome";
import { SmoothScroll } from "@/components/SmoothScroll";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { buildMetadata } from "@/lib/metadata";
import {
  buildLocalBusinessJsonLd,
  buildOrganizationJsonLd,
} from "@/lib/seo";
import "./globals.css";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sarabun",
});

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-sans-thai",
});

export const metadata: Metadata = buildMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organization = buildOrganizationJsonLd();
  const localBusiness = buildLocalBusinessJsonLd();

  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`${sarabun.variable} ${geist.variable} ${notoSansThai.variable}`}
    >
      <body className={`${sarabun.className} flex min-h-screen flex-col`}>
        <ThemeProvider>
          <SmoothScroll />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brass focus:px-4 focus:py-2 focus:text-forest focus:shadow"
          >
            ข้ามไปยังเนื้อหาหลัก
          </a>
          <SiteChrome
            chrome={
              <>
                <EnvironmentBanner />
                <Navbar />
              </>
            }
          >
            <main id="main-content" className="flex-1 pb-mobile-cta">
              {children}
            </main>
          </SiteChrome>
          <SiteChrome chrome={<Footer />}>{null}</SiteChrome>
          <SiteChrome chrome={<MobileStickyCta />}>{null}</SiteChrome>
          <SiteChrome chrome={<FloatingQuoteDock />}>{null}</SiteChrome>
          <SiteChrome chrome={<BuyerAssistantWidget />}>{null}</SiteChrome>
          <SiteChrome chrome={<Toaster />}>{null}</SiteChrome>
          <JsonLd data={organization} />
          {localBusiness ? <JsonLd data={localBusiness} /> : null}
        </ThemeProvider>
      </body>
    </html>
  );
}
