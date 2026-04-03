"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logActivity } from "@/lib/activity";
import { ProductStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getRestockPriority, shouldBeInRestockQueue } from "@/lib/restock";
import { requireSession } from "@/lib/session";

const productIdSchema = z.string().trim().min(1, "Product id is required.");
const queueIdSchema = z.string().trim().min(1, "Queue id is required.");
const restockQuantitySchema = z.coerce
  .number()
  .int("Restock quantity must be a whole number.")
  .min(1, "Restock quantity must be at least 1.");

export type RestockActionResult =
  | {
      error: string;
    }
  | {
      success: true;
    };

function getProductStatus(stock: number) {
  return stock <= 0 ? ProductStatus.OUT_OF_STOCK : ProductStatus.ACTIVE;
}

async function syncRestockQueueForProduct(
  productId: string,
  stock: number,
  minStockThreshold: number,
) {
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

function revalidateRestockPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/restock-queue");
}

export async function tsgetRestockQueue() {
  await requireSession("/login");

  return prisma.restockQueue.findMany({
    include: {
      product: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      product: {
        stock: "asc",
      },
    },
  });
}

export async function getRestockQueue() {
  return tsgetRestockQueue();
}

export async function restockProduct(
  id: string,
  qty: number,
): Promise<RestockActionResult> {
  const session = await requireSession("/login");
  const validatedId = productIdSchema.safeParse(id);
  const validatedQty = restockQuantitySchema.safeParse(qty);

  if (!validatedId.success) {
    return {
      error: validatedId.error.issues[0]?.message ?? "Invalid product id.",
    };
  }

  if (!validatedQty.success) {
    return {
      error:
        validatedQty.error.issues[0]?.message ?? "Invalid restock quantity.",
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

  const nextStock = product.stock + validatedQty.data;

  await prisma.product.update({
    where: {
      id: product.id,
    },
    data: {
      stock: nextStock,
      status: getProductStatus(nextStock),
    },
  });

  await syncRestockQueueForProduct(
    product.id,
    nextStock,
    product.minStockThreshold,
  );

  await logActivity(
    `Restocked "${product.name}" by ${validatedQty.data} units`,
    session.userId,
  );

  revalidateRestockPaths();

  return { success: true };
}

export async function removeFromQueue(
  id: string,
): Promise<RestockActionResult> {
  const session = await requireSession("/login");
  const validatedId = queueIdSchema.safeParse(id);

  if (!validatedId.success) {
    return {
      error: validatedId.error.issues[0]?.message ?? "Invalid queue id.",
    };
  }

  const queueItem = await prisma.restockQueue.findUnique({
    where: {
      id: validatedId.data,
    },
    include: {
      product: true,
    },
  });

  if (!queueItem) {
    return {
      error: "Restock queue item not found.",
    };
  }

  await prisma.restockQueue.delete({
    where: {
      id: queueItem.id,
    },
  });

  await logActivity(
    `Removed "${queueItem.product.name}" from the restock queue`,
    session.userId,
  );

  revalidateRestockPaths();

  return { success: true };
}
