"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Boxes, PackagePlus } from "lucide-react";

import { restockProduct, type RestockActionResult } from "@/actions/restock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RestockPriority } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

type QueueRow = {
  id: string;
  priority: keyof typeof RestockPriority;
  product: {
    id: string;
    name: string;
    stock: number;
    minStockThreshold: number;
    category: {
      name: string;
    };
  };
};

function PriorityBadge({
  priority,
}: {
  priority: keyof typeof RestockPriority;
}) {
  const priorityStyles: Record<keyof typeof RestockPriority, string> = {
    HIGH: "border-red-200 bg-red-50 text-red-700",
    MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
    LOW: "border-sky-200 bg-sky-50 text-sky-700",
  };

  return (
    <Badge
      variant="outline"
      className={cn("rounded-full border px-2.5 py-0.5", priorityStyles[priority])}
    >
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </Badge>
  );
}

export function RestockQueueClient({
  queue,
}: {
  queue: QueueRow[];
}) {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<QueueRow | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<RestockActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const openRestockDialog = (item: QueueRow) => {
    setSelectedItem(item);
    setQuantity(1);
    setFeedback(null);
  };

  const handleRestock = () => {
    if (!selectedItem) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      const result = await restockProduct(selectedItem.product.id, quantity);

      if ("error" in result) {
        setFeedback(result);
        return;
      }

      setSelectedItem(null);
      setFeedback(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Restock Queue
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Prioritize replenishment by stock urgency and restore product inventory quickly.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4">Product</TableHead>
              <TableHead className="px-4">Category</TableHead>
              <TableHead className="px-4">Current Stock</TableHead>
              <TableHead className="px-4">Threshold</TableHead>
              <TableHead className="px-4">Priority</TableHead>
              <TableHead className="px-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-zinc-500"
                >
                  No products currently need restocking.
                </TableCell>
              </TableRow>
            ) : (
              queue.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                        <Boxes className="size-4" />
                      </div>
                      <span className="font-medium text-zinc-950">
                        {item.product.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 text-zinc-600">
                    {item.product.category.name}
                  </TableCell>
                  <TableCell className="px-4 text-zinc-600">
                    {item.product.stock}
                  </TableCell>
                  <TableCell className="px-4 text-zinc-600">
                    {item.product.minStockThreshold}
                  </TableCell>
                  <TableCell className="px-4">
                    <PriorityBadge priority={item.priority} />
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={isPending}
                      onClick={() => openRestockDialog(item)}
                    >
                      <PackagePlus className="size-4" />
                      Restock
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={Boolean(selectedItem)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
            setFeedback(null);
          }
        }}
      >
        <DialogContent className="border-zinc-200 bg-white">
          <DialogHeader>
            <DialogTitle>Restock product</DialogTitle>
            <DialogDescription>
              {selectedItem
                ? `Add stock for ${selectedItem.product.name} and re-evaluate its queue status.`
                : "Add stock and re-evaluate queue status."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedItem ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                <p>
                  Current stock:{" "}
                  <span className="font-medium text-zinc-950">
                    {selectedItem.product.stock}
                  </span>
                </p>
                <p className="mt-1">
                  Threshold:{" "}
                  <span className="font-medium text-zinc-950">
                    {selectedItem.product.minStockThreshold}
                  </span>
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="restock-qty">Quantity to add</Label>
              <Input
                id="restock-qty"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                disabled={isPending}
              />
            </div>

            {feedback && "error" in feedback ? (
              <div
                className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {feedback.error}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedItem(null);
                setFeedback(null);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleRestock} disabled={isPending}>
              {isPending ? "Restocking..." : "Submit Restock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
