"use client";

import { AuthProvider } from "@/src/components/providers/auth-provider";
import { CallProvider } from "@/src/components/providers/call-provider";
import { QueryProvider } from "@/src/components/providers/query-provider";
import { ToastProvider } from "@/src/components/providers/toast-provider";

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <AuthProvider>
          <CallProvider>{children}</CallProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryProvider>
  );
}
