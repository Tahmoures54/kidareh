import React from "react";

export interface CategoryType {
  text: string;
  value: string;
}

export interface CategoryGroup {
  id?: string | number;
  group: string;
  types: CategoryType[];
}

export type ThemeConfig = {
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  lightBg: string;
  darkBg: string;
  iconColor: string;
};