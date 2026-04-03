import type { SessionUser } from "@/lib/auth";

export type AppRole = SessionUser["role"];

export function isAdmin(role: AppRole) {
  return role === "ADMIN";
}

export function hasFullAccess(role: AppRole) {
  return isAdmin(role);
}

export function canDeleteProducts(role: AppRole) {
  return isAdmin(role);
}

export function canDeleteCategories(role: AppRole) {
  return isAdmin(role);
}

export function canManageRoles(role: AppRole) {
  return isAdmin(role);
}
