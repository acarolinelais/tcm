import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { Link, useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, Dialog } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeader, TableLayout, TableRow } from "@/shared/ui/table";
import { toast } from "@/shared/lib/toast";

import { modelosDispositivoApi, type ModeloDispositivo } from "./api/projetos.api";

export function ModelosDispositivoPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const client = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [modeloEditando, setModeloEditando] = useState<ModeloDispositivo | null>(null);
  const [nome, setNome] = useState("");
  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const podeGerenciar = admin || perfil.permissoes.includes("projetos.gerenciar");
  const modelos = useQuery({ queryKey: ["modelos-dispositivo", "todos"], queryFn: () => modelosDispositivoApi.listar(1, 100), enabled: podeGerenciar });
  const salvar = useMutation({
    mutationFn: () => modeloEditando ? modelosDispositivoApi.atualizar(modeloEditando.id, { nome: nome.trim() }) : modelosDispositivoApi.criar(nome.trim()),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["modelos-dispositivo"] }); setAberto(false); setModeloEditando(null); setNome(""); toast.success(t("deviceModelSaved", { defaultValue: "Modelo salvo." })); },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("deviceModelSaveError", { defaultValue: "Não foi possível salvar o modelo." })),
  });
  const alterarAtivo = useMutation({
    mutationFn: ({ model, ativo }: { model: ModeloDispositivo; ativo: boolean }) => modelosDispositivoApi.definirAtivo(model.id, ativo),
    onSuccess: () => client.invalidateQueries({ queryKey: ["modelos-dispositivo"] }),
    onError: (error) => toast.error(error instanceof Error ? error.message : t("deviceModelSaveError", { defaultValue: "Não foi possível alterar o modelo." })),
  });

  if (!podeGerenciar) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;

  return <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[42px] border border-[#EEEEF1] bg-card px-7 py-8 sm:px-11 sm:py-10">
    <header className="mb-7 flex shrink-0 items-center gap-4"><Button asChild variant="outline" size="icon" aria-label={t("backToProjects")}><Link to="/projetos"><ArrowLeft aria-hidden="true" className="size-4" /></Link></Button><h1 className="flex-1 text-2xl font-medium text-primary">{t("deviceModels", { defaultValue: "Modelos de dispositivo" })}</h1><Button onClick={() => { setModeloEditando(null); setNome(""); setAberto(true); }}><Plus aria-hidden="true" className="size-4" />{t("addDeviceModel", { defaultValue: "Novo modelo" })}</Button></header>
    <TableLayout><Table containerClassName={modelos.data?.items.length ? "min-h-0 flex-1 overflow-auto" : "shrink-0 overflow-visible"}><TableHeader><TableRow><TableHead>{t("deviceModelName", { defaultValue: "Modelo" })}</TableHead><TableHead>{t("status")}</TableHead><TableHead className="text-right">{t("actions")}</TableHead></TableRow></TableHeader>{modelos.data?.items.length ? <TableBody>{modelos.data.items.map((model) => <TableRow key={model.id}><TableCell className="font-medium">{model.nome}</TableCell><TableCell><Badge variant="secondary" className={model.ativo ? "bg-emerald-50 text-emerald-700" : ""}>{model.ativo ? t("active") : t("inactive")}</Badge></TableCell><TableCell className="text-right"><div className="inline-flex gap-2"><Button variant="outline" size="sm" onClick={() => { setModeloEditando(model); setNome(model.nome); setAberto(true); }}>{t("edit")}</Button><Button variant="outline" size="sm" disabled={alterarAtivo.isPending} onClick={() => alterarAtivo.mutate({ model, ativo: !model.ativo })}>{model.ativo ? t("inactivate") : t("activate")}</Button></div></TableCell></TableRow>)}</TableBody> : null}</Table>{!modelos.isLoading && !modelos.isError && !modelos.data?.items.length && <TableEmptyState><p role="status">{t("noDeviceModels", { defaultValue: "Nenhum modelo cadastrado." })}</p></TableEmptyState>}{modelos.isLoading && <p role="status" className="p-5 text-sm text-muted-foreground">{t("loadingDeviceModels")}</p>}{modelos.isError && <p role="alert" className="p-5 text-sm text-destructive">{t("deviceModelsLoadError", { defaultValue: "Não foi possível carregar os modelos." })}</p>}</TableLayout>
    <Dialog open={aberto} onOpenChange={(open) => { setAberto(open); if (!open) { setModeloEditando(null); setNome(""); } }}><DrawerContent><DrawerHeader><DrawerTitle>{modeloEditando ? t("editDeviceModel", { defaultValue: "Editar modelo" }) : t("addDeviceModel", { defaultValue: "Novo modelo" })}</DrawerTitle></DrawerHeader><form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); salvar.mutate(); }}><div className="flex-1 px-7 py-6"><div className="grid gap-2"><Label htmlFor="device-model-name">{t("deviceModelName", { defaultValue: "Nome do modelo" })}</Label><Input id="device-model-name" value={nome} onChange={(event) => setNome(event.target.value)} maxLength={120} required /></div></div><div className="flex justify-end gap-2 border-t border-border px-7 py-5"><DrawerClose asChild><Button type="button" variant="outline">{t("cancel")}</Button></DrawerClose><Button type="submit" disabled={!nome.trim() || salvar.isPending}>{salvar.isPending ? t("saving") : t("save")}</Button></div></form></DrawerContent></Dialog>
  </section>;
}
