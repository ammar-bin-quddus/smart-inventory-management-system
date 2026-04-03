"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logActivity } from "@/lib/activity";
import { canDeleteCategories } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

const categoryNameSchema = z
  .string()
  .trim()
  .min(2, "Category name must be at least 2 characters long.");

const categoryIdSchema = z
  .string()
  .trim()
  .min(1, "Category id is required.");

export type CategoryActionResult =
  | {
      error: string;
    }
  | {
      success: true;
    };

export async function createCategory(
  name: string,
): Promise<CategoryActionResult> {
  const session = await requireSession("/login");
  const validatedName = categoryNameSchema.safeParse(name);

  if (!validatedName.success) {
    return {
      error:
        validatedName.error.issues[0]?.message ?? "Invalid category name.",
    };
  }

  const normalizedName = validatedName.data;

  const existingCategory = await prisma.category.findFirst({
    where: {
      name: normalizedName,
    },
  });

  if (existingCategory) {
    return {
      error: "A category with this name already exists.",
    };
  }

  const category = await prisma.category.create({
    data: {
      name: normalizedName,
    },
  });

  await logActivity(`Created category "${category.name}"`, session.userId);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/categories");

  return { success: true };
}

export async function deleteCategory(
  id: string,
): Promise<CategoryActionResult> {
  const session = await requireSession("/login");

  if (!canDeleteCategories(session.role)) {
    return {
      error: "Only admins can delete categories.",
    };
  }

  const validatedId = categoryIdSchema.safeParse(id);

  if (!validatedId.success) {
    return {
      error: validatedId.error.issues[0]?.message ?? "Invalid category id.",
    };
  }

  const category = await prisma.category.findUnique({
    where: {
      id: validatedId.data,
    },
  });

  if (!category) {
    return {
      error: "Category not found.",
    };
  }

  const attachedProducts = await prisma.product.count({
    where: {
      categoryId: category.id,
    },
  });

  if (attachedProducts > 0) {
    return {
      error: "Cannot delete a category that still has products attached.",
    };
  }

  await prisma.category.delete({
    where: {
      id: category.id,
    },
  });

  await logActivity(`Deleted category "${category.name}"`, session.userId);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/categories");

  return { success: true };
}

export async function getCategories() {
  await requireSession("/login");

  return prisma.category.findMany({
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}
