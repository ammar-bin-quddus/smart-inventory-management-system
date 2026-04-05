# Smart Inventory Management System

A full-stack inventory management dashboard built with Next.js 16, Prisma, PostgreSQL, React 19, and shadcn-style UI components.

The app includes authentication, role-based access control, product and category management, order processing, restock tracking, dashboard analytics, and an activity log.

## Features

- Email/password authentication with secure session cookies
- Role-based access for `ADMIN` and `MANAGER`
- Dashboard with stats, recent activity, product summary, and 7-day order chart
- Category management with duplicate checks and safe delete rules
- Product management with stock thresholds and low-stock indicators
- Order creation with stock validation, total calculation, and status workflow
- Human-friendly order codes instead of raw database IDs
- Restock queue with priority levels and restock actions
- Activity log for key system actions
- Server-side search, filtering, and pagination
- Seed script with demo users and sample inventory data

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Prisma 7
- PostgreSQL
- Tailwind CSS 4
- Zod
- React Hook Form
- Recharts
- Lucide React

## Project Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file.

If you already have `.env`, update it with the variables listed below.

3. Make sure your database schema is ready.

If this is a fresh database, push the Prisma schema:

```bash
npx prisma db push
```

If your database already exists, make sure it contains all current tables and columns used by the app, including `orders."orderCode"`.

4. Seed the database:

```bash
npx prisma db seed
```

5. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

The current project uses these variables:

### Required

```env
DATABASE_URL=
DIRECT_URL=
SESSION_SECRET=
```

### Optional

```env
NEXT_PUBLIC_DEMO_EMAIL=
NEXT_PUBLIC_DEMO_PASSWORD=
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_MANAGER_EMAIL=
SEED_MANAGER_PASSWORD=
```

### Notes

- `DATABASE_URL`: pooled or app runtime PostgreSQL connection string
- `DIRECT_URL`: direct PostgreSQL connection string for Prisma operations
- `SESSION_SECRET`: random 32+ character string used to sign auth session cookies
- `NEXT_PUBLIC_DEMO_EMAIL` and `NEXT_PUBLIC_DEMO_PASSWORD`: used by the Demo Login button
- `SEED_*`: overrides default seed credentials

## Seed Credentials

If you do not override the seed variables, the default accounts are:

### Admin

- Email: `admin@inventory.local`
- Password: `Admin12345`

### Manager

- Email: `manager@inventory.local`
- Password: `Manager12345`

If you want the Demo Login button to use the seeded admin account, set:

```env
NEXT_PUBLIC_DEMO_EMAIL=admin@inventory.local
NEXT_PUBLIC_DEMO_PASSWORD=Admin12345
```

## Useful Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npx tsc --noEmit
npx prisma generate
npx prisma db seed
```

## Order Code Note

Orders use a generated `orderCode` for display and activity logs.

If you added this feature to an existing database, make sure the `orders` table has the column and unique index:

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "orderCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "orders_orderCode_key" ON orders ("orderCode");
```

## Deployment Notes

For Vercel or any production host:

1. Set `DATABASE_URL`, `DIRECT_URL`, and `SESSION_SECRET`
2. Ensure the database schema matches `prisma/schema.prisma`
3. Run the seed only if you want demo data in production

The project already includes:

- `postinstall: prisma generate`

So Prisma Client is generated automatically during install.

## Access Flow

- `/` redirects to `/login` if the user is signed out
- `/` redirects to `/dashboard` if the user already has a valid session
- After login or signup, the user is redirected to `/dashboard`

## Roles

### ADMIN

- Full access

### MANAGER

- Can use the system normally
- Cannot delete products
- Cannot delete categories
- Cannot manage roles
