import React from "react";
import { cn } from "../../utils";

export function FeedColumn({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("feed-column", className)}>{children}</div>;
}

export function FeedStack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("feed-stack", className)}>{children}</div>;
}
