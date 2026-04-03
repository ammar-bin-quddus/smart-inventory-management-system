"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { loginAction, type AuthActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "demo@inventory.app";
const DEMO_PASSWORD =
  process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "demo12345";

function createFormData(values: LoginFormValues) {
  const formData = new FormData();
  formData.set("email", values.email);
  formData.set("password", values.password);
  return formData;
}

export function LoginForm() {
  const [serverState, setServerState] = useState<AuthActionState>();
  const [isPending, startTransition] = useTransition();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const submit = (values: LoginFormValues) => {
    setServerState(undefined);

    startTransition(async () => {
      const result = await loginAction(undefined, createFormData(values));

      if (result?.error) {
        setServerState(result);
      }
    });
  };

  const handleDemoLogin = () => {
    const demoValues: LoginFormValues = {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    };

    form.reset(demoValues);
    submit(demoValues);
  };

  return (
    <Card className="border-zinc-200/80 bg-white/90 backdrop-blur">
      <CardHeader className="space-y-1">
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Sign in to manage products, orders, and stock activity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={form.handleSubmit(submit)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="manager@inventory.app"
              aria-invalid={Boolean(form.formState.errors.email)}
              disabled={isPending}
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <span className="text-xs text-zinc-500">Minimum 8 characters</span>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              aria-invalid={Boolean(form.formState.errors.password)}
              disabled={isPending}
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          {serverState?.error ? (
            <div
              className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {serverState.error}
            </div>
          ) : null}

          <div className="space-y-3 pt-2">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Signing in..." : "Login"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isPending}
              onClick={handleDemoLogin}
            >
              Demo Login
            </Button>

            <p className="text-center text-xs text-zinc-500">
              Demo uses{" "}
              <span className="font-medium text-zinc-700">{DEMO_EMAIL}</span>
            </p>
          </div>
        </form>

        <div
          className={cn(
            "mt-6 border-t border-zinc-200 pt-4 text-center text-sm text-zinc-600",
          )}
        >
          Need an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-zinc-950 underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
