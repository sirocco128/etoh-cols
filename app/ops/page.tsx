import { redirect } from "next/navigation";
import {
  isOpsAuthConfigured,
  requireOpsSession,
} from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

export default async function OpsIndexPage() {
  if (!isOpsAuthConfigured()) {
    redirect("/ops/login");
  }
  if (await requireOpsSession()) {
    redirect("/ops/quotes");
  }
  redirect("/ops/login");
}
