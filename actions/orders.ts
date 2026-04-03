"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logActivity } from "@/lib/activity";
import { OrderStatus, ProductStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getRestockPriority, shouldBeInRestockQueue } from "@/lib/restock";
import { requireSession } from "@/lib/session";

const orderItemSchema = z.object({
  productId: z.string().trim().min(1, "Product is required."),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1."),
});

const createOrderSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Customer name must be at least 2 characters long."),
  items: z.array(orderItemSchema).min(1, "At least one order item is required."),
});

const orderIdSchema = z.string().trim().min(1, "Order id is required.");

const orderStatusSchema = z.enum([
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
]);

const orderFiltersSchema = z.object({
  status: orderStatusSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

const paginatedOrderFiltersSchema = orderFiltersSchema.extend({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderFilters = z.infer<typeof orderFiltersSchema>;
export type PaginatedOrderFilters = z.infer<typeof paginatedOrderFiltersSchema>;

export type OrderActionResult =
  | {
      error: string;
    }
  | {
      success: true;
    };

const VALID_STATUS_TRANSITIONS: Record<
  keyof typeof OrderStatus,
  (keyof typeof OrderStatus)[]
> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

function revalidateOrderPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/restock-queue");
}

function getProductStatus(stock: number) {
  return stock <= 0 ? ProductStatus.OUT_OF_STOCK : ProductStatus.ACTIVE;
}

function buildOrderWhere(filters: OrderFilters) {
  const { status, dateFrom, dateTo } = filters;

  return {
    ...(status ? { status } : {}),
    ...((dateFrom || dateTo)
      ? {
          createdAt: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
  };
}

async function syncRestockQueueForProduct(
  tx: Pick<typeof prisma, "restockQueue">,
  productId: string,
  stock: number,
  minStockThreshold: number,
) {
  if (shouldBeInRestockQueue(stock, minStockThreshold)) {
    await tx.restockQueue.upsert({
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

  await tx.restockQueue.deleteMany({
    where: {
      productId,
    },
  });
}

export async function createOrder(
  data: CreateOrderInput,
): Promise<OrderActionResult> {
  const session = await requireSession("/login");
  const validatedData = createOrderSchema.safeParse(data);

  if (!validatedData.success) {
    return {
      error: validatedData.error.issues[0]?.message ?? "Invalid order data.",
    };
  }

  const { customerName, items } = validatedData.data;

  const productIds = items.map((item) => item.productId);
  const uniqueProductIds = new Set(productIds);

  if (uniqueProductIds.size !== productIds.length) {
    return {
      error: "Duplicate products are not allowed in a single order.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: {
          id: {
            in: [...uniqueProductIds],
          },
        },
      });

      if (products.length !== uniqueProductIds.size) {
        throw new Error("One or more selected products were not found.");
      }

      const productsById = new Map(
        products.map((product) => [product.id, product]),
      );

      for (const item of items) {
        const product = productsById.get(item.productId);

        if (!product) {
          throw new Error("One or more selected products were not found.");
        }

        if (product.status !== ProductStatus.ACTIVE) {
          throw new Error(`Product "${product.name}" is not active.`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Only ${product.stock} items available`);
        }
      }

      const totalPrice = items.reduce((sum, item) => {
        const product = productsById.get(item.productId);
        return sum + Number(product?.price ?? 0) * item.quantity;
      }, 0);

      const order = await tx.order.create({
        data: {
          customerName,
          userId: session.userId,
          totalPrice,
          items: {
            create: items.map((item) => {
              const product = productsById.get(item.productId);

              return {
                productId: item.productId,
                quantity: item.quantity,
                price: Number(product?.price ?? 0),
              };
            }),
          },
        },
      });

      for (const item of items) {
        const product = productsById.get(item.productId);

        if (!product) {
          continue;
        }

        const nextStock = product.stock - item.quantity;

        await tx.product.update({
          where: {
            id: product.id,
          },
          data: {
            stock: nextStock,
            status: getProductStatus(nextStock),
          },
        });

        await syncRestockQueueForProduct(
          tx,
          product.id,
          nextStock,
          product.minStockThreshold,
        );
      }

      return order.id;
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to create order.",
    };
  }

  await logActivity(`Created order for ${customerName}`, session.userId);

  revalidateOrderPaths();

  return { success: true };
}

export async function updateOrderStatus(
  id: string,
  status: keyof typeof OrderStatus,
): Promise<OrderActionResult> {
  const session = await requireSession("/login");
  const validatedId = orderIdSchema.safeParse(id);
  const validatedStatus = orderStatusSchema.safeParse(status);

  if (!validatedId.success) {
    return {
      error: validatedId.error.issues[0]?.message ?? "Invalid order id.",
    };
  }

  if (!validatedStatus.success) {
    return {
      error: validatedStatus.error.issues[0]?.message ?? "Invalid order status.",
    };
  }

  const order = await prisma.order.findUnique({
    where: {
      id: validatedId.data,
    },
  });

  if (!order) {
    return {
      error: "Order not found.",
    };
  }

  if (order.status === validatedStatus.data) {
    return { success: true };
  }

  const allowedTransitions =
    VALID_STATUS_TRANSITIONS[order.status as keyof typeof OrderStatus];

  if (!allowedTransitions.includes(validatedStatus.data)) {
    return {
      error: `Cannot change order from ${order.status} to ${validatedStatus.data}.`,
    };
  }

  await prisma.order.update({
    where: {
      id: order.id,
    },
    data: {
      status: validatedStatus.data,
    },
  });

  await logActivity(
    `Updated order "${order.id}" status to ${validatedStatus.data}`,
    session.userId,
  );

  revalidateOrderPaths();

  return { success: true };
}

export async function cancelOrder(id: string): Promise<OrderActionResult> {
  const session = await requireSession("/login");
  const validatedId = orderIdSchema.safeParse(id);

  if (!validatedId.success) {
    return {
      error: validatedId.error.issues[0]?.message ?? "Invalid order id.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: {
          id: validatedId.data,
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new Error("Order not found.");
      }

      if (order.status === OrderStatus.CANCELLED) {
        return;
      }

      if (order.status === OrderStatus.DELIVERED) {
        throw new Error("Delivered orders cannot be cancelled.");
      }

      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: {
            id: item.productId,
          },
        });

        if (!product) {
          continue;
        }

        const restoredStock = product.stock + item.quantity;

        await tx.product.update({
          where: {
            id: product.id,
          },
          data: {
            stock: restoredStock,
            status: getProductStatus(restoredStock),
          },
        });

        await syncRestockQueueForProduct(
          tx,
          product.id,
          restoredStock,
          product.minStockThreshold,
        );
      }

      await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: OrderStatus.CANCELLED,
        },
      });

    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to cancel order.",
    };
  }

  await logActivity(`Cancelled order "${validatedId.data}"`, session.userId);

  revalidateOrderPaths();

  return { success: true };
}

export async function getOrders(filters?: OrderFilters) {
  await requireSession("/login");

  const validatedFilters = orderFiltersSchema.safeParse(filters ?? {});

  if (!validatedFilters.success) {
    return prisma.order.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  return prisma.order.findMany({
    where: buildOrderWhere(validatedFilters.data),
    include: {
      items: {
        include: {
          product: true,
        },
      },
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getOrdersPage(filters?: PaginatedOrderFilters) {
  await requireSession("/login");

  const validatedFilters = paginatedOrderFiltersSchema.safeParse(
    filters ?? {},
  );
  const parsedFilters = validatedFilters.success ? validatedFilters.data : {};
  const pageSize = parsedFilters.pageSize ?? 10;
  const requestedPage = parsedFilters.page ?? 1;
  const where = buildOrderWhere(parsedFilters);

  const totalCount = await prisma.order.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const skip = (currentPage - 1) * pageSize;
  const items = await prisma.order.findMany({
    where,
    include: {
      items: {
        include: {
          product: true,
        },
      },
      user: true,
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
