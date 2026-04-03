import { getProducts } from "@/actions/products";

import { CreateOrderForm } from "./_components/create-order-form";

export default async function NewOrderPage() {
  const products = await getProducts();

  return (
    <CreateOrderForm
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price.toString(),
        stock: product.stock,
        status: product.status,
      }))}
    />
  );
}
