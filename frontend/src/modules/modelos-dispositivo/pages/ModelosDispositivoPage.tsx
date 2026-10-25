import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Power, PowerOff, SearchX, Smartphone } from "lucide-react";

import type { PerfilAtual } from "@/core/auth/api";
import { formatDate } from "@/core/i18n/format";
import { toast } from "@/shared/lib/toast";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Dialog, DrawerContent, DrawerHeader, DrawerTitle } from "@/shared/ui/dialog";
import { DEFAULT_TABLE_PAGE_SIZE, Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeader, TableLayout, TablePagination, TableRow } from "@/shared/ui/table";
import { TableColumnFilter } from "@/shared/ui/table-column-filter";
import { TableRowActions } from "@/shared/ui/table-row-actions";

import { ModeloDispositivoForm } from "../components/ModeloDispositivoForm";
import { useDefinirAtivoModeloDispositivo, useModelosDispositivoList } from "../hooks/useModelosDispositivo";
import type { ModeloDispositivo, ModeloDispositivoFiltros } from "../model/modelo-dispositivo";

const PERMISSAO_GERENCIAR_MODELOS = "modelos_dispositivo.gerenciar";

function podeGerenciarModelos(perfil: PerfilAtual) {
  return perfil.perfil_codigo === "ADMIN_UNIDADE" || perfil.permissoes.includes(PERMISSAO_GERENCIAR_MODELOS);
}

const formatarData = (valor: string | null) => (valor ? formatDate(valor) : "—");

