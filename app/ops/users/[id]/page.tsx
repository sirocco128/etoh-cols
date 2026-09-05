import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OpsStaffForm } from "@/components/OpsStaffForm";
import { actorMay, isOpsAuthConfigured, requireOpsActor } from "@/lib/ops-auth";
import { getOpsStaffById } from "@/lib/ops-staff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OpsUserEditPage({ params }: PageProps) {
  const actor =
    isOpsAuthConfigured() ? await requireOpsActor("users.write") : null;
  if (!actor) redirect("/ops/login");
  if (!actorMay(actor, "users.write")) redirect("/ops/users");

  const { id: raw } = await params;
  const id = Number(raw);
  const staff = getOpsStaffById(id);
  if (!staff) notFound();

  return (
    <div>
      <p className="text-sm">
        <Link href="/ops/users" className="text-forest underline-offset-2 hover:underline">
          ← ผู้ใช้และพนักงาน
        </Link>
      </p>
      <h1 className="mt-3 text-2xl font-bold text-forest">แก้สิทธิ์ {staff.name}</h1>
      <p className="mt-1 text-sm text-ink/70">{staff.email}</p>
      <OpsStaffForm
        mode="edit"
        staff={{
          id: staff.id,
          email: staff.email,
          name: staff.name,
          role: staff.role,
          department: staff.department ?? "",
          extraGrants: staff.extraGrants,
          extraDenies: staff.extraDenies,
          active: staff.active,
        }}
      />
    </div>
  );
}
