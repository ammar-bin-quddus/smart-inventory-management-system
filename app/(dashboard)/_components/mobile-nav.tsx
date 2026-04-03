"use client";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { DashboardNav } from "./dashboard-nav";

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="lg:hidden"
        >
          <Menu className="size-4" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[88%] border-zinc-200 bg-white p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-b border-zinc-200 px-5 py-5 text-left">
          <SheetTitle>Inventory OS</SheetTitle>
          <SheetDescription>
            Navigate inventory, orders, and operational activity.
          </SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <DashboardNav />
        </div>
      </SheetContent>
    </Sheet>
  );
}
