import { Tooltip } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { AvatarUsuario } from "@/shared/ui/avatar-usuario";

import type { PessoaTimeline } from "../model/timeline";

const VISIVEIS = 5;

/** Quem mudou algo no período: até 5 avatares sobrepostos e "+N" (spec 054, RN-08). */
export function PilhaAvatares({ pessoas }: { pessoas: PessoaTimeline[] }) {
  const { t } = useTranslation();
  if (!pessoas.length) return null;
  const resto = pessoas.slice(VISIVEIS);
  return <ul aria-label={t("timelinePeopleInPeriod")} className="flex items-center -space-x-2">
    {pessoas.slice(0, VISIVEIS).map((pessoa) => <li key={pessoa.id}>
      <Tooltip delay={200} closeDelay={0}>
        <Tooltip.Trigger aria-label={pessoa.nome} className="rounded-full outline-none ring-2 ring-surface data-[focus-visible]:ring-focus">
          <AvatarUsuario cor={pessoa.cor_avatar} className="size-8" />
        </Tooltip.Trigger>
        <Tooltip.Content className="text-[12px]">{pessoa.nome}</Tooltip.Content>
      </Tooltip>
    </li>)}
    {resto.length > 0 && <li>
      <Tooltip delay={200} closeDelay={0}>
        <Tooltip.Trigger
          aria-label={t("timelineMorePeople", { count: resto.length })}
          className="flex size-8 items-center justify-center rounded-full bg-panel text-[11px] font-medium text-body outline-none ring-2 ring-surface data-[focus-visible]:ring-focus"
        >
          +{resto.length}
        </Tooltip.Trigger>
        <Tooltip.Content className="max-w-64 text-[12px]">
          {resto.map((pessoa) => <span key={pessoa.id} className="block truncate">{pessoa.nome}</span>)}
        </Tooltip.Content>
      </Tooltip>
    </li>}
  </ul>;
}
