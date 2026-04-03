import { getCategories } from "@/actions/categories";
import { getProductsPage } from "@/actions/products";
import { Pagination } from "@/components/pagination";
import { ProductStatus } from "@/lib/generated/prisma/enums";
import { canDeleteProducts } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

import { ProductsClient } from "./_components/products-client";

type ProductsPageProps = {
  searchParams?: Promise<{
    search?: string | string[];
    categoryId?: string | string[];
    status?: string | string[];
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

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const session = await requireSession("/login");
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const search = getSearchParamValue(resolvedSearchParams?.search)?.trim() ?? "";
  const categoryId =
    getSearchParamValue(resolvedSearchParams?.categoryId)?.trim() ?? "";
  const requestedStatus = getSearchParamValue(resolvedSearchParams?.status);
  const status =
    requestedStatus &&
    Object.values(ProductStatus).includes(
      requestedStatus as keyof typeof ProductStatus,
    )
      ? (requestedStatus as keyof typeof ProductStatus)
      : undefined;
  const page = getPage(getSearchParamValue(resolvedSearchParams?.page));

  const [productResult, categories] = await Promise.all([
    getProductsPage({
      ...(search ? { search } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(status ? { status } : {}),
      page,
    }),
    getCategories(),
  ]);

  return (
    <div className="space-y-4">
      <ProductsClient
        key={`${search}:${categoryId}:${status ?? "ALL"}:${productResult.currentPage}`}
        products={productResult.items.map((product) => ({
          ...product,
          price: product.price.toString(),
        }))}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
        filters={{
          search,
          categoryId,
          status: status ?? "ALL",
        }}
        totalCount={productResult.totalCount}
        canDelete={canDeleteProducts(session.role)}
      />

      <Pagination
        pathname="/dashboard/products"
        searchParams={{
          ...(search ? { search } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(status ? { status } : {}),
        }}
        currentPage={productResult.currentPage}
        totalPages={productResult.totalPages}
      />
    </div>
  );
}
