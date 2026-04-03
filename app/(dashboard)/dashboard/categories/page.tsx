import { getCategories } from "@/actions/categories";
import { canDeleteCategories } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

import { CategoriesClient } from "./_components/categories-client";

export default async function CategoriesPage() {
  const session = await requireSession("/login");
  const categories = await getCategories();

  return (
    <CategoriesClient
      categories={categories}
      canDelete={canDeleteCategories(session.role)}
    />
  );
}
