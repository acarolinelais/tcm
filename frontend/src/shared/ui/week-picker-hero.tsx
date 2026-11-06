import { useCallback, useState } from "react";
import { Button, Popover } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { formatDate } from "@/core/i18n/format";
import { cn, diasDaSemana, lerDiaIso, semanaIso } from "@/shared/lib/utils";
import { Calendario } from "@/shared/ui/calendario";
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

const botaoRodape = "h-7 min-h-0 rounded-lg px-3 text-[12px]";

/**
 * Filtro por semana ISO (spec 022) ou por dia ou semana (spec 032), com a pílula do Figma (TCM 2482-2966, spec 050).
 * O calendário é o compartilhado (`Calendario`); o Popover do HeroUI parte do gatilho e respeita o movimento reduzido.
 */
export function WeekPickerHero({ label, value, onChange, className, permitirDia = false }: WeekPickerHeroProps) {
  const { t } = useTranslation();
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

  return (
    <Popover isOpen={aberto} onOpenChange={setAberto}>
      <Button
        variant="outline"
        aria-label={`${label}: ${descricao}`}
        className={cn("h-9 min-h-0 gap-2.5 rounded-full border border-edge bg-surface px-4 text-[15px] font-medium leading-[21px] text-body shadow-none transition-[background-color,transform] duration-100 ease-out hover:bg-page data-[pressed]:scale-[0.97] motion-reduce:transition-none motion-reduce:data-[pressed]:scale-100 dark:text-muted", className)}
      >
        <CalendarIcon className="text-body dark:text-muted" />
        <span>{texto}</span>
        <SmallChevronIcon className={cn("text-body dark:text-muted transition-transform duration-200 motion-reduce:transition-none", aberto && "rotate-180")} />
      </Button>
      <Popover.Content placement="bottom end" className="p-1.5">
        <Popover.Dialog aria-label={label} className="outline-none">
          <Calendario modo={permitirDia ? "dia-ou-semana" : "semana"} valor={value} onEscolher={escolher} />
          <div className="flex justify-between border-t border-separator px-1 pt-1.5">
            <Button variant="ghost" className={botaoRodape} onPress={() => escolher("")}>{t("clearFilters")}</Button>
            <Button variant="ghost" className={cn(botaoRodape, "text-accent-text")} onPress={() => escolher(semanaIso(new Date()))}>{t("thisWeek")}</Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
