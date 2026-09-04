import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { getArticles } from "@/lib/strapi";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "บทความ",
  description:
    "บทความแนะนำการเลือกสินค้าพรีเมียมและ Gift Set สำหรับองค์กร",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const articles = await getArticles();

  return (
    <div className="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-16">
      <Breadcrumbs items={[{ label: "บทความ" }]} />
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-forest sm:text-4xl">บทความ</h1>
        <p className="mt-3 text-ink/75">
          แนวทางเลือกของขวัญองค์กร วัสดุ และการวางแผนแคมเปญ Gift Set
        </p>
      </div>

      {articles.length === 0 ? (
        <EmptyState
          title="ยังไม่มีบทความ"
          description="บทความจะอัปเดตเร็ว ๆ นี้ หากต้องการคำแนะนำเฉพาะองค์กร ส่งคำขอใบเสนอราคาได้ทันที"
        />
      ) : (
        <ul className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <li key={article.slug}>
              <Link href={`/blog/${article.slug}`} className="group block">
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-forest-mist">
                  <Image
                    src={article.cover || "/images/article-cover.jpg"}
                    alt={article.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width:768px) 100vw, 33vw"
                  />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-forest group-hover:text-brass">
                  {article.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm text-ink/70">{article.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
