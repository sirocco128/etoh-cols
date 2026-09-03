import { PRICE_DISCLAIMER_FULL, PRICE_DISCLAIMER_SHORT } from "@/lib/ux-copy";

type PriceDisclaimerProps = {
  variant?: "short" | "full";
  className?: string;
};

export function PriceDisclaimer({
  variant = "short",
  className = "",
}: PriceDisclaimerProps) {
  const text = variant === "full" ? PRICE_DISCLAIMER_FULL : PRICE_DISCLAIMER_SHORT;
  return (
    <p
      role="note"
      className={`text-xs leading-relaxed text-ink/60 ${className}`.trim()}
    >
      {text}
    </p>
  );
}
