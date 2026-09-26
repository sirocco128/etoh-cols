import Image from "next/image";
import Link from "next/link";
import { GradeIcon, LeafMark, PackIllustration, PillarIcon } from "@/components/site/EtohIllustrations";
import type { EtohEndUse } from "@/lib/etoh/brand";
import type { EtohGradeStory, EtohPackStory } from "@/lib/etoh/storefront";
import { getPublicContact } from "@/lib/public-contact";
import { site } from "@/lib/site";

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  tone = "default",
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "left" | "center";
  tone?: "default" | "inverse";
}) {
  const center = align === "center" ? "mx-auto text-center" : "";
  return (
    <div className={`max-w-3xl ${center}`}>
      {eyebrow ? (
        <p
          className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] ${
            tone === "inverse" ? "text-brass-soft" : "text-brass"
          }`}
        >
          <LeafMark className="h-3.5 w-3.5" />
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl ${
          tone === "inverse" ? "text-white" : "text-forest"
        }`}
      >
        {title}
      </h2>
      {lead ? (
        <p className={`mt-4 text-base leading-relaxed sm:text-lg ${tone === "inverse" ? "text-white/75" : "text-ink/70"}`}>
          {lead}
        </p>
      ) : null}
    </div>
  );
}

const ACCENTS = {
  blue: { bar: "bg-[#1553b7]", soft: "from-[#eaf2fc]" },
  leaf: { bar: "bg-[#1f9d55]", soft: "from-[#e8f7ee]" },
  orange: { bar: "bg-[#e8611a]", soft: "from-[#fff1e8]" },
  rose: { bar: "bg-[#e0457b]", soft: "from-[#fdecf2]" },
} as const;

export function ProductFamilyCard({ family }: { family: EtohGradeStory }) {
  const accent = ACCENTS[family.accent];
  return (
    <Link
      href={`/products/${family.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-forest/10 bg-paper shadow-[0_18px_40px_-28px_rgba(10,42,102,0.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_50px_-26px_rgba(10,42,102,0.5)] dark:border-white/10"
    >
      <div className={`${accent.bar} px-5 py-3 text-white`}>
        <p className="text-base font-bold">{family.title}</p>
        <p className="text-xs text-white/85">{family.titleTh}</p>
      </div>
      <div className={`flex justify-center bg-gradient-to-b ${accent.soft} to-transparent py-6 dark:from-white/5`}>
        <GradeIcon accent={family.accent} className="h-20 w-20 transition duration-300 group-hover:scale-105" />
      </div>
      <ul className="flex-1 space-y-2 px-5 pb-4 text-sm text-ink/80">
        {family.highlights.map((h) => (
          <li key={h} className="flex gap-2">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${accent.bar}`} />
            {h}
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-forest/10 px-5 py-3 dark:border-white/10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">เหมาะสำหรับ</p>
          <p className="text-sm font-semibold text-forest">{family.bestFor}</p>
        </div>
        <PillarIcon name="arrow" className="h-5 w-5 text-brass transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export function EndUseCard({ use, compact = false }: { use: EtohEndUse; compact?: boolean }) {
  return (
    <Link
      href={`/applications/${use.slug}`}
      className="group overflow-hidden rounded-2xl border border-forest/10 bg-paper transition duration-300 hover:-translate-y-0.5 hover:border-forest-light/40 hover:shadow-lift dark:border-white/10"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={`/images/etoh/use-${use.slug}.jpg`}
          alt={use.titleEn}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-forest text-xs font-bold text-white shadow">
          {use.no}
        </span>
      </div>
      <div className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-forest-light">{use.titleEn}</p>
        <p className="mt-0.5 font-semibold text-forest">{use.title}</p>
        {!compact ? <p className="mt-2 line-clamp-2 text-sm text-ink/65">{use.usage}</p> : null}
      </div>
    </Link>
  );
}

export function PackCard({ pack }: { pack: EtohPackStory }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-forest/10 bg-paper px-4 pb-5 pt-6 text-center dark:border-white/10">
      <div className="flex h-24 items-end">
        <PackIllustration code={pack.code} className={pack.code === "ISO25000" ? "h-20 w-28" : pack.code === "GAL5" ? "h-[4.5rem] w-[4.5rem]" : pack.code === "GAL20" ? "h-[5.5rem] w-[5.5rem]" : "h-24 w-24"} />
      </div>
      <p className="mt-4 font-semibold text-forest">{pack.title}</p>
      <p className="text-lg font-bold text-forest-light">{pack.volume}</p>
      <p className="text-xs text-ink/55">({pack.weight})</p>
      <p className="mt-3 text-xs leading-relaxed text-ink/70">{pack.forWho}</p>
    </div>
  );
}

export function CtaBand({
  title = "ต้องการเอทานอลเกรดไหน ปริมาณเท่าไร?",
  body = "แจ้งเกรด ปริมาณ และจังหวัดที่จัดส่ง ฝ่ายขายจะติดต่อกลับพร้อมใบเสนอราคาและ Specification",
}: {
  title?: string;
  body?: string;
}) {
  const contact = getPublicContact(site);
  return (
    <section className="px-page py-14 sm:py-20">
      <div className="relative mx-auto max-w-content overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0a2a66] via-[#123f91] to-[#1553b7] px-6 py-12 text-white shadow-[0_40px_80px_-40px_rgba(10,42,102,0.8)] sm:px-12">
        <svg viewBox="0 0 200 200" className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 opacity-15" aria-hidden>
          <path d="M170 20C90 20 40 64 40 124c0 14 3 27 8 40 8-40 36-72 80-88-32 24-56 52-68 88 72 4 110-48 110-144Z" fill="#ffffff" />
        </svg>
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">{title}</h2>
            <p className="mt-3 max-w-xl text-white/80">{body}</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/contact" className="inline-flex min-h-12 items-center rounded-full bg-brass px-7 text-sm font-semibold text-white shadow-lg transition hover:bg-brass-soft">
              ขอใบเสนอราคา
            </Link>
            {contact.showPhone ? (
              <a href={site.phoneHref} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 text-sm font-semibold backdrop-blur transition hover:bg-white/20">
                <PillarIcon name="phone" className="h-4 w-4" />
                {site.phoneDisplay}
              </a>
            ) : null}
            {contact.showLine ? (
              <a href={site.lineUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center rounded-full bg-[#06c755] px-6 text-sm font-semibold transition hover:opacity-90">
                LINE {site.lineId}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PageHero({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-forest/10 bg-gradient-to-b from-[#eaf2fc] to-[#f6f9fe] dark:from-[#0f1b34] dark:to-[#081022]">
      <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-[#1553b7]/10 blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-content px-page py-12 sm:py-16">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brass">
          <LeafMark className="h-3.5 w-3.5" />
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-forest sm:text-5xl">
          {title}
        </h1>
        {lead ? <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/70">{lead}</p> : null}
        {children}
      </div>
    </section>
  );
}
