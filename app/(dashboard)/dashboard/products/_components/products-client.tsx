"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";

import {
  createProduct,
  deleteProduct,
  updateProduct,
  type ProductActionResult,
  type ProductInput,
} from "@/actions/products";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductStatus } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

type ProductRow = {
  id: string;
  name: string;
  price: string | number;
  stock: number;
  minStockThreshold: number;
  status: keyof typeof ProductStatus;
  category: {
    id: string;
    name: string;
  };
  restockQueue: {
    id: string;
    priority: string;
  } | null;
};

type CategoryOption = {
  id: string;
  name: string;
};

const emptyForm: ProductInput = {
  name: "",
  categoryId: "",
  price: 0,
  stock: 0,
  minStockThreshold: 5,
};

function formatPrice(value: string | number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

function ProductStatusBadge({ status }: { status: ProductRow["status"] }) {
  const isActive = status === ProductStatus.ACTIVE;

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border px-2.5 py-0.5",
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700",
      )}
    >
      {isActive ? "Active" : "Out of Stock"}
    </Badge>
  );
}

function LowStockBadge({
  stock,
  minStockThreshold,
}: {
  stock: number;
  minStockThreshold: number;
}) {
  if (stock > minStockThreshold) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-amber-700"
    >
      <AlertTriangle className="size-3.5" />
      Low stock
    </Badge>
  );
}

