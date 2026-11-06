import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";

import { QueryProvider } from "@/core/providers/query-provider";
import { router } from "@/core/router";
import { Toaster } from "@/shared/ui/sonner";
import "@/core/i18n";

import "@/core/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <RouterProvider router={router} />
      <Toaster />
    </QueryProvider>
  </StrictMode>,
);
