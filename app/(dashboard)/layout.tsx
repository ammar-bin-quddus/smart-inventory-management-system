import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRightLeft, LogOut, ShieldCheck } from "lucide-react";

import { logoutAction } from "@/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";

import { DashboardNav } from "./_components/dashboard-nav";
import { MobileNav } from "./_components/mobile-nav";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireSession("/login");

  return (
    <div className="h-screen overflow-hidden bg-zinc-100 text-zinc-950">
      <div className="grid h-full lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden h-screen border-r border-zinc-200 bg-white lg:sticky lg:top-0 lg:flex lg:flex-col">
          <div className="border-b border-zinc-200 px-6 py-6">
            <Link href="/dashboard" className="block space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                  <ArrowRightLeft className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">
                    Inventory OS
                  </p>
                  <p className="text-xs text-zinc-500">
                    Operations control center
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="rounded-full px-2.5">
                Signed in as {session.role}
              </Badge>
            </Link>
          </div>

          <div className="flex-1 px-4 py-5">
            <DashboardNav />
          </div>

          <div className="border-t border-zinc-200 px-6 py-5 text-sm text-zinc-500">
            Keep stock, orders, and restocks moving from one place.
          </div>
        </aside>

        <div className="flex h-screen min-h-0 flex-col overflow-hidden">
          <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur">
            <div className="flex h-18 items-center justify-between gap-4 px-3 sm:px-4">
              <div className="flex items-center gap-3">
                <MobileNav />
                <div>
                  <p className="text-sm font-semibold tracking-tight">
                    Dashboard
                  </p>
                  <p className="text-xs text-zinc-500">
                    Overview of your inventory workspace
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 sm:flex">
                  <div className="flex size-9 items-center justify-center rounded-full bg-zinc-950 text-white">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-950">
                      {session.email}
                    </p>
                    <p className="text-xs text-zinc-500">{session.role}</p>
                  </div>
                </div>

                <form action={logoutAction}>
                  <Button type="submit" variant="outline" className="gap-2">
                    <LogOut className="size-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </form>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-3 sm:p-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
