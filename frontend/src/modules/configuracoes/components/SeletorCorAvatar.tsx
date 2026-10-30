import { Radio, RadioGroup } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { atualizarCorAvatar, CORES_AVATAR, type CorAvatar, type PerfilAtual } from "@/core/auth/api";
import { perfilAtualQueryKey } from "@/core/auth/usePerfilAtual";
import { NOME_COR_AVATAR } from "@/shared/lib/cor-avatar";
import { cn } from "@/shared/lib/utils";
import { toast } from "@/shared/lib/toast";
import { AvatarUsuario } from "@/shared/ui/avatar-usuario";

/**
 * Paleta da cor do avatar (spec 036). Grava ao escolher. Com as setas, cada passo seleciona uma cor: as gravações vão
 * em fila, para a última escolha ser a que fica salva, e uma falha só desfaz a escolha mais recente, voltando para a
 * última cor confirmada pela API.
 */
// Fora do componente: sair e voltar para a página com gravações pendentes não abre uma segunda fila.
let filaDeGravacoes: Promise<unknown> = Promise.resolve();

export function SeletorCorAvatar({ perfil, labelledBy }: { perfil: PerfilAtual; labelledBy: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const corSalva = useRef(perfil.cor_avatar);

  function aplicar(cor: CorAvatar) {
    queryClient.setQueryData<PerfilAtual>(perfilAtualQueryKey(), (atual) => atual ? { ...atual, cor_avatar: cor } : atual);
  }

  async function selecionar(cor: CorAvatar) {
    if (cor === perfil.cor_avatar) return;
    // Um refetch do perfil em andamento traria a cor antiga por cima da escolha.
    await queryClient.cancelQueries({ queryKey: perfilAtualQueryKey() });
    aplicar(cor);
    const gravacao = filaDeGravacoes.catch(() => undefined).then(() => atualizarCorAvatar(cor));
    filaDeGravacoes = gravacao;
    try {
      corSalva.current = (await gravacao).cor_avatar;
      // A última gravação confirma o valor do servidor, mesmo que um refetch tenha passado por cima no meio da fila.
      if (filaDeGravacoes === gravacao) aplicar(corSalva.current);
    } catch {
      if (filaDeGravacoes !== gravacao) return;
      aplicar(corSalva.current);
      toast.error(t("avatarColorSaveError"));
    }
  }

  return (
    <RadioGroup aria-labelledby={labelledBy} orientation="horizontal" value={perfil.cor_avatar} onChange={(cor) => void selecionar(cor as CorAvatar)} className="gap-2">
      {CORES_AVATAR.map((cor) => (
        <Radio key={cor} value={cor} aria-label={t(NOME_COR_AVATAR[cor])} className="mt-0">
          <Radio.Content className="cursor-pointer rounded-full outline-none data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-ring data-[focus-visible=true]:ring-offset-2 data-[focus-visible=true]:ring-offset-background">
            {({ isSelected }) => (
              <AvatarUsuario
                cor={cor}
                className={cn(
                  "size-7 ring-offset-2 ring-offset-background transition-shadow",
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
