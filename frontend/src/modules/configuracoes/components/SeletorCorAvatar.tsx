import { Radio, RadioGroup } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { atualizarCorAvatar, CORES_AVATAR, type CorAvatar, type PerfilAtual } from "@/core/auth/api";
import { perfilAtualQueryKey } from "@/core/auth/usePerfilAtual";
import { CLASSES_COR_AVATAR, NOME_COR_AVATAR } from "@/shared/lib/cor-avatar";
import { cn } from "@/shared/lib/utils";
import { toast } from "@/shared/lib/toast";

/** Paleta da cor do avatar (spec 036). Grava ao escolher, como o idioma; em falha, volta para a cor salva. */
export function SeletorCorAvatar({ perfil, labelledBy }: { perfil: PerfilAtual; labelledBy: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  async function selecionar(cor: CorAvatar) {
    if (cor === perfil.cor_avatar) return;
    const queryKey = perfilAtualQueryKey();
    const perfilEmCache = queryClient.getQueryData<PerfilAtual>(queryKey);
    queryClient.setQueryData<PerfilAtual>(queryKey, (atual) => atual ? { ...atual, cor_avatar: cor } : atual);
    try {
      await atualizarCorAvatar(cor);
    } catch {
      if (perfilEmCache) queryClient.setQueryData(queryKey, perfilEmCache);
      toast.error(t("avatarColorSaveError"));
    }
  }

  return (
    <RadioGroup aria-labelledby={labelledBy} orientation="horizontal" value={perfil.cor_avatar} onChange={(cor) => void selecionar(cor as CorAvatar)} className="gap-2">
      {CORES_AVATAR.map((cor) => (
        <Radio key={cor} value={cor} aria-label={t(NOME_COR_AVATAR[cor])} className="mt-0">
          <Radio.Content className="cursor-pointer rounded-full outline-none data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-ring data-[focus-visible=true]:ring-offset-2 data-[focus-visible=true]:ring-offset-background">
            {({ isSelected }) => (
              <span
                aria-hidden="true"
                className={cn(
                  "block size-7 rounded-full ring-offset-2 ring-offset-background transition-shadow",
                  CLASSES_COR_AVATAR[cor],
                  isSelected ? "ring-2 ring-foreground" : "hover:ring-2 hover:ring-border",
                )}
              />
            )}
          </Radio.Content>
        </Radio>
      ))}
    </RadioGroup>
  );
}
