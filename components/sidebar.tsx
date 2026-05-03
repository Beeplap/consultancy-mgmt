import Link from "next/link";
import { GraduationCap, LayoutDashboard, LogOut, School, UserPlus } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/database.types";

export function Sidebar({ user }: { user: { email: string; role: UserRole } }) {
  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/students/new", label: "Add Student", icon: UserPlus },
    ...(user.role === "admin" ? [{ href: "/dashboard/admin/universities", label: "Universities", icon: School }] : []),
  ];

  return (
    <aside className="flex min-h-screen w-72 shrink-0 flex-col border-r border-zinc-200 bg-white px-5 py-6">
      <Link href="/dashboard" className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-md bg-black text-white">
          <GraduationCap size={20} />
        </span>
        <span>
          <span className="block text-sm font-semibold uppercase tracking-wide">UK Counselling</span>
          <span className="text-xs text-zinc-500">Education CRM</span>
        </span>
      </Link>

      <nav className="mt-8 grid gap-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-black">
              <Icon size={17} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto grid gap-4 border-t border-zinc-200 pt-5">
        <div>
          <p className="text-sm font-medium">{user.role === "admin" ? "Admin" : "Counsellor"}</p>
          <p className="text-xs text-zinc-500">{user.email}</p>
          <p className="mt-1 text-xs font-medium text-zinc-700">{titleCase(user.role)}</p>
        </div>
        <form action={logoutAction}>
          <Button variant="secondary" className="w-full">
            <LogOut size={16} />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
