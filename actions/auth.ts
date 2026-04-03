"use server";

import { redirect } from "next/navigation";

import { hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clearSession, createSession } from "@/lib/session";
import { loginSchema, signupSchema } from "@/lib/validations/auth";

export type AuthActionState =
  | {
      error: string;
    }
  | undefined;

export async function signupAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const validatedFields = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0]?.message ?? "Invalid signup data.",
    };
  }

  const { name, email, password } = validatedFields.data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return {
      error: "An account with this email already exists.",
    };
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  await createSession({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  redirect("/dashboard");
}

export async function loginAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const validatedFields = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0]?.message ?? "Invalid login data.",
    };
  }

  const { email, password } = validatedFields.data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return {
      error: "Invalid email or password.",
    };
  }

  const passwordIsValid = await verifyPassword(password, user.password);

  if (!passwordIsValid) {
    return {
      error: "Invalid email or password.",
    };
  }

  await createSession({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
