"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logActivity } from "@/lib/activity";
import { ProductStatus } from "@/lib/generated/prisma/enums";
import { canDeleteProducts } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRestockPriority, shouldBeInRestockQueue } from "@/lib/restock";
import { requireSession } from "@/lib/session";

const productSchema = z.object({
  name: z.string().trim().min(2, "Product name must be at least 2 characters long."),
  categoryId: z.string().trim().min(1, "Category is required."),
  price: z.coerce.number().positive("Price must be greater than 0."),
  stock: z.coerce.number().int("Stock must be a whole number.").min(0, "Stock cannot be negative."),
  minStockThreshold: z.coerce
    .number()
    .int("Minimum stock threshold must be a whole number.")
    .min(0, "Minimum stock threshold cannot be negative."),
});

const productIdSchema = z.string().trim().min(1, "Product id is required.");

const productFiltersSchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  status: z.enum([ProductStatus.ACTIVE, ProductStatus.OUT_OF_STOCK]).optional(),
});

const paginatedProductFiltersSchema = productFiltersSchema.extend({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductFilters = z.infer<typeof productFiltersSchema>;
export type PaginatedProductFilters = z.infer<
  typeof paginatedProductFiltersSchema
>;

export type ProductActionResult =
  | {
      error: string;
    }
  | {
      success: true;
    };

function getProductStatus(stock: number) {
  return stock <= 0 ? ProductStatus.OUT_OF_STOCK : ProductStatus.ACTIVE;
}

async function syncRestockQueue(productId: string, stock: number, minStockThreshold: number) {
  if (shouldBeInRestockQueue(stock, minStockThreshold)) {
    await prisma.restockQueue.upsert({
      where: {
        productId,
      },
      update: {
        priority: getRestockPriority(stock, minStockThreshold),
      },
      create: {
        productId,
        priority: getRestockPriority(stock, minStockThreshold),
      },
    });

    return;
  }

  await prisma.restockQueue.deleteMany({
    where: {
      productId,
    },
  });
}

async function ensureCategoryExists(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: {
      id: categoryId,
    },
  });

  return category;
}

function revalidateProductPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/restock-queue");
}

function buildProductWhere(filters: ProductFilters) {
  const { search, categoryId, status } = filters;

  return {
    ...(search
      ? {
          name: {
            contains: search,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(status ? { status } : {}),
  };
}

export async function createProduct(data: ProductInput): Promise<ProductActionResult> {
  const session = await requireSession("/login");
  const validatedData = productSchema.safeParse(data);

  if (!validatedData.success) {
    return {
      error: validatedData.error.issues[0]?.message ?? "Invalid product data.",
    };
  }

  const { name, categoryId, price, stock, minStockThreshold } = validatedData.data;
  const category = await ensureCategoryExists(categoryId);

  if (!category) {
    return {
      error: "Selected category was not found.",
    };
  }

  const product = await prisma.product.create({
    data: {
      name,
      categoryId,
      price,
      stock,
      minStockThreshold,
      status: getProductStatus(stock),
    },
  });

  await syncRestockQueue(product.id, stock, minStockThreshold);

  await logActivity(
    `Created product "${product.name}" in category "${category.name}"`,
    session.userId,
  );

  revalidateProductPaths();

  return { success: true };
}

export async function updateProduct(
  id: string,
  data: ProductInput,
): Promise<ProductActionResult> {
  const session = await requireSession("/login");
  const validatedId = productIdSchema.safeParse(id);
  const validatedData = productSchema.safeParse(data);

  if (!validatedId.success) {
    return {
      error: validatedId.error.issues[0]?.message ?? "Invalid product id.",
    };
  }

  if (!validatedData.success) {
    return {
      error: validatedData.error.issues[0]?.message ?? "Invalid product data.",
    };
  }

  const existingProduct = await prisma.product.findUnique({
    where: {
      id: validatedId.data,
    },
  });

  if (!existingProduct) {
    return {
      error: "Product not found.",
    };
  }

  const { name, categoryId, price, stock, minStockThreshold } = validatedData.data;
  const category = await ensureCategoryExists(categoryId);

  if (!category) {
    return {
      error: "Selected category was not found.",
    };
  }

  const updatedProduct = await prisma.product.update({
    where: {
      id: existingProduct.id,
    },
    data: {
      name,
      categoryId,
      price,
      stock,
      minStockThreshold,
      status: getProductStatus(stock),
    },
  });

  await syncRestockQueue(updatedProduct.id, stock, minStockThreshold);

  await logActivity(`Updated product "${updatedProduct.name}"`, session.userId);

  revalidateProductPaths();

  return { success: true };
}

export async function deleteProduct(id: string): Promise<ProductActionResult> {
  const session = await requireSession("/login");

  if (!canDeleteProducts(session.role)) {
    return {
      error: "Only admins can delete products.",
    };
  }

  const validatedId = productIdSchema.safeParse(id);

  if (!validatedId.success) {
    return {
      error: validatedId.error.issues[0]?.message ?? "Invalid product id.",
    };
  }

  const product = await prisma.product.findUnique({
    where: {
      id: validatedId.data,
    },
  });

  if (!product) {
    return {
      error: "Product not found.",
    };
  }

  const linkedOrderItems = await prisma.orderItem.count({
    where: {
      productId: product.id,
    },
  });

  if (linkedOrderItems > 0) {
    return {
      error: "Cannot delete a product that is referenced by existing orders.",
    };
  }

  await prisma.product.delete({
    where: {
      id: product.id,
    },
  });

  await logActivity(`Deleted product "${product.name}"`, session.userId);

  revalidateProductPaths();

  return { success: true };
}

export async function getProducts(filters?: ProductFilters) {
  await requireSession("/login");

  const validatedFilters = productFiltersSchema.safeParse(filters ?? {});

  if (!validatedFilters.success) {
    return prisma.product.findMany({
      include: {
        category: true,
        restockQueue: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  return prisma.product.findMany({
    where: buildProductWhere(validatedFilters.data),
    include: {
      category: true,
      restockQueue: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getProductsPage(filters?: PaginatedProductFilters) {
  await requireSession("/login");

  const validatedFilters = paginatedProductFiltersSchema.safeParse(
    filters ?? {},
  );
  const parsedFilters = validatedFilters.success ? validatedFilters.data : {};
  const pageSize = parsedFilters.pageSize ?? 10;
  const requestedPage = parsedFilters.page ?? 1;
  const where = buildProductWhere(parsedFilters);

  const totalCount = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const skip = (currentPage - 1) * pageSize;
  const items = await prisma.product.findMany({
    where,
    include: {
      category: true,
      restockQueue: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take: pageSize,
  });

  return {
    items,
    totalCount,
    currentPage,
    totalPages,
    pageSize,
  };
}
