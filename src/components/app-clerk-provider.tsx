"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { useTheme } from "./theme-provider";

export function AppClerkProvider({ children }: { children: React.ReactNode }) {
  const { resolved } = useTheme();
  return (
    <ClerkProvider appearance={clerkAppearance(resolved === "dark")}>
      {children}
    </ClerkProvider>
  );
}
