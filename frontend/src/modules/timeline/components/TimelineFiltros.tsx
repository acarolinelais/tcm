import type { ComponentProps } from "react";
import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { FiltrosPopover } from "@/shared/ui/filtros-popover";
import { MultiSelectCombobox } from "@/shared/ui/multi-select-combobox";

import type { FiltrosTimeline } from "../model/timeline";

type Opcoes = ComponentProps<typeof MultiSelectCombobox>["options"];

/** Filtros da Timeline (spec 054, RN-07) no botão Filter do protótipo (spec 057). O estado fica com a página. */
export function TimelineFiltros({ opcoesPessoas, opcoesCasos, filtros, onAlterar, onLimpar }: {
  opcoesPessoas: Opcoes;
  opcoesCasos: Opcoes;
  filtros: FiltrosTimeline;
  onAlterar: (filtros: FiltrosTimeline) => void;
  onLimpar: () => void;
}) {
  const { t } = useTranslation();
  const ativos = Number(filtros.responsavelIds.length > 0) + Number(filtros.casoIds.length > 0);
  const comum = { emptyLabel: t("noResults"), removeLabel: (nome: string) => t("removeSelectedModel", { name: nome }) };

  return (
    <FiltrosPopover ativos={ativos} rotuloDoPainel={t("timelineFilters")}>
      <MultiSelectCombobox
        {...comum}
        label={t("timelinePeople")}
        placeholder={t("timelinePeoplePlaceholder")}
        options={opcoesPessoas}
        value={filtros.responsavelIds}
        onValueChange={(responsavelIds) => onAlterar({ ...filtros, responsavelIds })}
      />
      <MultiSelectCombobox
        {...comum}
        label={t("timelineCases")}
        placeholder={t("timelineCasesPlaceholder")}
        options={opcoesCasos}
        value={filtros.casoIds}
        onValueChange={(casoIds) => onAlterar({ ...filtros, casoIds })}
      />
      {ativos > 0 && <Button variant="ghost" size="sm" onPress={onLimpar} className="mt-1 justify-self-start text-accent-text">{t("clearFilters")}</Button>}
    </FiltrosPopover>
  );
}
