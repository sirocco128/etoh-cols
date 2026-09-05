"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { CatalogImage } from "@/components/CatalogImage";
import { LOGO_SCREENING_BADGE } from "@/lib/ux-copy";
import { productCoverImage } from "@/lib/product-media";
import { cn } from "@/lib/utils";

export type ProductCardModel = {
  name: string;
  slug: string;
  priceRange: string;
  minOrder: number;
  images: string[];
  categorySlug?: string;
};

type ProductCardProps = {
  product: ProductCardModel;
  heading?: "h2" | "h3";
  className?: string;
};

export function ProductCard({
  product,
  heading = "h3",
  className,
}: ProductCardProps) {
  const imageUrl = productCoverImage(product.images, product.categorySlug);
  const TitleTag = heading;
  const price = product.priceRange?.trim() || "สอบถามราคา";

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-forest/10 bg-paper p-3 shadow-sm transition-all duration-300",
        "hover:-translate-y-1 hover:border-brass/30 hover:shadow-xl",
        "dark:border-white/10 dark:bg-forest-light/40",
        className,
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-forest-mist">
        <CatalogImage
          src={imageUrl}
          alt={product.name}
          sizes="(max-width:768px) 100vw, 33vw"
          fallbackSrc={productCoverImage([], product.categorySlug)}
        />
        <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-white/40 bg-paper/90 px-3 py-1 text-xs font-medium text-forest shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-forest/80 dark:text-paper">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          {LOGO_SCREENING_BADGE}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-4 px-1 pb-1 pt-4">
        <div>
          <TitleTag className="line-clamp-2 text-lg font-semibold text-forest dark:text-paper">
            {product.name}
          </TitleTag>
          <p className="mt-1 text-xs text-ink/55 dark:text-paper/60">
            จำนวนขั้นต่ำ {product.minOrder} ชุด
          </p>
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-forest/10 pt-3 dark:border-white/10">
          <div>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-ink/40 dark:text-paper/45">
              เริ่มต้น
            </span>
            <span className="text-base font-bold text-forest dark:text-brass-soft">
              {price}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-forest px-3 py-2 text-xs font-medium text-paper transition-colors group-hover:bg-brass group-hover:text-forest dark:bg-paper dark:text-forest">
            ขอราคา
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
