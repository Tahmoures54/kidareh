import React from "react";

export type Tab = "terms" | "privacy" | "guide";

export interface TabConfig {
  id: Tab;
  label: string;
  icon: React.ComponentType<any>;
}