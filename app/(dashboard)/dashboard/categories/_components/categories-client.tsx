"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";

import {
  createCategory,
  deleteCategory,
  type CategoryActionResult,
} from "@/actions/categories";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

type CategoryRow = {
  id: string;
  name: string;
  createdAt: Date;
  _count: {
    products: number;
  };
};

export function CategoriesClient({
  categories,
  canDelete,
}: {
  categories: CategoryRow[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [createFeedback, setCreateFeedback] =
    useState<CategoryActionResult | null>(null);
  const [deleteFeedback, setDeleteFeedback] =
    useState<CategoryActionResult | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    setCreateFeedback(null);
    setDeleteFeedback(null);

    startTransition(async () => {
      const result = await createCategory(name);

      if ("error" in result) {
        setCreateFeedback(result);
        return;
      }

      setName("");
      setDialogOpen(false);
      setCreateFeedback(null);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    setCreateFeedback(null);
    setDeleteFeedback(null);
    setPendingDeleteId(id);

    startTransition(async () => {
      const result = await deleteCategory(id);

      if ("error" in result) {
        setDeleteFeedback(result);
        setPendingDeleteId(null);
        return;
      }

      setPendingDeleteId(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Categories
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Organize products into clear groups for inventory tracking.
          </p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setCreateFeedback(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 self-start">
              <Plus className="size-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="border-zinc-200 bg-white">
            <DialogHeader>
              <DialogTitle>Add category</DialogTitle>
              <DialogDescription>
                Create a new category to organize your product catalog.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="category-name">Category name</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Office Supplies"
                disabled={isPending}
              />
            </div>

            {createFeedback && "error" in createFeedback ? (
              <div
                className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {createFeedback.error}
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleCreate} disabled={isPending}>
                {isPending ? "Saving..." : "Create Category"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {deleteFeedback && "error" in deleteFeedback ? (
        <div
          className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {deleteFeedback.error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4">Name</TableHead>
              <TableHead className="px-4">Products</TableHead>
              <TableHead className="px-4">Created</TableHead>
              <TableHead className="px-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="px-4 py-10 text-center text-sm text-zinc-500"
                >
                  No categories yet. Add your first one to start organizing
                  products.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="px-4 font-medium text-zinc-950">
                    {category.name}
                  </TableCell>
                  <TableCell className="px-4 text-zinc-600">
                    {category._count.products}
                  </TableCell>
                  <TableCell className="px-4 text-zinc-600">
                    {format(new Date(category.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={isPending || pendingDeleteId === category.id}
                        onClick={() => handleDelete(category.id)}
                      >
                        <Trash2 className="size-4" />
                        {pendingDeleteId === category.id
                          ? "Deleting..."
                          : "Delete"}
                      </Button>
                    ) : (
                      <span className="text-xs text-zinc-400">
                        Admin only
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
