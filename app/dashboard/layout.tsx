import { Sidebar } from "@/components/sidebar";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar user={user} />
      <main className="min-w-0 flex-1 px-8 py-7">{children}</main>
    </div>
  );
}
