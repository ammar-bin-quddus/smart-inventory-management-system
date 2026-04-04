import "dotenv/config";

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

import pg from "pg";

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

type Role = "ADMIN" | "MANAGER";
type ProductStatus = "ACTIVE" | "OUT_OF_STOCK";
type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";
type RestockPriority = "HIGH" | "MEDIUM" | "LOW";

type CategorySeed = {
  id: string;
  name: string;
};

type ProductSeed = {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  stock: number;
  minStockThreshold: number;
  status: ProductStatus;
};

type OrderItemSeed = {
  product: ProductSeed;
  quantity: number;
};

function createId() {
  return randomUUID();
}

function getRestockPriority(
  stock: number,
  minStockThreshold: number,
): RestockPriority {
  if (stock === 0) {
    return "HIGH";
  }

  if (stock <= minStockThreshold / 2) {
    return "MEDIUM";
  }

  return "LOW";
}

function shouldBeInRestockQueue(stock: number, minStockThreshold: number) {
  return stock < minStockThreshold;
}

function calculateTotal(items: OrderItemSeed[]) {
  return items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
}

function createSeedOrderCode(index: number) {
  return `ORD-SEED-${String(index).padStart(4, "0")}`;
}

async function insertUser(
  client: pg.Client,
  values: {
    id: string;
    name: string;
    email: string;
    password: string;
    role: Role;
  },
) {
  await client.query(
    `
      INSERT INTO users (id, name, email, password, role, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5::"Role", NOW(), NOW())
    `,
    [values.id, values.name, values.email, values.password, values.role],
  );
}

async function insertCategory(client: pg.Client, category: CategorySeed) {
  await client.query(
    `
      INSERT INTO categories (id, name, "createdAt", "updatedAt")
      VALUES ($1, $2, NOW(), NOW())
    `,
    [category.id, category.name],
  );
}

async function insertProduct(client: pg.Client, product: ProductSeed) {
  await client.query(
    `
      INSERT INTO products (
        id,
        name,
        "categoryId",
        price,
        stock,
        "minStockThreshold",
        status,
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::"ProductStatus", NOW(), NOW())
    `,
    [
      product.id,
      product.name,
      product.categoryId,
      product.price,
      product.stock,
      product.minStockThreshold,
      product.status,
    ],
  );
}

async function insertRestockQueue(
  client: pg.Client,
  values: {
    id: string;
    productId: string;
    priority: RestockPriority;
  },
) {
  await client.query(
    `
      INSERT INTO restock_queue (id, "productId", priority, "createdAt", "updatedAt")
      VALUES ($1, $2, $3::"RestockPriority", NOW(), NOW())
    `,
    [values.id, values.productId, values.priority],
  );
}

