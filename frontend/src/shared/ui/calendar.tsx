import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import { DayPicker } from "react-day-picker";
import { enUS, ko, ptBR } from "react-day-picker/locale";
import { useTranslation } from "react-i18next";

import { cn } from "@/shared/lib/utils";

const navButton = "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-disabled:opacity-50";

// Calendar do shadcn/ui (https://ui.shadcn.com/docs/components/base/calendar) sobre react-day-picker,
// com o idioma vindo do i18n da aplicação.
export function Calendar({ className, classNames, showOutsideDays = true, ...props }: ComponentProps<typeof DayPicker>) {
  const { i18n } = useTranslation();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={i18n.language?.startsWith("pt") ? ptBR : i18n.language?.startsWith("ko") ? ko : enUS}
      className={cn("w-fit p-2", className)}
      classNames={{
        months: "relative flex flex-col gap-4",
        month: "flex w-full flex-col gap-3",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: navButton,
        button_next: navButton,
        month_caption: "flex h-8 items-center justify-center px-8",
        caption_label: "select-none text-sm font-medium capitalize",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 select-none text-[0.8rem] font-normal text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "size-8 p-0 text-center text-sm",
        day_button: "inline-flex size-8 items-center justify-center rounded-lg tabular-nums transition-colors hover:bg-secondary active:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        today: "font-semibold text-primary",
        selected: "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:active:bg-primary",
        outside: "text-muted-foreground/60",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName }) => orientation === "left"
          ? <ChevronLeft aria-hidden="true" className={cn("size-4", chevronClassName)} />
          : <ChevronRight aria-hidden="true" className={cn("size-4", chevronClassName)} />,
      }}
      {...props}
    />
  );
}
