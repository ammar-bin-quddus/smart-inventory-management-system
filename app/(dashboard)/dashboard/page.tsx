import Link from "next/link";
import {
  eachDayOfInterval,
  endOfDay,
  format,
  startOfDay,
  subDays,
} from "date-fns";

import { LocalDateTime } from "@/components/local-date-time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";

import { OrdersBarChart } from "./_components/orders-bar-chart";

type DashboardData = {
  todayOrders: number;
  pendingOrders: number;
  lowStockCount: number;
  todayRevenue: number;
  productSummary: Array<{
    id: string;
    name: string;
    stock: number;
    minStockThreshold: number;
    category: {
      name: string;
    };
  }>;
  dailyOrderCounts: Array<{
    day: string;
    orders: number;
  }>;
  recentActivity: Array<{
    id: string;
    message: string;
    createdAt: Date;
    user: {
      name: string;
    };
  }>;
  hasDataError: boolean;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function StockIndicator({
  stock,
  minStockThreshold,
}: {
  stock: number;
  minStockThreshold: number;
}) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-red-700">
        <span className="size-2.5 rounded-full bg-red-500" />
        Out of Stock
      </span>
    );
  }

  if (stock < minStockThreshold) {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-700">
        <span className="size-2.5 rounded-full bg-amber-500" />
        Low
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
      <span className="size-2.5 rounded-full bg-emerald-500" />
      OK
    </span>
  );
}

export default async function DashboardPage() {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(todayStart);
  const last7DaysStart = startOfDay(subDays(todayStart, 6));
  let dashboardData: DashboardData;

  try {
    const [
      todayOrders,
      pendingOrders,
      stockThresholdSummary,
      todayRevenueAggregate,
      productSummary,
      last7DayOrders,
      recentActivity,
    ] = await Promise.all([
      prisma.order.count({
        where: {
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),
      prisma.order.count({
        where: {
          status: "PENDING",
        },
      }),
      prisma.product.findMany({
        select: {
          stock: true,
          minStockThreshold: true,
        },
      }),
      prisma.order.aggregate({
        where: {
          status: {
            in: ["SHIPPED", "DELIVERED"],
          },
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        _sum: {
          totalPrice: true,
        },
      }),
      prisma.product.findMany({
        include: {
          category: true,
        },
        orderBy: [{ stock: "asc" }, { name: "asc" }],
      }),
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: last7DaysStart,
            lte: todayEnd,
          },
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.activityLog.findMany({
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
      }),
    ]);

    const dailyOrderCounts = eachDayOfInterval({
      start: last7DaysStart,
      end: todayStart,
    }).map((date) => {
      const dayKey = format(date, "yyyy-MM-dd");
      const orders = last7DayOrders.filter(
        (order) => format(order.createdAt, "yyyy-MM-dd") === dayKey,
      ).length;

      return {
        day: format(date, "EEE"),
        orders,
      };
    });

    dashboardData = {
      todayOrders,
      pendingOrders,
      lowStockCount: stockThresholdSummary.filter(
        (product) => product.stock < product.minStockThreshold,
      ).length,
      todayRevenue: Number(todayRevenueAggregate._sum.totalPrice ?? 0),
      productSummary,
      dailyOrderCounts,
      recentActivity,
      hasDataError: false,
    };
  } catch (error) {
    console.error("Failed to load dashboard data", error);

    dashboardData = {
      todayOrders: 0,
      pendingOrders: 0,
      lowStockCount: 0,
      todayRevenue: 0,
      productSummary: [],
      dailyOrderCounts: eachDayOfInterval({
        start: last7DaysStart,
        end: todayStart,
      }).map((date) => ({
        day: format(date, "EEE"),
        orders: 0,
      })),
      recentActivity: [],
      hasDataError: true,
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Inventory performance, order throughput, and stock risk in one view.
        </p>
      </div>

      {dashboardData.hasDataError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Some dashboard data is temporarily unavailable. Please refresh in a moment.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500">Total Orders Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-zinc-950">
              {dashboardData.todayOrders}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500">Pending Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-zinc-950">
              {dashboardData.pendingOrders}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-zinc-950">
              {dashboardData.lowStockCount}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500">Revenue Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-zinc-950">
              {formatCurrency(dashboardData.todayRevenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-zinc-200 bg-white">
          <CardHeader>
            <CardTitle>Product Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4">Product</TableHead>
                  <TableHead className="px-4">Category</TableHead>
                  <TableHead className="px-4">Stock</TableHead>
                  <TableHead className="px-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardData.productSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-4 py-10 text-center text-sm text-zinc-500">
                      No products available yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  dashboardData.productSummary.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="px-4 font-medium text-zinc-950">{product.name}</TableCell>
                      <TableCell className="px-4 text-zinc-600">{product.category.name}</TableCell>
                      <TableCell className="px-4 text-zinc-600">
                        <span className="font-medium text-zinc-950">{product.stock}</span>
                        <span className="ml-2 text-xs text-zinc-500">min {product.minStockThreshold}</span>
                      </TableCell>
                      <TableCell className="px-4">
                        <StockIndicator
                          stock={product.stock}
                          minStockThreshold={product.minStockThreshold}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white">
          <CardHeader>
            <CardTitle>Orders Per Day</CardTitle>
          </CardHeader>
          <CardContent>
            <OrdersBarChart data={dashboardData.dailyOrderCounts} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Latest Activity</CardTitle>
          <Link
            href="/dashboard/activity-log"
            className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-950 hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent className="space-y-0">
          {dashboardData.recentActivity.length === 0 ? (
            <div className="py-6 text-sm text-zinc-500">No recent activity yet.</div>
          ) : (
            <div className="divide-y divide-zinc-200">
              {dashboardData.recentActivity.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-1 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-950">{log.message}</p>
                    <p className="mt-1 text-xs text-zinc-500">{log.user.name}</p>
                  </div>
                  <LocalDateTime
                    value={log.createdAt}
                    variant="activity-short"
                    className="text-xs text-zinc-500"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
