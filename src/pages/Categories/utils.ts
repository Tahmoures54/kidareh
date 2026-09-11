import { Package } from "lucide-react";
import { ThemeConfig } from "./types";
import { categoriesData } from "@data/processed/categories";

export const GROUP_CONFIG: Record<string, ThemeConfig> = Object.fromEntries(
  categoriesData.map((group) => [
    group.slug,
    {
      icon: Package,
      gradient: group.gradient,
      lightBg: "bg-teal-50",
      darkBg: "dark:bg-teal-500/10",
      iconColor: "text-teal-600 dark:text-teal-400",
    } satisfies ThemeConfig,
  ])
);

export const DEFAULT_CONFIG: ThemeConfig = {
  icon: Package,
  gradient: "from-teal-400 to-emerald-500",
  lightBg: "bg-teal-50",
  darkBg: "dark:bg-teal-500/10",
  iconColor: "text-teal-600 dark:text-teal-400",
};
