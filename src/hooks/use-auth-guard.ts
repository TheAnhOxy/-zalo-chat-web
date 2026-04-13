"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/components/providers/auth-provider";

export function useAuthGuard() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isInitialized) {
      return;
    }

    if (!auth.isAuthenticated) {
      router.replace("/login");
    }
  }, [auth.isAuthenticated, auth.isInitialized, router]);

  return auth;
}
