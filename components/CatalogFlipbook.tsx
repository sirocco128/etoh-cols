"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Printer,
} from "lucide-react";
import { CatalogImage } from "@/components/CatalogImage";
import { Button } from "@/components/ui/button";
import type { CatalogBookPage } from "@/lib/catalog-book";
import { cn } from "@/lib/utils";
import {
  FLIP_CATALOG_EXTERNAL,
  FLIP_CATALOG_PRINT_HINT,
  LOGO_SCREENING_BADGE,
} from "@/lib/ux-copy";

type CatalogFlipbookProps = {
  pages: CatalogBookPage[];
  flipHtml5Url?: string | null;
};

export function CatalogFlipbook({
  pages,
  flipHtml5Url,
}: CatalogFlipbookProps) {
  const reduceMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const swipeX = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [mode, setMode] = useState<"flip" | "external">("flip");
  const total = pages.length;
  const page = pages[index];

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(total - 1, next));
      if (clamped === index) return;
      setDirection(clamped > index ? 1 : -1);
      setIndex(clamped);
    },
    [index, total],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        go(index + 1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        go(index - 1);
      } else if (event.key === "Home") {
        go(0);
      } else if (event.key === "End") {
        go(total - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, total]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const onChange = () => {
      setFullscreen(document.fullscreenElement === node);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = async () => {
    const node = stageRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await node.requestFullscreen();
  };

  if (!page) return null;

  return (
    <div className="mt-8">
      {flipHtml5Url ? (
        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          <Button
            type="button"
            size="sm"
            variant={mode === "flip" ? "forest" : "outline"}
            onClick={() => setMode("flip")}
          >
            พลิกบนเว็บ
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "external" ? "forest" : "outline"}
            onClick={() => setMode("external")}
          >
            {FLIP_CATALOG_EXTERNAL}
          </Button>
        </div>
      ) : null}

      {mode === "external" && flipHtml5Url ? (
        <iframe
          title={FLIP_CATALOG_EXTERNAL}
          src={flipHtml5Url}
          className="min-h-[70vh] w-full rounded-2xl border border-forest/10 bg-paper print:hidden"
          allow="fullscreen"
        />
      ) : (
        <>
          <div
            ref={stageRef}
            className={cn(
              "relative overflow-hidden rounded-3xl border border-forest/10 bg-forest-mist/60 shadow-xl",
              "dark:border-white/10 dark:bg-forest/50",
              fullscreen && "rounded-none bg-forest",
            )}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 print:hidden sm:px-6">
              <p className="text-sm font-medium text-forest dark:text-brass-soft">
                หน้า {index + 1} / {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                >
                  <Printer aria-hidden />
                  พิมพ์ / PDF
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={fullscreen ? "ออกจากเต็มจอ" : "เต็มจอ"}
                  onClick={() => void toggleFullscreen()}
                >
                  {fullscreen ? (
                    <Minimize2 aria-hidden />
                  ) : (
                    <Maximize2 aria-hidden />
                  )}
                </Button>
              </div>
            </div>

            <div className="[perspective:1600px] px-3 pb-6 sm:px-6">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.article
                  key={index}
                  custom={direction}
                  initial={
                    reduceMotion
                      ? { opacity: 0 }
                      : { rotateY: direction * 70, opacity: 0 }
                  }
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { rotateY: direction * -70, opacity: 0 }
                  }
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  className="catalog-flip-page relative min-h-[28rem] origin-center overflow-hidden rounded-2xl bg-paper shadow-[0_20px_50px_rgba(20,53,42,0.18)] sm:min-h-[34rem] dark:bg-forest-light/80"
                  style={{ transformStyle: "preserve-3d" }}
                  aria-live="polite"
                  onTouchStart={(event) => {
                    const x = event.changedTouches[0]?.clientX;
                    swipeX.current = typeof x === "number" ? x : null;
                  }}
                  onTouchEnd={(event) => {
                    const start = swipeX.current;
                    const x = event.changedTouches[0]?.clientX;
                    swipeX.current = null;
                    if (start == null || typeof x !== "number") return;
                    const dx = x - start;
                    if (dx < -48) go(index + 1);
                    if (dx > 48) go(index - 1);
                  }}
                >
                  <FlipPageBody page={page} />
                </motion.article>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-center gap-3 pb-5 print:hidden">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="หน้าก่อน"
                disabled={index === 0}
                onClick={() => go(index - 1)}
              >
                <ChevronLeft aria-hidden />
              </Button>
              <Button
                type="button"
                variant="forest"
                disabled={index >= total - 1}
                onClick={() => go(index + 1)}
              >
                พลิกหน้า
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink/55 print:hidden dark:text-paper/60">
            {FLIP_CATALOG_PRINT_HINT}
          </p>
        </>
      )}

      <div className="catalog-flip-print hidden print:block" aria-hidden="true">
        {pages.map((item, pageIndex) => (
          <section
            key={`${item.kind}-${pageIndex}`}
            className="mb-8 break-after-page overflow-hidden rounded-xl border border-forest/15 bg-paper"
          >
            <FlipPageBody page={item} />
          </section>
        ))}
      </div>
    </div>
  );
}

