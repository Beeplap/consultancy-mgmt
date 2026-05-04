"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, GraduationCap, LayoutDashboard, ListChecks, LogOut, PlusCircle, School } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/database.types";

type NavLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  subLabel?: string;
};

export function Sidebar({ user }: { user: { email: string; role: UserRole } }) {
  const [collapsed, setCollapsed] = useState(false);
  const links: NavLink[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/course-recommendations", label: "Course Match", icon: ListChecks },
    ...(user.role === "admin"
      ? ([
          {
            href: "/dashboard/admin/universities/add",
            label: "Add university & course",
            icon: PlusCircle,
          },
          {
            href: "/dashboard/admin/universities/manage",
            label: "Universities Management",
            icon: School,
          },
        ] satisfies NavLink[])
      : []),
  ];

  return (
    <aside
      className={`flex min-h-screen shrink-0 flex-col border-r border-zinc-200 bg-white py-6 transition-[width,padding] duration-200 ${
        collapsed ? "w-20 px-3" : "w-72 px-5"
      }`}
    >
      <div className={`mb-2 flex ${collapsed ? "flex-col items-center gap-2" : "items-center justify-between gap-2"}`}>
        <Link href="/dashboard" className={`flex min-w-0 items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <span className="flex size-10 items-center justify-center rounded-md bg-black text-white">
            <GraduationCap size={20} />
          </span>
          {!collapsed ? (
            <span>
              <span className="block text-sm font-semibold uppercase tracking-wide">UK Counselling</span>
              <span className="text-xs text-zinc-500">Education CRM</span>
            </span>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="mt-6 grid gap-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex rounded-md py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-black ${
                collapsed ? "justify-center px-2" : "items-start gap-3 px-3"
              }`}
              title={collapsed ? link.label : undefined}
            >
              <Icon size={17} className={`shrink-0 ${collapsed ? "" : "mt-0.5"}`} aria-hidden />
              {!collapsed ? (
                <span className="min-w-0 leading-snug">
                  <span className="block">{link.label}</span>
                  {link.subLabel ? (
                    <span className="mt-0.5 block text-xs font-normal text-zinc-500">{link.subLabel}</span>
                  ) : null}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto grid gap-4 border-t border-zinc-200 pt-5">
        {!collapsed ? (
          <div>
            <p className="text-sm font-medium">{user.role === "admin" ? "Admin" : "Counsellor"}</p>
            <p className="text-xs text-zinc-500">{user.email}</p>
            <p className="mt-1 text-xs font-medium text-zinc-700">{titleCase(user.role)}</p>
          </div>
        ) : (
          <div className="text-center text-xs font-medium text-zinc-700" title={user.email}>
            {titleCase(user.role)}
          </div>
        )}
        <form action={logoutAction}>
          <Button variant="secondary" className="w-full justify-center" title={collapsed ? "Sign out" : undefined}>
            <LogOut size={16} />
            {!collapsed ? "Sign out" : null}
          </Button>
        </form>
      </div>
    </aside>
  );
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