async function insertOrder(
  client: pg.Client,
  values: {
    id: string;
    orderCode: string;
    customerName: string;
    status: OrderStatus;
    totalPrice: number;
    userId: string;
    items: OrderItemSeed[];
  },
) {
  await client.query(
    `
      INSERT INTO orders (
        id,
        "orderCode",
        "customerName",
        status,
        "totalPrice",
        "userId",
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4::"OrderStatus", $5, $6, NOW(), NOW())
    `,
    [
      values.id,
      values.orderCode,
      values.customerName,
      values.status,
      values.totalPrice,
      values.userId,
    ],
  );

  for (const item of values.items) {
    await client.query(
      `
        INSERT INTO order_items (id, "orderId", "productId", quantity, price)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        createId(),
        values.id,
        item.product.id,
        item.quantity,
        item.product.price,
      ],
    );
  }
}

async function insertActivityLog(
  client: pg.Client,
  values: {
    id: string;
    message: string;
    userId: string;
  },
) {
  await client.query(
    `
      INSERT INTO activity_logs (id, message, "userId", "createdAt")
      VALUES ($1, $2, $3, NOW())
    `,
    [values.id, values.message, values.userId],
  );
}

async function main() {
  const client = new Client({
    connectionString,
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@inventory.local";
  const adminPasswordPlain = process.env.SEED_ADMIN_PASSWORD ?? "Admin12345";
  const managerEmail =
    process.env.SEED_MANAGER_EMAIL ?? "manager@inventory.local";
  const managerPasswordPlain =
    process.env.SEED_MANAGER_PASSWORD ?? "Manager12345";

  const adminPassword = await bcrypt.hash(adminPasswordPlain, 12);
  const managerPassword = await bcrypt.hash(managerPasswordPlain, 12);

  const adminUser = {
    id: createId(),
    name: "Admin User",
    email: adminEmail,
    password: adminPassword,
    role: "ADMIN" as const,
  };

  const managerUser = {
    id: createId(),
    name: "Manager User",
    email: managerEmail,
    password: managerPassword,
    role: "MANAGER" as const,
  };

  const categories: CategorySeed[] = [
    { id: createId(), name: "Electronics" },
    { id: createId(), name: "Office Supplies" },
    { id: createId(), name: "Warehouse Tools" },
    { id: createId(), name: "Packaging" },
  ];

  const categoriesByName = new Map(
    categories.map((category) => [category.name, category]),
  );

  const products: ProductSeed[] = [
    {
      id: createId(),
      name: "Wireless Barcode Scanner",
      categoryId: categoriesByName.get("Electronics")!.id,
      price: 129.99,
      stock: 18,
      minStockThreshold: 6,
      status: "ACTIVE",
    },
    {
      id: createId(),
      name: "Thermal Label Printer",
      categoryId: categoriesByName.get("Electronics")!.id,
      price: 249,
      stock: 4,
      minStockThreshold: 8,
      status: "ACTIVE",
    },
    {
      id: createId(),
      name: "A4 Copy Paper Box",
      categoryId: categoriesByName.get("Office Supplies")!.id,
      price: 39.5,
      stock: 24,
      minStockThreshold: 10,
      status: "ACTIVE",
    },
    {
      id: createId(),
      name: "Heavy Duty Pallet Jack",
      categoryId: categoriesByName.get("Warehouse Tools")!.id,
      price: 420,
      stock: 2,
      minStockThreshold: 5,
      status: "ACTIVE",
    },
    {
      id: createId(),
      name: "Bubble Wrap Roll",
      categoryId: categoriesByName.get("Packaging")!.id,
      price: 18.75,
      stock: 0,
      minStockThreshold: 12,
      status: "OUT_OF_STOCK",
    },
    {
      id: createId(),
      name: "Packing Tape Pack",
      categoryId: categoriesByName.get("Packaging")!.id,
      price: 12,
      stock: 7,
      minStockThreshold: 8,
      status: "ACTIVE",
    },
  ];

  const productsByName = new Map(
    products.map((product) => [product.name, product]),
  );

  const orderOneItems: OrderItemSeed[] = [
    {
      product: productsByName.get("Wireless Barcode Scanner")!,
      quantity: 2,
    },
    {
      product: productsByName.get("Packing Tape Pack")!,
      quantity: 3,
    },
  ];

  const orderTwoItems: OrderItemSeed[] = [
    {
      product: productsByName.get("A4 Copy Paper Box")!,
      quantity: 4,
    },
    {
      product: productsByName.get("Thermal Label Printer")!,
      quantity: 1,
    },
  ];

  const orderThreeItems: OrderItemSeed[] = [
    {
      product: productsByName.get("Heavy Duty Pallet Jack")!,
      quantity: 1,
    },
  ];
  const seedOrderOneCode = createSeedOrderCode(1);
  const seedOrderTwoCode = createSeedOrderCode(2);
  const seedOrderThreeCode = createSeedOrderCode(3);

  try {
    await client.connect();
    await client.query("BEGIN");

    await client.query(`
      TRUNCATE TABLE
        activity_logs,
        order_items,
        orders,
        restock_queue,
        products,
        categories,
        users
      RESTART IDENTITY CASCADE
    `);

    await insertUser(client, adminUser);
    await insertUser(client, managerUser);

    for (const category of categories) {
      await insertCategory(client, category);
    }

    for (const product of products) {
      await insertProduct(client, product);
    }

    for (const product of products) {
      if (!shouldBeInRestockQueue(product.stock, product.minStockThreshold)) {
        continue;
      }

      await insertRestockQueue(client, {
        id: createId(),
        productId: product.id,
        priority: getRestockPriority(
          product.stock,
          product.minStockThreshold,
        ),
      });
    }

    await insertOrder(client, {
      id: createId(),
      orderCode: seedOrderOneCode,
      customerName: "Acme Retail Ltd.",
      status: "PENDING",
      totalPrice: calculateTotal(orderOneItems),
      userId: adminUser.id,
      items: orderOneItems,
    });

    await insertOrder(client, {
      id: createId(),
      orderCode: seedOrderTwoCode,
      customerName: "Northwind Traders",
      status: "SHIPPED",
      totalPrice: calculateTotal(orderTwoItems),
      userId: managerUser.id,
      items: orderTwoItems,
    });

    await insertOrder(client, {
      id: createId(),
      orderCode: seedOrderThreeCode,
      customerName: "Orbit Fulfillment",
      status: "DELIVERED",
      totalPrice: calculateTotal(orderThreeItems),
      userId: adminUser.id,
      items: orderThreeItems,
    });

    await insertActivityLog(client, {
      id: createId(),
      message: 'Seeded category "Electronics"',
      userId: adminUser.id,
    });
    await insertActivityLog(client, {
      id: createId(),
      message: 'Seeded category "Packaging"',
      userId: adminUser.id,
    });
    await insertActivityLog(client, {
      id: createId(),
      message: 'Seeded product "Bubble Wrap Roll"',
      userId: adminUser.id,
    });
    await insertActivityLog(client, {
      id: createId(),
      message: 'Seeded product "Thermal Label Printer"',
      userId: adminUser.id,
    });
    await insertActivityLog(client, {
      id: createId(),
      message: `Seeded starter orders ${seedOrderOneCode}, ${seedOrderTwoCode}, and ${seedOrderThreeCode}`,
      userId: managerUser.id,
    });

    await client.query("COMMIT");

    console.log("Database seeded successfully.");
    console.log(`Admin login: ${adminEmail} / ${adminPasswordPlain}`);
    console.log(`Manager login: ${managerEmail} / ${managerPasswordPlain}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Database seeding failed.");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
