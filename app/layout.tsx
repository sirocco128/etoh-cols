import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { EnvironmentBanner } from "@/components/EnvironmentBanner";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { MobileStickyCta } from "@/components/MobileStickyCta";
import { Navbar } from "@/components/Navbar";
import { SiteChrome } from "@/components/SiteChrome";
import { buildMetadata } from "@/lib/metadata";
import {
  buildLocalBusinessJsonLd,
  buildOrganizationJsonLd,
} from "@/lib/seo";
import "./globals.css";

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
    <html lang="th" className={notoSansThai.variable}>
      <body className={`${notoSansThai.className} flex min-h-screen flex-col`}>
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
        <JsonLd data={organization} />
        {localBusiness ? <JsonLd data={localBusiness} /> : null}
      </body>
    </html>
  );
}
