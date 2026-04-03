import { RestockPriority } from "@/lib/generated/prisma/enums";

export function getRestockPriority(stock: number, minStockThreshold: number) {
  if (stock === 0) {
    return RestockPriority.HIGH;
  }

  if (stock <= minStockThreshold / 2) {
    return RestockPriority.MEDIUM;
  }

  return RestockPriority.LOW;
}

export function shouldBeInRestockQueue(
  stock: number,
  minStockThreshold: number,
) {
  return stock < minStockThreshold;
}
