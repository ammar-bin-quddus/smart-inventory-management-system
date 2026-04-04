import { getRestockQueue } from "@/actions/restock";
import { RestockPriority } from "@/lib/generated/prisma/enums";

import { RestockQueueClient } from "./_components/restock-queue-client";

const priorityRank: Record<keyof typeof RestockPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export default async function RestockQueuePage() {
  const queue = await getRestockQueue();

  const sortedQueue = [...queue].sort((left, right) => {
    const priorityDiff =
      priorityRank[left.priority] - priorityRank[right.priority];

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return left.product.stock - right.product.stock;
  });

  return (
    <RestockQueueClient
      queue={sortedQueue.map((item) => ({
        id: item.id,
        priority: item.priority,
        product: {
          id: item.product.id,
          name: item.product.name,
          stock: item.product.stock,
          minStockThreshold: item.product.minStockThreshold,
          category: {
            name: item.product.category.name,
          },
        },
      }))}
    />
  );
}
