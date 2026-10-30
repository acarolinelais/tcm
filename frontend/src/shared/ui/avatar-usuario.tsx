import { Avatar } from "@heroui/react";
import { UserRound } from "lucide-react";

import type { CorAvatar } from "@/core/auth/api";
import { CLASSES_COR_AVATAR } from "@/shared/lib/cor-avatar";
import { iniciais } from "@/shared/lib/iniciais";
import { cn } from "@/shared/lib/utils";

/** Iniciais do nome sobre a cor escolhida pela pessoa. Decorativo: quem usa mostra o nome em texto ao lado. */
export function AvatarUsuario({ nome, cor, className }: { nome: string; cor: CorAvatar; className?: string }) {
  return (
    <Avatar aria-hidden="true" className={cn("size-[21px]", className)}>
      <Avatar.Fallback className={cn("text-[11px] font-medium", CLASSES_COR_AVATAR[cor] ?? CLASSES_COR_AVATAR.azul)}>
        {iniciais(nome) || <UserRound className="size-3" strokeWidth={2} />}
      </Avatar.Fallback>
    </Avatar>
  );
}
