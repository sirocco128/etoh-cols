import { site } from "@/lib/site";

/** Etoh Cols wordmark: navy "Etoh", process-blue "Cols", leaf accent (from the company poster). */
export function BrandLogo({ tone = "default" }: { tone?: "default" | "inverse" }) {
  const etoh = tone === "inverse" ? "text-white" : "text-forest dark:text-white";
  const cols = tone === "inverse" ? "text-[#8fb8ff]" : "text-forest-light dark:text-[#8fb8ff]";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative inline-flex items-baseline font-display text-[1.55rem] font-extrabold leading-none tracking-[-0.04em]">
        <span className={etoh}>Etoh</span>
        <span className={`ml-1.5 ${cols}`}>Cols</span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="absolute -right-3 -top-2.5 h-4 w-4 rotate-12"
        >
          <path d="M20 3C10 3 4 8.5 4 16c0 1.8.4 3.4 1 5 1-5 4.5-9 10-11-4 3-7 6.5-8.5 11 9 .5 13.5-6 13.5-18Z" className="fill-leaf" />
        </svg>
      </span>
      <span className="sr-only">{site.name}</span>
    </span>
  );
}