function ProductFormDialog({
  categories,
  open,
  onOpenChange,
  initialValues,
  title,
  description,
  submitLabel,
  pending,
  feedback,
  onSubmit,
}: {
  categories: CategoryOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: ProductInput;
  title: string;
  description: string;
  submitLabel: string;
  pending: boolean;
  feedback: ProductActionResult | null;
  onSubmit: (values: ProductInput) => void;
}) {
  const [form, setForm] = useState<ProductInput>(initialValues);

  const syncIfClosed = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setForm(initialValues);
    }
  };
  return (
    <Dialog open={open} onOpenChange={syncIfClosed}>
      <DialogContent className="border-zinc-200 bg-white">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Product name</Label>
              <Input
                id="product-name"
                value={form.name}
                onChange={(event) =>
                  setForm((value) => ({ ...value, name: event.target.value }))
                }
              placeholder="Wireless Barcode Scanner"
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.categoryId}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, categoryId: value }))
              }
              disabled={pending || categories.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    categories.length === 0
                      ? "Create a category first"
                      : "Select a category"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="product-price">Price</Label>
              <Input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    price: Number(event.target.value),
                  }))
                }
                disabled={pending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-stock">Stock</Label>
              <Input
                id="product-stock"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    stock: Number(event.target.value),
                  }))
                }
                disabled={pending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-threshold">Min threshold</Label>
              <Input
                id="product-threshold"
                type="number"
                min="0"
                step="1"
                value={form.minStockThreshold}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    minStockThreshold: Number(event.target.value),
                  }))
                }
                disabled={pending}
              />
            </div>
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
            onClick={() => syncIfClosed(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={pending || categories.length === 0}
          >
            {pending ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProductsClient({
  products,
  categories,
  filters,
  totalCount,
  canDelete,
}: {
  products: ProductRow[];
  categories: CategoryOption[];
  filters: {
    search: string;
    categoryId: string;
    status: "ALL" | keyof typeof ProductStatus;
  };
  totalCount: number;
  canDelete: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [searchValue, setSearchValue] = useState(filters.search);
  const [createFeedback, setCreateFeedback] =
    useState<ProductActionResult | null>(null);
  const [updateFeedback, setUpdateFeedback] =
    useState<ProductActionResult | null>(null);
  const [deleteFeedback, setDeleteFeedback] =
    useState<ProductActionResult | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateQueryParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (!value) {
        params.delete(key);
        continue;
      }

      params.set(key, value);
    }

    params.delete("page");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const handleCreate = (values: ProductInput) => {
    setCreateFeedback(null);
    setDeleteFeedback(null);

    startTransition(async () => {
      const result = await createProduct(values);

      if ("error" in result) {
        setCreateFeedback(result);
        return;
      }

      setCreateOpen(false);
      setCreateFeedback(null);
      router.refresh();
    });
  };

  const handleUpdate = (values: ProductInput) => {
    if (!editingProduct) {
      return;
    }

    setUpdateFeedback(null);
    setDeleteFeedback(null);

    startTransition(async () => {
      const result = await updateProduct(editingProduct.id, values);

      if ("error" in result) {
        setUpdateFeedback(result);
        return;
      }

      setEditingProduct(null);
      setUpdateFeedback(null);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    setCreateFeedback(null);
    setUpdateFeedback(null);
    setDeleteFeedback(null);
    setPendingDeleteId(id);

    startTransition(async () => {
      const result = await deleteProduct(id);

      if ("error" in result) {
        setDeleteFeedback(result);
        setPendingDeleteId(null);
        return;
      }

      setPendingDeleteId(null);
      router.refresh();
    });
  };

  const editingInitialValues: ProductInput = editingProduct
    ? {
        name: editingProduct.name,
        categoryId: editingProduct.category.id,
        price: Number(editingProduct.price),
        stock: editingProduct.stock,
        minStockThreshold: editingProduct.minStockThreshold,
      }
    : emptyForm;
  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.categoryId) ||
    filters.status !== "ALL";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Products
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage pricing, stock levels, and low-inventory alerts from one
            table.
          </p>
        </div>

        <Button
          className="gap-2 self-start"
          onClick={() => {
            setCreateFeedback(null);
            setCreateOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add Product
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <form
            className="flex-1 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              updateQueryParams({
                search: searchValue.trim() || null,
              });
            }}
          >
            <Label htmlFor="product-search">Search by name</Label>
            <div className="flex gap-2">
              <Input
                id="product-search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search products..."
              />
              <Button type="submit" variant="outline">
                Search
              </Button>
            </div>
          </form>

          <div className="space-y-2 lg:w-56">
            <Label>Category</Label>
            <Select
              value={filters.categoryId || "__all__"}
              onValueChange={(value) =>
                updateQueryParams({
                  categoryId: value === "__all__" ? null : value,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 lg:w-52">
            <Label>Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                updateQueryParams({
                  status: value === "ALL" ? null : value,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value={ProductStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={ProductStatus.OUT_OF_STOCK}>
                  Out of Stock
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearchValue("");
                router.push(pathname);
              }}
            >
              Clear Filters
            </Button>
          ) : null}
        </div>

        <p className="mt-3 text-sm text-zinc-500">
          Showing {products.length} of {totalCount} products
        </p>
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
              <TableHead className="px-4">Category</TableHead>
              <TableHead className="px-4">Price</TableHead>
              <TableHead className="px-4">Stock</TableHead>
              <TableHead className="px-4">Status</TableHead>
              <TableHead className="px-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-zinc-500"
                >
                  {hasActiveFilters
                    ? "No products match the current filters."
                    : "No products yet. Add your first product to start tracking stock and pricing."}
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="px-4">
                    <div className="space-y-1">
                      <p className="font-medium text-zinc-950">{product.name}</p>
                      <div className="flex flex-wrap gap-2">
                        <LowStockBadge
                          stock={product.stock}
                          minStockThreshold={product.minStockThreshold}
                        />
                        {product.restockQueue ? (
                          <Badge
                            variant="outline"
                            className="rounded-full border-zinc-200 px-2.5 py-0.5 text-zinc-600"
                          >
                            Restock: {product.restockQueue.priority}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 text-zinc-600">
                    {product.category.name}
                  </TableCell>
                  <TableCell className="px-4 text-zinc-600">
                    {formatPrice(product.price)}
                  </TableCell>
                  <TableCell className="px-4 text-zinc-600">
                    <span className="font-medium text-zinc-950">
                      {product.stock}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500">
                      min {product.minStockThreshold}
                    </span>
                  </TableCell>
                  <TableCell className="px-4">
                    <ProductStatusBadge status={product.status} />
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="size-8 p-0"
                        disabled={isPending}
                        aria-label={`Edit ${product.name}`}
                        title={`Edit ${product.name}`}
                        onClick={() => {
                          setUpdateFeedback(null);
                          setEditingProduct(product);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="size-8 p-0"
                          disabled={isPending || pendingDeleteId === product.id}
                          aria-label={`Delete ${product.name}`}
                          title={`Delete ${product.name}`}
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : (
                        <span className="self-center text-xs text-zinc-400">
                          Admin only
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProductFormDialog
        key="create-product"
        categories={categories}
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreateFeedback(null);
          }
        }}
        initialValues={emptyForm}
        title="Add product"
        description="Create a new product and immediately track its stock health."
        submitLabel="Create Product"
        pending={isPending}
        feedback={createFeedback}
        onSubmit={handleCreate}
      />

      <ProductFormDialog
        key={editingProduct?.id ?? "edit-product"}
        categories={categories}
        open={Boolean(editingProduct)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingProduct(null);
            setUpdateFeedback(null);
          }
        }}
        initialValues={editingInitialValues}
        title="Edit product"
        description="Update product details and stock thresholds."
        submitLabel="Save Changes"
        pending={isPending}
        feedback={updateFeedback}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
