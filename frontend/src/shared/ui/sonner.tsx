import { Toaster as Sonner } from "sonner";
import { CircleCheck, CircleX } from "lucide-react";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      closeButton
      offset={{ top: 48, right: 16 }}
      mobileOffset={{ top: 48, right: 12, left: 12 }}
      icons={{
        success: <CircleCheck aria-hidden="true" className="size-4 text-emerald-600" />,
        error: <CircleX aria-hidden="true" className="size-4 text-red-600" />,
      }}
      toastOptions={{
        classNames: {
          toast: "rounded-xl border border-border bg-white py-3 pl-4 pr-11 shadow-[0_4px_16px_rgba(15,23,42,0.10)]",
          success: "text-foreground",
          error: "border-red-200 text-red-700",
          content: "gap-0.5",
          title: "text-sm font-medium leading-5 text-foreground",
          description: "text-sm leading-[1.45] text-muted-foreground",
          icon: "mt-0.5",
          closeButton: "h-5 w-5 rounded-md border-0 bg-transparent text-muted-foreground hover:bg-secondary active:bg-secondary hover:text-foreground",
        },
      }}
    />
  );
}
