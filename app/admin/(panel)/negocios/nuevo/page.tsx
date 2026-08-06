import Link from "next/link";

import { listSectors } from "@/lib/db/businesses";
import { admin } from "@/lib/i18n/admin";
import { createBusinessAction } from "../actions";
import { BusinessForm } from "../BusinessForm";

export const dynamic = "force-dynamic";

export default async function NewBusinessPage() {
  const sectors = await listSectors();

  return (
    <section>
      <Link href="/admin/negocios" style={{ color: "#2563eb", fontSize: "0.875rem" }}>
        ← {admin.back}
      </Link>
      <h1 style={{ fontSize: "1.25rem", margin: "0.75rem 0 1.25rem" }}>{admin.newBusiness}</h1>
      <BusinessForm action={createBusinessAction} sectors={sectors} />
    </section>
  );
}
