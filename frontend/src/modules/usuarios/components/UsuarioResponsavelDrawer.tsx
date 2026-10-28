import { useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "@/shared/lib/toast";
import { SelectField } from "@/shared/ui/form-field";
import { DrawerFormActions, SideDrawer } from "@/shared/ui/side-drawer";

import { useAtribuirResponsavel } from "../hooks/useUsuarios";
import type { Usuario } from "../model/usuario";

/** Painel para trocar o gerente responsável de um usuário; `usuario` nulo mantém o painel fechado. */
export function UsuarioResponsavelDrawer({ usuario, gerentes, onFechar }: { usuario: Usuario | null; gerentes: Usuario[]; onFechar: () => void }) {
  const { t } = useTranslation();
  const atribuirResponsavel = useAtribuirResponsavel();
  const [responsavelId, setResponsavelId] = useState(usuario?.responsavel_id ?? "");
  // Cada abertura começa no responsável atual, mesmo reabrindo o mesmo usuário depois de cancelar; ao fechar,
  // o conteúdo fica até a animação de saída terminar.
  const [exibido, setExibido] = useState(usuario);
  const [anterior, setAnterior] = useState(usuario);
  if (usuario !== anterior) {
    setAnterior(usuario);
    if (usuario) {
      setExibido(usuario);
      setResponsavelId(usuario.responsavel_id ?? "");
    }
  }

  async function salvar() {
    if (!exibido) return;
    try {
      await atribuirResponsavel.mutateAsync({ id: exibido.id, responsavelId: responsavelId || null });
      toast.success(t("ownerUpdated"));
      onFechar();
    } catch {
      toast.error(t("ownerUpdateError"));
    }
  }

  return (
    <SideDrawer
      isPending={atribuirResponsavel.isPending}
      isOpen={Boolean(usuario)}
      onOpenChange={(open) => { if (!open) onFechar(); }}
      title={t("ownerFor", { name: exibido?.nome ?? "" })}
      onSubmit={() => void salvar()}
      footer={<DrawerFormActions pendingLabel={t("saving")} onCancel={onFechar} submitLabel={t("save")} isPending={atribuirResponsavel.isPending} />}
    >
      <div className="space-y-6 px-7 py-6">
        <SelectField
          label={t("managerOwner")}
          value={responsavelId}
          onChange={setResponsavelId}
          emptyOption={t("noOwner")}
          description={t("managerOwnerHint")}
          // O responsável atual inativo continua visível e marcado, mas não pode ser escolhido de novo.
          options={gerentes.filter((gerente) => gerente.ativo || gerente.id === exibido?.responsavel_id).map((gerente) => ({ value: gerente.id, label: `${gerente.nome} · ${gerente.email}`, isDisabled: !gerente.ativo }))}
        />
      </div>
    </SideDrawer>
  );
}
