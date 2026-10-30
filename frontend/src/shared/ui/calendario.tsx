import { useCallback, useLayoutEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type ChevronProps, type WeekNumberProps } from "react-day-picker";
import { enUS, ko, ptBR } from "react-day-picker/locale";
import { useTranslation } from "react-i18next";

import { cn, diasDaSemana, formatarDiaIso, lerDiaIso, semanaIso } from "@/shared/lib/utils";

/** `dia`: escolhe um dia. `semana`: o dia ou o número escolhem a semana ISO. `dia-ou-semana`: o dia escolhe o dia e o número, a semana. */
export type ModoCalendario = "dia" | "semana" | "dia-ou-semana";

interface CalendarioProps {
  modo: ModoCalendario;
  /** `AAAA-MM-DD` ou `AAAA-Www`, conforme o modo; vazio quando nada foi escolhido. */
  valor: string;
  onEscolher: (valor: string) => void;
}

const DIA = /^\d{4}-\d{2}-\d{2}$/;
const SEMANA = /^\d{4}-W\d{2}$/;

const botaoDia = "inline-flex size-8 items-center justify-center rounded-lg text-[13px] tabular-nums transition-colors hover:bg-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus";

function Chevron({ orientation }: ChevronProps) {
  return orientation === "left" ? <ChevronLeft aria-hidden="true" className="size-4" /> : <ChevronRight aria-hidden="true" className="size-4" />;
}

/**
 * Calendário dos filtros de data (spec 050): o `react-day-picker`, o único que já tem a coluna de semanas ISO,
 * com os tokens do tema e o idioma da pessoa. Quem o abre (Popover do HeroUI) cuida do gatilho e do Esc.
 */
export function Calendario({ modo, valor, onEscolher }: CalendarioProps) {
  const { t, i18n } = useTranslation();
  const dia = modo !== "semana" && DIA.test(valor) ? lerDiaIso(valor) : null;
  const semana = modo !== "dia" && SEMANA.test(valor) ? diasDaSemana(valor) : null;

  // Quem chama costuma passar uma função nova a cada render; pela ref, o NumeroDaSemana não muda por isso.
  const escolher = useRef(onEscolher);
  useLayoutEffect(() => {
    escolher.current = onEscolher;
  });

  // Identidade estável: o DayPicker remontaria as células a cada render se o componente mudasse.
  const NumeroDaSemana = useCallback(({ week, ...props }: WeekNumberProps) => {
    const semanaDaLinha = semanaIso(week.days[0].date);
    return (
      <th {...props}>
        <button type="button" aria-label={t("weekValue", { week: week.weekNumber, year: semanaDaLinha.slice(0, 4) })} className={cn(botaoDia, "text-[12px] text-muted", semanaDaLinha === valor && "font-semibold text-accent-text")} onClick={() => escolher.current(semanaDaLinha)}>
          {week.weekNumber}
        </button>
      </th>
    );
  }, [t, valor]);

  return (
    <DayPicker
      showOutsideDays
      showWeekNumber={modo !== "dia"}
      ISOWeek
      locale={i18n.language?.startsWith("pt") ? ptBR : i18n.language?.startsWith("ko") ? ko : enUS}
      defaultMonth={dia ?? semana?.segunda}
      // O dia escolhido é a seleção do DayPicker (aria-selected e foco inicial nele); a semana é só destaque.
      mode="single"
      selected={dia ?? undefined}
      modifiers={semana ? { semana: { from: semana.segunda, to: semana.domingo }, inicioSemana: semana.segunda, fimSemana: semana.domingo } : undefined}
      modifiersClassNames={{ semana: "bg-accent text-accent-foreground!", inicioSemana: "rounded-l-lg", fimSemana: "rounded-r-lg" }}
      classNames={{
        root: "w-fit p-2",
        months: "relative flex flex-col gap-4",
        month: "flex w-full flex-col gap-3",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(botaoDia, "text-muted"),
        button_next: cn(botaoDia, "text-muted"),
        month_caption: "flex h-8 items-center justify-center px-8",
        caption_label: "select-none text-[14px] font-medium capitalize text-body",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 select-none text-[12px] font-normal text-muted",
        week_number_header: "w-8 select-none text-[12px] font-normal text-muted",
        week_number: "size-8 p-0",
        week: "mt-1 flex w-full",
        day: "size-8 p-0 text-center",
        day_button: botaoDia,
        today: "font-semibold text-accent-text",
        // `!`: o dia de hoje também tem cor de texto, e na seleção vale a do acento (contraste sobre o azul).
        selected: "rounded-lg bg-accent text-accent-foreground!",
        outside: "text-muted/60",
        hidden: "invisible",
      }}
      components={{ WeekNumber: NumeroDaSemana, Chevron }}
      onDayClick={(clicado) => onEscolher(modo === "semana" ? semanaIso(clicado) : formatarDiaIso(clicado))}
      autoFocus
    />
  );
}
