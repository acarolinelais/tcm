import { Tooltip } from "@heroui/react";

import type { CorAvatar } from "@/core/auth/api";
import { AvatarUsuario } from "@/shared/ui/avatar-usuario";

const VISIVEIS = 5;

/** Até 5 avatares sobrepostos e "+N" (spec 054, RN-08; também no Board, spec 056). Os textos de acessibilidade vêm de quem usa. */
export function PilhaAvatares({ pessoas, rotulo, rotuloMais }: {
  pessoas: { id: string; nome: string; cor_avatar: CorAvatar }[];
  rotulo: string;
  rotuloMais: (quantidade: number) => string;
}) {
  if (!pessoas.length) return null;
  const resto = pessoas.slice(VISIVEIS);
  return <ul aria-label={rotulo} className="flex items-center -space-x-2">
    {pessoas.slice(0, VISIVEIS).map((pessoa) => <li key={pessoa.id} className="relative">
      <Tooltip delay={200} closeDelay={0}>
        {/* O anel na cor do fundo recorta o avatar de baixo; o li relative faz cada item pintar por cima do anterior, já que o Avatar do HeroUI é posicionado. */}
        <Tooltip.Trigger aria-label={pessoa.nome} className="flex rounded-full outline-none ring-4 ring-surface data-[focus-visible]:ring-focus">
          <AvatarUsuario cor={pessoa.cor_avatar} className="size-8" />
        </Tooltip.Trigger>
        <Tooltip.Content className="text-[12px]">{pessoa.nome}</Tooltip.Content>
      </Tooltip>
    </li>)}
    {resto.length > 0 && <li className="relative">
      <Tooltip delay={200} closeDelay={0}>
        <Tooltip.Trigger
          aria-label={rotuloMais(resto.length)}
          className="flex size-8 items-center justify-center rounded-full bg-panel text-[11px] font-medium text-body outline-none ring-4 ring-surface data-[focus-visible]:ring-focus"
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
