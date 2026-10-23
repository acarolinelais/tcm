import { Toaster as Sonner } from "sonner";
import { CircleCheck, CircleX } from "lucide-react";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      icons={{
        success: <CircleCheck aria-hidden="true" className="size-4 fill-emerald-600 text-white" />,
        error: <CircleX aria-hidden="true" className="size-4 text-red-600" />,
      }}
      toastOptions={{
        classNames: {
          toast: "rounded-xl border border-emerald-100 bg-white shadow-lg",
          success: "border-emerald-100 bg-white text-emerald-700",
          error: "border-red-200 bg-white text-red-700",
          title: "font-medium",
          icon: "text-emerald-600",
        },
      }}
    />
  );
}
