import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
