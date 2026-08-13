"use client";

import { useEffect } from "react";
import { useAuth } from "@/store/auth";
import { initTheme } from "@/store/ui";

export function Providers({ children }: { children: React.ReactNode }) {
  const bootstrap = useAuth((s) => s.bootstrap);

  useEffect(() => {
    initTheme();
    void bootstrap();
  }, [bootstrap]);

  return children;
}
