"use client";

import { createContext } from "react";

export const LearningNavigationContext = createContext<{
  navigateCatalog: (href: string) => void;
  registerCatalogEntry: (href: string) => void;
} | null>(null);
