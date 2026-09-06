"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PRODUCT_IMAGE_FALLBACK } from "@/lib/product-media";

type CatalogImageProps = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fallbackSrc?: string;
};

export function CatalogImage({
  src,
  alt,
  sizes,
  priority = false,
  className,
  fallbackSrc = PRODUCT_IMAGE_FALLBACK,
}: CatalogImageProps) {
  const [failed, setFailed] = useState(false);
  const resolved = failed || !src ? fallbackSrc : src;
  const localApi = resolved.startsWith("/api/");

  return (
    <Image
      key={resolved}
      src={resolved}
      alt={alt}
      fill
      priority={priority}
      unoptimized={localApi}
      sizes={sizes}
      className={cn(
        "bg-forest-mist object-cover transition-transform duration-500 group-hover:scale-105",
        className,
      )}
      onError={() => {
        if (resolved !== fallbackSrc) setFailed(true);
      }}
    />
  );
}
