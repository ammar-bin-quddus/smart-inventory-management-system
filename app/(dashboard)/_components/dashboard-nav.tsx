"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  ListOrdered,
  PackageSearch,
  ScrollText,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/products",
    label: "Products",
    icon: Boxes,
  },
  {
    href: "/dashboard/categories",
    label: "Categories",
    icon: PackageSearch,
  },
  {
    href: "/dashboard/orders",
    label: "Orders",
    icon: ListOrdered,
  },
  {
    href: "/dashboard/restock-queue",
    label: "Restock Queue",
    icon: ClipboardList,
  },
  {
    href: "/dashboard/activity-log",
    label: "Activity Log",
    icon: ScrollText,
  },
];

export function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-zinc-950 text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
            )}
          >
            <item.icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