function FlipPageBody({ page }: { page: CatalogBookPage }) {
  if (page.kind === "cover") {
    return (
      <div className="grid min-h-[28rem] sm:min-h-[34rem] lg:grid-cols-2">
        <div className="relative h-full min-h-[16rem]">
          <CatalogImage
            src={page.image}
            alt={page.title}
            sizes="(max-width:1024px) 100vw, 50vw"
            className="group-hover:scale-100"
            priority
          />
        </div>
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-brass">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            {page.groupLabel}
          </p>
          <h2 className="mt-3 text-3xl font-bold text-forest dark:text-paper">
            {page.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink/70 dark:text-paper/75">
            {page.subtitle}
          </p>
          <p className="mt-6 text-sm text-ink/55 dark:text-paper/60">
            {page.productCount} รายการในสมุดนี้
          </p>
        </div>
      </div>
    );
  }

  if (page.kind === "section") {
    return (
      <div className="grid min-h-[28rem] sm:min-h-[34rem] lg:grid-cols-2">
        <div className="relative h-full min-h-[16rem]">
          <CatalogImage
            src={page.image}
            alt={page.name}
            sizes="(max-width:1024px) 100vw, 50vw"
            className="group-hover:scale-100"
          />
        </div>
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-wide text-brass">
            กลุ่มสินค้า
          </p>
          <h2 className="mt-2 text-3xl font-bold text-forest dark:text-paper">
            {page.name}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink/70 dark:text-paper/75">
            {page.description}
          </p>
          <p className="mt-6 text-sm text-ink/55">
            {page.count} เซ็ตในกลุ่มนี้ · {LOGO_SCREENING_BADGE}
          </p>
        </div>
      </div>
    );
  }

  if (page.kind === "closing") {
    return (
      <div className="flex min-h-[28rem] flex-col items-center justify-center px-6 py-16 text-center sm:min-h-[34rem] sm:px-16">
        <h2 className="text-3xl font-bold text-forest dark:text-paper">
          {page.title}
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink/70 dark:text-paper/75">
          {page.body}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/contact">ขอใบเสนอราคา</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/products">ดูสินค้าเป็นรายการ</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { product, groupName } = page;
  const quoteHref = `/contact?productSlug=${encodeURIComponent(product.slug)}&productInterest=${encodeURIComponent(product.name)}`;

  return (
    <div className="grid min-h-[28rem] sm:min-h-[34rem] lg:grid-cols-2">
      <div className="relative h-full min-h-[16rem]">
        <CatalogImage
          src={product.image}
          alt={product.name}
          sizes="(max-width:1024px) 100vw, 50vw"
          className="group-hover:scale-100"
        />
        <span className="absolute left-4 top-4 rounded-full bg-paper/90 px-3 py-1 text-xs font-medium text-forest shadow-sm backdrop-blur-md">
          {LOGO_SCREENING_BADGE}
        </span>
      </div>
      <div className="flex flex-col justify-between px-6 py-8 sm:px-10">
        <div>
          <p className="text-xs font-medium text-brass">{groupName}</p>
          <h2 className="mt-2 text-2xl font-bold text-forest dark:text-paper">
            {product.name}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink/70 dark:text-paper/75">
            {product.description}
          </p>
          <p className="mt-3 text-sm text-ink/55">วัสดุ: {product.material}</p>
        </div>
        <div className="mt-6 border-t border-forest/10 pt-5 dark:border-white/10">
          <p className="text-xs text-ink/50">จำนวนขั้นต่ำ {product.minOrder} ชุด</p>
          <p className="mt-1 text-lg font-bold text-forest dark:text-brass-soft">
            เริ่มต้น {product.priceRange || "สอบถามราคา"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={quoteHref}>ขอราคาเซ็ตนี้</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/products/${product.slug}`}>ดูหน้ารายละเอียด</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
