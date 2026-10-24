import { Popover } from "@base-ui/react/popover";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import type { WeekNumberProps } from "react-day-picker";
import { useTranslation } from "react-i18next";

import { cn, semanaIso } from "@/shared/lib/utils";
import { Calendar } from "@/shared/ui/calendar";

function diasDaSemana(valor: string) {
  const [ano, semana] = valor.split("-W").map(Number);
  // 4 de janeiro sempre cai na semana 1 ISO.
  const quatroDeJaneiro = new Date(ano, 0, 4);
  const segunda = new Date(ano, 0, 4 - ((quatroDeJaneiro.getDay() || 7) - 1) + (semana - 1) * 7);
  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);
  return { segunda, domingo, ano, semana };
}

interface WeekPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function WeekPicker({ label, value, onChange, className }: WeekPickerProps) {
  const { t } = useTranslation();
  const [aberto, setAberto] = useState(false);
  const selecionada = value ? diasDaSemana(value) : null;
  const texto = selecionada ? t("weekValue", { week: selecionada.semana, year: selecionada.ano }) : t("selectWeek");

  function escolher(proximo: string) {
    onChange(proximo);
    setAberto(false);
  }

  function NumeroDaSemana({ week, ...props }: WeekNumberProps) {
    const valor = semanaIso(week.days[0].date);
    return (
      <th {...props}>
        <button
          type="button"
          aria-label={t("weekValue", { week: week.weekNumber, year: valor.slice(0, 4) })}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-lg text-xs tabular-nums transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            valor === value && "font-semibold text-primary",
          )}
          onClick={() => escolher(valor)}
        >
          {week.weekNumber}
        </button>
      </th>
    );
  }

  return (
    <Popover.Root open={aberto} onOpenChange={setAberto}>
      <Popover.Trigger
        aria-label={`${label}: ${texto}`}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm outline-none transition-colors focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/40",
          !selecionada && "text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">{texto}</span>
        <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="start" sideOffset={4} className="z-[70] outline-none">
          <Popover.Popup aria-label={label} className="popover-enter rounded-xl border border-border bg-card p-1.5 text-card-foreground shadow-lg outline-none">
            <Calendar
              showWeekNumber
              ISOWeek
              defaultMonth={selecionada?.segunda}
              modifiers={selecionada ? { semana: { from: selecionada.segunda, to: selecionada.domingo }, inicioSemana: selecionada.segunda, fimSemana: selecionada.domingo } : undefined}
              modifiersClassNames={{
                semana: "bg-primary text-primary-foreground [&>button]:hover:bg-primary-foreground/15",
                inicioSemana: "rounded-l-lg",
                fimSemana: "rounded-r-lg",
              }}
              classNames={{
                week_number_header: "w-8 select-none text-[0.8rem] font-normal text-muted-foreground",
                week_number: "size-8 p-0 font-normal text-muted-foreground",
              }}
              components={{ WeekNumber: NumeroDaSemana }}
              onDayClick={(dia) => escolher(semanaIso(dia))}
              autoFocus
            />
            <div className="flex justify-between border-t border-border px-1 pt-1.5">
              <button type="button" className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary" onClick={() => escolher("")}>
                {t("clearFilters")}
              </button>
              <button type="button" className="rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-secondary" onClick={() => escolher(semanaIso(new Date()))}>
                {t("thisWeek")}
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
