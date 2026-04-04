"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ArrowRight, Plus, XCircle } from "lucide-react";

import { cancelOrder, updateOrderStatus, type OrderActionResult } from "@/actions/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatus } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

type OrderRow = {
  id: string;
  orderCode: string;
  customerName: string;
  totalPrice: string | number;
  status: keyof typeof OrderStatus;
  createdAt: Date;
  items: {
    id: string;
  }[];
};

const STATUS_TABS: Array<{
  label: string;
  value: "ALL" | keyof typeof OrderStatus;
}> = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: OrderStatus.PENDING },
  { label: "Confirmed", value: OrderStatus.CONFIRMED },
  { label: "Shipped", value: OrderStatus.SHIPPED },
  { label: "Delivered", value: OrderStatus.DELIVERED },
  { label: "Cancelled", value: OrderStatus.CANCELLED },
];

const NEXT_STATUS: Partial<Record<keyof typeof OrderStatus, keyof typeof OrderStatus>> = {
  PENDING: OrderStatus.CONFIRMED,
  CONFIRMED: OrderStatus.SHIPPED,
  SHIPPED: OrderStatus.DELIVERED,
};

function formatPrice(value: string | number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

function StatusBadge({ status }: { status: keyof typeof OrderStatus }) {
  const statusStyles: Record<keyof typeof OrderStatus, string> = {
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    CONFIRMED: "border-sky-200 bg-sky-50 text-sky-700",
    SHIPPED: "border-violet-200 bg-violet-50 text-violet-700",
    DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELLED: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <Badge
      variant="outline"
      className={cn("rounded-full border px-2.5 py-0.5", statusStyles[status])}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}

export function OrdersClient({
  orders,
  activeStatus,
  filters,
  totalCount,
}: {
  orders: OrderRow[];
  activeStatus: "ALL" | keyof typeof OrderStatus;
  filters: {
    dateFrom: string;
    dateTo: string;
  };
  totalCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dateFromValue, setDateFromValue] = useState(filters.dateFrom);
  const [dateToValue, setDateToValue] = useState(filters.dateTo);
  const [feedback, setFeedback] = useState<OrderActionResult | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateQueryParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (!value) {
        params.delete(key);
        continue;
      }

      params.set(key, value);
    }

    params.delete("page");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const buildStatusHref = (status: "ALL" | keyof typeof OrderStatus) => {
    const params = new URLSearchParams(searchParams.toString());

    if (status === "ALL") {
      params.delete("status");
    } else {
      params.set("status", status);
    }

    params.delete("page");

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const handleAdvance = (id: string, status: keyof typeof OrderStatus) => {
    const nextStatus = NEXT_STATUS[status];

    if (!nextStatus) {
      return;
    }

    setFeedback(null);
    setPendingOrderId(id);

    startTransition(async () => {
      const result = await updateOrderStatus(id, nextStatus);

      if ("error" in result) {
        setFeedback(result);
        setPendingOrderId(null);
        return;
      }

      setPendingOrderId(null);
      router.refresh();
    });
  };

  const handleCancel = (id: string) => {
    setFeedback(null);
    setPendingOrderId(id);

    startTransition(async () => {
      const result = await cancelOrder(id);

      if ("error" in result) {
        setFeedback(result);
        setPendingOrderId(null);
        return;
      }

      setPendingOrderId(null);
      router.refresh();
    });
  };
  const hasActiveDateFilters = Boolean(filters.dateFrom || filters.dateTo);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Orders
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Track order progress, confirm fulfillment, and manage cancellations.
          </p>
        </div>

        <Button asChild className="gap-2 self-start">
          <Link href="/dashboard/orders/new">
            <Plus className="size-4" />
            Create Order
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const isActive = activeStatus === tab.value;

          return (
            <Button
              key={tab.value}
              asChild
              variant={isActive ? "default" : "outline"}
              size="sm"
            >
              <Link href={buildStatusHref(tab.value)}>{tab.label}</Link>
            </Button>
          );
        })}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <form
          className="flex flex-col gap-3 lg:flex-row lg:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            updateQueryParams({
              dateFrom: dateFromValue || null,
              dateTo: dateToValue || null,
            });
          }}
        >
          <div className="space-y-2 lg:w-56">
            <label
              htmlFor="orders-date-from"
              className="text-sm font-medium text-zinc-950"
            >
              From
            </label>
            <input
              id="orders-date-from"
              type="date"
              value={dateFromValue}
              onChange={(event) => setDateFromValue(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div className="space-y-2 lg:w-56">
            <label
              htmlFor="orders-date-to"
              className="text-sm font-medium text-zinc-950"
            >
              To
            </label>
            <input
              id="orders-date-to"
              type="date"
              value={dateToValue}
              onChange={(event) => setDateToValue(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="outline">
              Apply
            </Button>
            {hasActiveDateFilters ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDateFromValue("");
                  setDateToValue("");
                  updateQueryParams({
                    dateFrom: null,
                    dateTo: null,
                  });
                }}
              >
                Clear Dates
              </Button>
            ) : null}
          </div>
        </form>

        <p className="mt-3 text-sm text-zinc-500">
          Showing {orders.length} of {totalCount} orders
        </p>
      </div>

      {feedback && "error" in feedback ? (
        <div
          className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {feedback.error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4">Order Code</TableHead>
              <TableHead className="px-4">Customer</TableHead>
              <TableHead className="px-4">Items Count</TableHead>
              <TableHead className="px-4">Total</TableHead>
              <TableHead className="px-4">Status</TableHead>
              <TableHead className="px-4">Date</TableHead>
              <TableHead className="px-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-zinc-500"
                >
                  No orders match this filter yet.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="px-4 font-medium text-zinc-950">
                    {order.orderCode}
                  </TableCell>
                  <TableCell className="px-4 text-zinc-600">
                    {order.customerName}
                  </TableCell>
                  <TableCell className="px-4 text-zinc-600">
                    {order.items.length}
                  </TableCell>
                  <TableCell className="px-4 text-zinc-600">
                    {formatPrice(order.totalPrice)}
                  </TableCell>
                  <TableCell className="px-4">
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="px-4 text-zinc-600">
                    {format(new Date(order.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex justify-end gap-2">
                      {NEXT_STATUS[order.status] ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={isPending || pendingOrderId === order.id}
                          onClick={() => handleAdvance(order.id, order.status)}
                        >
                          <ArrowRight className="size-4" />
                          {NEXT_STATUS[order.status]}
                        </Button>
                      ) : null}

                      {order.status !== OrderStatus.CANCELLED &&
                      order.status !== OrderStatus.DELIVERED ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={isPending || pendingOrderId === order.id}
                          onClick={() => handleCancel(order.id)}
                        >
                          <XCircle className="size-4" />
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
