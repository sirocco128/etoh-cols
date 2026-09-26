import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { CtaBand, PageHero } from "@/components/site/EtohBlocks";
import { getArticles } from "@/lib/strapi";
import { metadataForPath } from "@/lib/page-seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPath("/blog");
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const all = await getArticles();
  const categories = Array.from(
    new Map(all.filter((a) => a.category).map((a) => [a.category!, a.categoryName || a.category!])).entries(),
  );
  const category = categories.some(([c]) => c === sp.category) ? sp.category : "";
  const articles = all.filter((a) => (category ? a.category === category : true));

  return (
    <>
      <PageHero eyebrow="Knowledge" title="บทความ" lead="ความรู้เรื่องเอทานอล การเลือกเกรด เอกสารคุณภาพ และการจัดเก็บ–ขนส่งอย่างปลอดภัย" />
      <div className="mx-auto max-w-content px-page py-12">
        {categories.length > 1 ? (
          <nav className="flex flex-wrap gap-2" aria-label="หมวดบทความ">
            <Link
              href="/blog"
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${!category ? "bg-forest text-white" : "border border-forest/20 text-forest"}`}
            >
              ทั้งหมด
            </Link>
            {categories.map(([slug, label]) => (
              <Link
                key={slug}
                href={`/blog?category=${slug}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${category === slug ? "bg-forest text-white" : "border border-forest/20 text-forest"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        ) : null}

        {articles.length === 0 ? (
          <EmptyState title="ยังไม่มีบทความ" description="บทความจะอัปเดตเร็ว ๆ นี้ หากมีคำถามเรื่องเกรดหรือการใช้งาน ติดต่อฝ่ายขายได้ทันที" />
        ) : (
          <ul className="mt-8 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <li key={article.slug}>
                <Link
                  href={`/blog/${article.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-forest/10 bg-white transition hover:-translate-y-1 hover:shadow-lift dark:bg-[#0f1b34]"
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <Image
                      src={article.cover || "/images/etoh/truck.jpg"}
                      alt={article.title}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width:768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    {article.categoryName ? (
                      <p className="text-xs font-semibold uppercase tracking-wide text-brass">{article.categoryName}</p>
                    ) : null}
                    <h2 className="mt-1.5 text-lg font-bold leading-snug text-forest group-hover:text-forest-light">{article.title}</h2>
                    <p className="mt-2 line-clamp-3 text-sm text-ink/70">{article.excerpt}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <CtaBand />
    </>
  );
}
