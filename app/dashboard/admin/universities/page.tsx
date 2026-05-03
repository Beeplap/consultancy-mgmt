import { redirect } from "next/navigation";
import { universitiesAdminRoutes } from "@/lib/admin-universities-paths";

/** Legacy URL: `/dashboard/admin/universities` → management hub. */
export default function UniversitiesIndexPage() {
  redirect(universitiesAdminRoutes.manage);
}
