import { OpsLoginForm } from "@/components/OpsLoginForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Promise<{
  error?: string;
}>;

export default async function OpsLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-forest">เข้าสู่ระบบปฏิบัติการ</h1>
      <p className="mt-2 text-sm text-ink/70">
        จัดการลูกค้าและใบเสนอราคา — เข้าได้เฉพาะพนักงาน
      </p>
      <OpsLoginForm googleError={params.error} />
    </div>
  );
}
