import { Avatar } from "@heroui/react";

import type { CorAvatar } from "@/core/auth/api";
import { AVATAR_POR_COR } from "@/shared/lib/cor-avatar";
import { cn } from "@/shared/lib/utils";

/** Esfera em degradê do HeroUI na cor escolhida pela pessoa (spec 036). Decorativo: quem usa mostra o nome ao lado. */
export function AvatarUsuario({ cor, className }: { cor: CorAvatar; className?: string }) {
  const { imagem, fundo } = AVATAR_POR_COR[cor] ?? AVATAR_POR_COR.azul;
  return (
    <Avatar aria-hidden="true" className={cn("size-[21px]", className)}>
      <Avatar.Image src={imagem} alt="" />
      {/* O atraso evita piscar a cor lisa enquanto a imagem carrega. */}
      <Avatar.Fallback delayMs={600} className={fundo} />
    </Avatar>
  );
}
