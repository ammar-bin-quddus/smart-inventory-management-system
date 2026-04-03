import Link from "next/link";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

type ActivityLogPageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

export default async function ActivityLogPage({
  searchParams,
}: ActivityLogPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedPage = Number(resolvedSearchParams?.page ?? "1");
  const page = Number.isFinite(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1;
  const skip = (page - 1) * PAGE_SIZE;

  const [totalLogs, logs] = await Promise.all([
    prisma.activityLog.count(),
    prisma.activityLog.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Activity Log
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Latest system actions across categories, products, orders, and restocking.
          </p>
        </div>
        <p className="text-sm text-zinc-500">
          Showing {logs.length} of {totalLogs} logs
        </p>
      </div>

      <Card className="border-zinc-200 bg-white">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {logs.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-500">
              No activity recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-200">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-1 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-950">
                      {log.message}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {log.user.name} · {log.user.email}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {format(new Date(log.createdAt), "MMM d, yyyy · h:mm a")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button asChild variant="outline" disabled={!hasPreviousPage}>
          <Link href={`/dashboard/activity-log?page=${page - 1}`}>Previous</Link>
        </Button>

        <p className="text-sm text-zinc-500">
          Page {page} of {totalPages}
        </p>

        <Button asChild variant="outline" disabled={!hasNextPage}>
          <Link href={`/dashboard/activity-log?page=${page + 1}`}>Next</Link>
        </Button>
      </div>
    </div>
  );
}
