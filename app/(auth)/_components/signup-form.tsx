"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { signupAction, type AuthActionState } from "@/actions/auth";
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
import { signupSchema, type SignupFormValues } from "@/lib/validations/auth";

function createFormData(values: SignupFormValues) {
  const formData = new FormData();
  formData.set("name", values.name);
  formData.set("email", values.email);
  formData.set("password", values.password);
  return formData;
}

export function SignupForm() {
  const [serverState, setServerState] = useState<AuthActionState>();
  const [isPending, startTransition] = useTransition();
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const submit = (values: SignupFormValues) => {
    setServerState(undefined);

    startTransition(async () => {
      const result = await signupAction(undefined, createFormData(values));

      if (result?.error) {
        setServerState(result);
      }
    });
  };

  return (
    <Card className="border-zinc-200/80 bg-white/90 backdrop-blur">
      <CardHeader className="space-y-1">
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Start with a manager account and begin tracking inventory in one place.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={form.handleSubmit(submit)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Alex Morgan"
              aria-invalid={Boolean(form.formState.errors.name)}
              disabled={isPending}
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="alex@inventory.app"
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
              placeholder="Create a secure password"
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

          <Button type="submit" className="mt-2 w-full" disabled={isPending}>
            {isPending ? "Creating account..." : "Sign up"}
          </Button>
        </form>

        <div className="mt-6 border-t border-zinc-200 pt-4 text-center text-sm text-zinc-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-zinc-950 underline-offset-4 hover:underline"
          >
            Login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
