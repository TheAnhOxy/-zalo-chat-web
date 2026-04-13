"use client";

import { AuthProvider } from "@/src/components/providers/auth-provider";
import { QueryProvider } from "@/src/components/providers/query-provider";
import { ToastProvider } from "@/src/components/providers/toast-provider";

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </QueryProvider>
  );
}
