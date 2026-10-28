import { useState } from "react";
import { Button } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/shared/api/problem-details";
import { toast } from "@/shared/lib/toast";
import { AlertConfirm } from "@/shared/ui/alert-confirm";
import { SelectField, TextInputField } from "@/shared/ui/form-field";
import { DrawerFormActions, SideDrawer } from "@/shared/ui/side-drawer";
import type { Usuario } from "@/modules/usuarios/model/usuario";
import { setoresApi, type Setor } from "../api/setores.api";

/** Painel de editar o nome do setor e associar ou remover gerentes. */
export function EditarSetorDrawer({ setor, onFechar, gerentes, nomes }: {
  setor: Setor | null;
  onFechar: () => void;
  /** Usuários com perfil de gerente na unidade. */
  gerentes: Usuario[];
  nomes: Map<string, string>;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [nome, setNome] = useState(setor?.nome ?? "");
  const [erroNome, setErroNome] = useState("");
  const [gerente, setGerente] = useState("");
  const [gerenteParaRemover, setGerenteParaRemover] = useState<string | null>(null);
  // Cada abertura começa com o nome salvo, mesmo reabrindo o mesmo setor depois de cancelar; ao fechar, o
  // conteúdo fica até a animação de saída terminar.
  const [exibido, setExibido] = useState(setor);
  const [anterior, setAnterior] = useState(setor);
  if (setor !== anterior) {
    setAnterior(setor);
    if (setor) {
      setExibido(setor);
      setNome(setor.nome);
      setErroNome("");
      setGerente("");
    }
  }
  const associados = useQuery({ queryKey: ["setor-gerentes", exibido?.id], queryFn: () => setoresApi.gerentes(exibido!.id), enabled: Boolean(exibido) });
  const invalidarGerentes = () => client.invalidateQueries({ queryKey: ["setor-gerentes", exibido?.id] });
  const renomear = useMutation({
    mutationFn: () => setoresApi.atualizar(exibido!.id, { nome: nome.trim() }),
    onSuccess: async () => { onFechar(); await client.invalidateQueries({ queryKey: ["setores"] }); toast.success(t("sectorUpdateSuccess")); },
    onError: () => toast.error(t("sectorUpdateError")),
  });
  const vincular = useMutation({
    mutationFn: () => setoresApi.associar(exibido!.id, gerente),
    onSuccess: async () => { setGerente(""); await invalidarGerentes(); toast.success(t("associateSuccess")); },
    onError: (error) => {
      const detail = error instanceof ApiError ? error.problem.detail?.toLowerCase() : undefined;
      toast.error(detail?.includes("já associado") || detail?.includes("already associated") ? t("managerAlreadyAssociated") : t("associationError"));
    },
  });
  const desvincular = useMutation({
    mutationFn: (id: string) => setoresApi.desassociar(exibido!.id, id),
    onSuccess: async () => { setGerenteParaRemover(null); await invalidarGerentes(); toast.success(t("associationRemoveSuccess")); },
    onError: () => toast.error(t("associationError")),
  });
  const ativos = (associados.data ?? []).filter((vinculo) => vinculo.ativo).map((vinculo) => vinculo.usuario_id);

  function enviar() {
    if (!nome.trim()) return setErroNome(t("requiredField"));
    renomear.mutate();
  }

  return <>
    <SideDrawer
      isPending={renomear.isPending}
      isOpen={Boolean(setor)}
      onOpenChange={(open) => { if (!open) onFechar(); }}
      title={`${t("sector")}: ${exibido?.nome ?? ""}`}
      onSubmit={enviar}
      footer={<DrawerFormActions pendingLabel={t("saving")} onCancel={onFechar} submitLabel={t("save")} isPending={renomear.isPending} />}
    >
      <div className="space-y-6 px-7 py-6">
        <TextInputField label={t("sectorName")} value={nome} onChange={(valor) => { setNome(valor); setErroNome(""); }} error={erroNome} isRequired maxLength={150} />
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <SelectField
              label={t("selectManager")}
              value={gerente}
              onChange={setGerente}
              emptyOption={t("selectManager")}
              description={t("managerSelectHint")}
              options={gerentes.filter((usuario) => !ativos.includes(usuario.id)).map((usuario) => ({ value: usuario.id, label: `${usuario.nome} · ${usuario.email}` }))}
            />
          </div>
          {/* Alinha com a lista, abaixo do rótulo (14px de texto + 8px de espaço). */}
          <Button variant="outline" className="mt-[30px] h-10" isDisabled={!gerente} isPending={vincular.isPending} onPress={() => vincular.mutate()}>{t("associate")}</Button>
        </div>
        <ul aria-label={t("managers")} className="space-y-2">
          {(associados.data ?? []).map((vinculo) => (
            <li key={vinculo.usuario_id} className="flex items-center justify-between rounded-xl border border-separator px-4 py-3 text-[14px] text-[#454442]">
              <span>{nomes.get(vinculo.usuario_id) ?? vinculo.usuario_id}{vinculo.ativo ? "" : ` · ${t("inactive").toLowerCase()}`}</span>
              {vinculo.ativo && <Button variant="ghost" size="sm" aria-label={`${t("remove")} ${nomes.get(vinculo.usuario_id) ?? vinculo.usuario_id}`} onPress={() => setGerenteParaRemover(vinculo.usuario_id)}>{t("remove")}</Button>}
            </li>
          ))}
        </ul>
      </div>
    </SideDrawer>
    <AlertConfirm
      open={Boolean(gerenteParaRemover)}
      onOpenChange={(open) => { if (!open && !desvincular.isPending) setGerenteParaRemover(null); }}
      title={t("removeManagerTitle")}
      description={t("removeManagerDescription", { name: gerenteParaRemover ? nomes.get(gerenteParaRemover) ?? gerenteParaRemover : "", sector: exibido?.nome ?? "" })}
      confirmLabel={t("remove")}
      variant="destructive"
      isPending={desvincular.isPending}
      onConfirm={() => { if (gerenteParaRemover) desvincular.mutate(gerenteParaRemover); }}
    />
  </>;
}
