"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import { createOrder, type CreateOrderInput, type OrderActionResult } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductStatus } from "@/lib/generated/prisma/enums";

type ProductOption = {
  id: string;
  name: string;
  price: string;
  stock: number;
  status: keyof typeof ProductStatus;
};

type OrderRow = {
  productId: string;
  quantity: number;
};

function formatPrice(value: string | number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

function buildInitialRow(): OrderRow {
  return {
    productId: "",
    quantity: 1,
  };
}

export function CreateOrderForm({
  products,
}: {
  products: ProductOption[];
}) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [rows, setRows] = useState<OrderRow[]>([buildInitialRow()]);
  const [feedback, setFeedback] = useState<OrderActionResult | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const rowErrors = useMemo(() => {
    const selectedCounts = new Map<string, number>();

    for (const row of rows) {
      if (!row.productId) {
        continue;
      }

      selectedCounts.set(row.productId, (selectedCounts.get(row.productId) ?? 0) + 1);
    }

    return rows.map((row) => {
      const errors: string[] = [];
      const product = productsById.get(row.productId);

      if (!row.productId) {
        errors.push("Select a product.");
        return errors;
      }

      if ((selectedCounts.get(row.productId) ?? 0) > 1) {
        errors.push("Duplicate products are not allowed.");
      }

      if (!product) {
        errors.push("Selected product was not found.");
        return errors;
      }

      if (product.status !== ProductStatus.ACTIVE) {
        errors.push("Selected product is not active.");
      }

      if (row.quantity < 1) {
        errors.push("Quantity must be at least 1.");
      }

      if (row.quantity > product.stock) {
        errors.push(`Only ${product.stock} items available`);
      }

      return errors;
    });
  }, [productsById, rows]);

  const formError = submitted && customerName.trim().length < 2
    ? "Customer name must be at least 2 characters long."
    : null;

  const totalPrice = rows.reduce((sum, row) => {
    const product = productsById.get(row.productId);
    if (!product) {
      return sum;
    }

    return sum + Number(product.price) * row.quantity;
  }, 0);

  const handleRowChange = (index: number, nextRow: OrderRow) => {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? nextRow : row)),
    );
  };

  const handleAddRow = () => {
    setRows((current) => [...current, buildInitialRow()]);
  };

  const handleRemoveRow = (index: number) => {
    setRows((current) =>
      current.length === 1
        ? [buildInitialRow()]
        : current.filter((_, rowIndex) => rowIndex !== index),
    );
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setFeedback(null);

    if (customerName.trim().length < 2) {
      return;
    }

    if (rowErrors.some((errors) => errors.length > 0)) {
      return;
    }

    const payload: CreateOrderInput = {
      customerName,
      items: rows.map((row) => ({
        productId: row.productId,
        quantity: row.quantity,
      })),
    };

    startTransition(async () => {
      const result = await createOrder(payload);

      if ("error" in result) {
        setFeedback(result);
        return;
      }

      router.push("/dashboard/orders");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Create Order
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Build a new order, validate stock availability, and see totals update in real time.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/dashboard/orders">Back to Orders</Link>
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="customer-name">Customer Name</Label>
            <Input
              id="customer-name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Jordan Lee"
              disabled={isPending}
            />
            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            {rows.map((row, index) => {
              const product = productsById.get(row.productId);
              const errors = submitted ? rowErrors[index] : [];

              return (
                <div
                  key={index}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_120px_120px_auto]">
                    <div className="space-y-2">
                      <Label>Product</Label>
                      <Select
                        value={row.productId}
                        onValueChange={(value) =>
                          handleRowChange(index, { ...row, productId: value })
                        }
                        disabled={isPending || products.length === 0}
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue
                            placeholder={
                              products.length === 0
                                ? "No products available"
                                : "Select a product"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.name}{" "}
                              {option.status !== ProductStatus.ACTIVE
                                ? "(Inactive)"
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={row.quantity}
                        onChange={(event) =>
                          handleRowChange(index, {
                            ...row,
                            quantity: Number(event.target.value),
                          })
                        }
                        disabled={isPending}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Unit Price</Label>
                      <div className="flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-600">
                        {product ? formatPrice(product.price) : "-"}
                      </div>
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={isPending}
                        onClick={() => handleRemoveRow(index)}
                      >
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    </div>
                  </div>

                  {product ? (
                    <div className="mt-3 text-xs text-zinc-500">
                      Available stock: {product.stock}
                    </div>
                  ) : null}

                  {errors.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      {errors.map((error) => (
                        <p
                          key={error}
                          className="text-sm text-destructive"
                          role="alert"
                        >
                          {error}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={isPending}
              onClick={handleAddRow}
            >
              <Plus className="size-4" />
              Add another product
            </Button>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600">Total price</span>
              <span className="text-lg font-semibold text-zinc-950">
                {formatPrice(totalPrice)}
              </span>
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

          <div className="flex justify-end">
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Creating..." : "Create Order"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
