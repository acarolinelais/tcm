import { Toaster as Sonner } from "sonner";
import { CircleCheck } from "lucide-react";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      icons={{ success: <CircleCheck aria-hidden="true" className="size-4 fill-emerald-600 text-white" /> }}
      toastOptions={{
        classNames: {
          toast: "rounded-xl border border-emerald-100 bg-white shadow-lg",
          success: "border-emerald-100 bg-white text-emerald-700",
          title: "font-medium text-emerald-700",
          icon: "text-emerald-600",
        },
      }}
    />
  );
}
