import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  type SessionPayload,
  type SessionUser,
  verifySessionToken,
} from "./auth";

export async function createSession(user: SessionUser) {
  const cookieStore = await cookies();
  const token = createSessionToken(user);

  cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);

  return token;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export async function requireSession(redirectTo = "/login") {
  const session = await getSession();

  if (!session) {
    redirect(redirectTo);
  }

  return session;
}

export async function requireRole(
  allowedRoles: SessionUser["role"][],
  redirectTo = "/login",
) {
  const session = await requireSession(redirectTo);

  if (!allowedRoles.includes(session.role)) {
    redirect("/unauthorized");
  }

  return session;
}
