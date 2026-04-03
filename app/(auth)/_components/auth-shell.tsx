import type { ReactNode } from "react";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(161,161,170,0.16),_transparent_35%),linear-gradient(180deg,_#fafafa_0%,_#f4f4f5_100%)] px-4 py-12">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0,transparent_calc(50%-1px),rgba(24,24,27,0.04)_50%,transparent_calc(50%+1px),transparent_100%)]" />
      <div className="relative z-10 flex w-full max-w-md flex-col gap-3">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
            Inventory OS
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            {title}
          </h1>
          <p className="text-sm leading-6 text-zinc-600">{description}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
