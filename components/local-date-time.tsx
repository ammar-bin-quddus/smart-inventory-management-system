"use client";

import { useEffect, useState } from "react";

type LocalDateTimeProps = {
  value: string | Date;
  variant?: "activity" | "activity-short";
  className?: string;
};

function formatLocalDateTime(
  value: string | Date,
  variant: NonNullable<LocalDateTimeProps["variant"]>,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(variant === "activity" ? { year: "numeric" as const } : {}),
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function LocalDateTime({
  value,
  variant = "activity",
  className,
}: LocalDateTimeProps) {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    setFormatted(formatLocalDateTime(value, variant));
  }, [value, variant]);

  const date = new Date(value);

  return (
    <time dateTime={date.toISOString()} className={className}>
      {formatted}
    </time>
  );
}
