import { getOrdersPage } from "@/actions/orders";
import { Pagination } from "@/components/pagination";
import { OrderStatus } from "@/lib/generated/prisma/enums";

import { OrdersClient } from "./_components/orders-client";

type OrdersPageProps = {
  searchParams?: Promise<{
    status?: string | string[];
    dateFrom?: string | string[];
    dateTo?: string | string[];
    page?: string | string[];
  }>;
};

function getSearchParamValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getPage(value: string | undefined) {
  const parsedValue = Number(value ?? "1");
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
}

function parseDateParam(value: string | undefined, endOfRange = false) {
  if (!value) {
    return undefined;
  }

  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return undefined;
  }

  if (endOfRange) {
    parsedDate.setHours(23, 59, 59, 999);
  }

  return parsedDate;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedStatus = getSearchParamValue(resolvedSearchParams?.status);
  const activeStatus =
    requestedStatus &&
    Object.values(OrderStatus).includes(requestedStatus as keyof typeof OrderStatus)
      ? (requestedStatus as keyof typeof OrderStatus)
      : "ALL";
  const dateFrom = getSearchParamValue(resolvedSearchParams?.dateFrom) ?? "";
  const dateTo = getSearchParamValue(resolvedSearchParams?.dateTo) ?? "";
  const page = getPage(getSearchParamValue(resolvedSearchParams?.page));

  const orderResult = await getOrdersPage({
    ...(activeStatus === "ALL" ? {} : { status: activeStatus }),
    ...(dateFrom ? { dateFrom: parseDateParam(dateFrom) } : {}),
    ...(dateTo ? { dateTo: parseDateParam(dateTo, true) } : {}),
    page,
  });

  return (
    <div className="space-y-4">
      <OrdersClient
        key={`${activeStatus}:${dateFrom}:${dateTo}:${orderResult.currentPage}`}
        activeStatus={activeStatus}
        filters={{
          dateFrom,
          dateTo,
        }}
        totalCount={orderResult.totalCount}
        orders={orderResult.items.map((order) => ({
          ...order,
          totalPrice: order.totalPrice.toString(),
        }))}
      />

      <Pagination
        pathname="/dashboard/orders"
        searchParams={{
          ...(activeStatus === "ALL" ? {} : { status: activeStatus }),
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {}),
        }}
        currentPage={orderResult.currentPage}
        totalPages={orderResult.totalPages}
      />
    </div>
  );
}
