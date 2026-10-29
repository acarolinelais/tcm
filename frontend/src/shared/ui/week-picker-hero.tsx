import { useCallback, useState } from "react";
import { Button, Popover } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type ChevronProps, type WeekNumberProps } from "react-day-picker";
import { enUS, ko, ptBR } from "react-day-picker/locale";
import { useTranslation } from "react-i18next";

import { formatDate } from "@/core/i18n/format";
import { cn, diasDaSemana, formatarDiaIso, lerDiaIso, semanaIso } from "@/shared/lib/utils";
import { CalendarIcon, SmallChevronIcon } from "@/shared/ui/figma-icons";

interface WeekPickerHeroProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Dia ou semana (spec 032): o dia escolhe o dia (`AAAA-MM-DD`) e o número da semana, a semana ISO. */
  permitirDia?: boolean;
}

const DIA = /^\d{4}-\d{2}-\d{2}$/;

const botaoDia = "inline-flex size-8 items-center justify-center rounded-lg text-[13px] tabular-nums transition-colors hover:bg-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus";
const botaoRodape = "h-7 min-h-0 rounded-lg px-3 text-[12px]";

function Chevron({ orientation }: ChevronProps) {
  return orientation === "left" ? <ChevronLeft aria-hidden="true" className="size-4" /> : <ChevronRight aria-hidden="true" className="size-4" />;
}

/**
 * Filtro por semana ISO (spec 022) com o botão do Figma (TCM 2070:1476). O calendário é o `react-day-picker`,
 * o único que já seleciona a semana ISO; ele vive no Popover do HeroUI, sem o invólucro do shadcn.
 */
export function WeekPickerHero({ label, value, onChange, className, permitirDia = false }: WeekPickerHeroProps) {
  const { t, i18n } = useTranslation();
  const [aberto, setAberto] = useState(false);
  const dia = permitirDia && DIA.test(value) ? lerDiaIso(value) : null;
  const selecionada = value && !dia ? diasDaSemana(value) : null;
  const diaFormatado = dia ? formatDate(dia, { dateStyle: "medium" }) : "";
  const vazio = permitirDia ? label : t("week");
  const texto = dia ? diaFormatado : selecionada ? `${t("week")} ${selecionada.semana}` : vazio;
  const descricao = dia ? diaFormatado : selecionada ? t("weekValue", { week: selecionada.semana, year: selecionada.ano }) : t(permitirDia ? "selectDayOrWeek" : "selectWeek");

  const escolher = useCallback((proximo: string) => {
    onChange(proximo);
    setAberto(false);
  }, [onChange]);

  // Identidade estável: o DayPicker remontaria as células a cada render se o componente mudasse.
  const NumeroDaSemana = useCallback(({ week, ...props }: WeekNumberProps) => {
    const valor = semanaIso(week.days[0].date);
    return (
      <th {...props}>
        <button type="button" aria-label={t("weekValue", { week: week.weekNumber, year: valor.slice(0, 4) })} className={cn(botaoDia, "text-[12px] text-muted", valor === value && "font-semibold text-accent")} onClick={() => escolher(valor)}>
          {week.weekNumber}
        </button>
      </th>
    );
  }, [escolher, t, value]);

  return (
    <Popover isOpen={aberto} onOpenChange={setAberto}>
      <Button
        variant="outline"
        aria-label={`${label}: ${descricao}`}
        className={cn("h-9 min-h-0 gap-2.5 rounded-[10px] border border-[#F2F2F2] bg-white px-3.5 text-[15px] font-medium leading-[21px] text-[#454442] shadow-none hover:bg-[#FBFBFB]", className)}
      >
        <CalendarIcon className="text-[#454442]" />
        <span>{texto}</span>
        <SmallChevronIcon className={cn("text-[#454442] transition-transform duration-200 motion-reduce:transition-none", aberto && "rotate-180")} />
      </Button>
      <Popover.Content placement="bottom end" className="p-1.5">
        <Popover.Dialog aria-label={label} className="outline-none">
          <DayPicker
            showOutsideDays
            showWeekNumber
            ISOWeek
            locale={i18n.language?.startsWith("pt") ? ptBR : i18n.language?.startsWith("ko") ? ko : enUS}
            defaultMonth={dia ?? selecionada?.segunda}
            modifiers={dia ? { diaEscolhido: dia } : selecionada ? { semana: { from: selecionada.segunda, to: selecionada.domingo }, inicioSemana: selecionada.segunda, fimSemana: selecionada.domingo } : undefined}
            modifiersClassNames={{ semana: "bg-accent text-accent-foreground", inicioSemana: "rounded-l-lg", fimSemana: "rounded-r-lg", diaEscolhido: "rounded-lg bg-accent text-accent-foreground" }}
            classNames={{
              root: "w-fit p-2",
              months: "relative flex flex-col gap-4",
              month: "flex w-full flex-col gap-3",
              nav: "absolute inset-x-0 top-0 flex items-center justify-between",
              button_previous: cn(botaoDia, "text-muted"),
              button_next: cn(botaoDia, "text-muted"),
              month_caption: "flex h-8 items-center justify-center px-8",
              caption_label: "select-none text-[14px] font-medium capitalize text-[#454442]",
              month_grid: "w-full border-collapse",
              weekdays: "flex",
              weekday: "w-8 select-none text-[12px] font-normal text-muted",
              week_number_header: "w-8 select-none text-[12px] font-normal text-muted",
              week_number: "size-8 p-0",
              week: "mt-1 flex w-full",
              day: "size-8 p-0 text-center",
              day_button: botaoDia,
              today: "font-semibold text-accent",
              outside: "text-muted/60",
              hidden: "invisible",
            }}
            components={{ WeekNumber: NumeroDaSemana, Chevron }}
            onDayClick={(clicado) => escolher(permitirDia ? formatarDiaIso(clicado) : semanaIso(clicado))}
            autoFocus
          />
          <div className="flex justify-between border-t border-separator px-1 pt-1.5">
            <Button variant="ghost" className={botaoRodape} onPress={() => escolher("")}>{t("clearFilters")}</Button>
            <Button variant="ghost" className={cn(botaoRodape, "text-accent")} onPress={() => escolher(semanaIso(new Date()))}>{t("thisWeek")}</Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
