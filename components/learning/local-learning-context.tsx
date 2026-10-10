"use client";

import { createContext } from "react";

export const LocalLearningContext = createContext<{
  hrefFor: (href: string) => string | null;
} | null>(null);