export function ModelosDispositivoPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const podeGerenciar = podeGerenciarModelos(perfil);
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtros, setFiltros] = useState<ModeloDispositivoFiltros>({});
  // undefined: drawer fechado; null: criando; modelo: editando.
  const [emEdicao, setEmEdicao] = useState<ModeloDispositivo | null | undefined>(undefined);
  const [paraInativar, setParaInativar] = useState<ModeloDispositivo | null>(null);
  const modelos = useModelosDispositivoList(pagina, tamanho, filtros, podeGerenciar);
  const definirAtivo = useDefinirAtivoModeloDispositivo();
  const totalPaginas = Math.max(1, Math.ceil((modelos.data?.total_count ?? 0) / tamanho));
  // Inativar o último item de uma página filtrada encolhe a lista: volta para a última página que existe.
  useEffect(() => { if (modelos.data && pagina > totalPaginas) setPagina(totalPaginas); }, [modelos.data, pagina, totalPaginas]);

  if (!podeGerenciar) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;

  const itens = modelos.data?.items ?? [];
  const temFiltro = Boolean(filtros.busca) || filtros.ativo !== undefined;
  const filtrar = (novo: ModeloDispositivoFiltros) => { setPagina(1); setFiltros((atual) => ({ ...atual, ...novo })); };
  const alterarAtivo = (modelo: ModeloDispositivo, ativo: boolean) => definirAtivo.mutate({ id: modelo.id, ativo }, {
    onSuccess: () => { setParaInativar(null); toast.success(t(ativo ? "deviceModelActivated" : "deviceModelDeactivated", { name: modelo.nome })); },
    onError: () => toast.error(t("deviceModelSaveError")),
  });

  return <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[42px] border border-[#EEEEF1] bg-card px-7 py-8 sm:px-11 sm:py-10">
    <header className="mb-7 flex shrink-0 items-center justify-between gap-4">
      <h1 className="text-2xl font-medium text-primary">{t("deviceModels")}</h1>
      <Button onClick={() => setEmEdicao(null)}><Plus aria-hidden="true" className="size-4" />{t("addDeviceModel")}</Button>
    </header>
    <TableLayout>
      <Table containerClassName={itens.length ? "thin-scroll min-h-0 flex-1 overflow-auto" : "shrink-0 overflow-visible"}>
        <TableHeader><TableRow>
          <TableHead><TableColumnFilter label={t("deviceModelName")} value={filtros.busca ?? ""} placeholder={t("searchDeviceModel")} onChange={(value) => filtrar({ busca: value || undefined })} /></TableHead>
          <TableHead>{t("description")}</TableHead>
          <TableHead><TableColumnFilter label={t("status")} value={filtros.ativo === undefined ? "" : String(filtros.ativo)} onChange={(value) => filtrar({ ativo: value === "" ? undefined : value === "true" })} options={[{ value: "", label: t("all") }, { value: "true", label: t("active") }, { value: "false", label: t("inactive") }]} /></TableHead>
          <TableHead>{t("createdAt")}</TableHead>
          <TableHead>{t("updatedAt")}</TableHead>
          <TableHead className="text-right">{t("actions")}</TableHead>
        </TableRow></TableHeader>
        {itens.length ? <TableBody>{itens.map((modelo) => <TableRow key={modelo.id}>
          <TableCell className="font-medium text-foreground">{modelo.nome}</TableCell>
          <TableCell className="text-muted-foreground">{modelo.descricao ?? "—"}</TableCell>
          <TableCell><Badge variant="secondary" className={modelo.ativo ? "rounded-md bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700" : "rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground"}>{modelo.ativo ? t("active") : t("inactive")}</Badge></TableCell>
          <TableCell className="text-muted-foreground tabular-nums">{formatarData(modelo.created_at)}</TableCell>
          <TableCell className="text-muted-foreground tabular-nums">{formatarData(modelo.updated_at)}</TableCell>
          <TableCell className="text-right"><TableRowActions label={modelo.nome} actions={[
            { label: t("edit"), icon: Pencil, onSelect: () => setEmEdicao(modelo) },
            modelo.ativo
              ? { label: t("inactivate"), icon: PowerOff, destructive: true, onSelect: () => setParaInativar(modelo) }
              : { label: t("activate"), icon: Power, disabled: definirAtivo.isPending, onSelect: () => alterarAtivo(modelo, true) },
          ]} /></TableCell>
        </TableRow>)}</TableBody> : null}
      </Table>
      {!itens.length && <TableEmptyState>
        {modelos.isLoading ? <p role="status">{t("loadingDeviceModels")}</p>
          : modelos.isError ? <p role="alert" className="text-destructive">{t("deviceModelsLoadError")}</p>
          : <div role="status" className="w-full max-w-md px-4 text-center">
            <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              {temFiltro ? <SearchX aria-hidden="true" className="size-5" /> : <Smartphone aria-hidden="true" className="size-5" />}
            </div>
            <h2 className="text-base font-semibold text-foreground">{temFiltro ? t("noResults") : t("noDeviceModelsYet")}</h2>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-muted-foreground">{temFiltro ? t("noDeviceModelsResults") : t("noDeviceModelsHint")}</p>
            {temFiltro && <Button variant="outline" size="sm" className="mt-5" onClick={() => { setPagina(1); setFiltros({}); }}>{t("clearFilters")}</Button>}
          </div>}
      </TableEmptyState>}
      <TablePagination page={pagina} pageSize={tamanho} totalCount={modelos.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }} />
    </TableLayout>
    <Dialog open={emEdicao !== undefined} onOpenChange={(open) => { if (!open) setEmEdicao(undefined); }}>
      <DrawerContent>
        <DrawerHeader><DrawerTitle>{emEdicao ? t("editDeviceModel") : t("addDeviceModel")}</DrawerTitle></DrawerHeader>
        {emEdicao !== undefined && <ModeloDispositivoForm key={emEdicao?.id ?? "novo"} modelo={emEdicao ?? undefined} onSalvo={() => { setEmEdicao(undefined); toast.success(t("deviceModelSaved")); }} />}
      </DrawerContent>
    </Dialog>
    <ConfirmDialog
      open={Boolean(paraInativar)}
      onOpenChange={(open) => { if (!open && !definirAtivo.isPending) setParaInativar(null); }}
      title={t("inactivateDeviceModelTitle")}
      description={t("inactivateDeviceModelDescription", { name: paraInativar?.nome ?? "" })}
      confirmLabel={t("inactivate")}
      variant="destructive"
      isPending={definirAtivo.isPending}
      onConfirm={() => { if (paraInativar) alterarAtivo(paraInativar, false); }}
    />
  </section>;
}
