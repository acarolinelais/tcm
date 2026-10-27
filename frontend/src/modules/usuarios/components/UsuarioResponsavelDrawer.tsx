import { useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "@/shared/lib/toast";
import { Button } from "@/shared/ui/button";
import { Dialog, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { SELECT_EMPTY_VALUE, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

import { useAtribuirResponsavel } from "../hooks/useUsuarios";
import type { Usuario } from "../model/usuario";

/** Painel para trocar o gerente responsável de um usuário; `usuario` nulo mantém o painel fechado. */
export function UsuarioResponsavelDrawer({ usuario, gerentes, onFechar }: { usuario: Usuario | null; gerentes: Usuario[]; onFechar: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={Boolean(usuario)} onOpenChange={(open) => { if (!open) onFechar(); }}>
      <DrawerContent>
        <DrawerHeader><DrawerTitle>{t("ownerFor", { name: usuario?.nome ?? "" })}</DrawerTitle></DrawerHeader>
        {/* key pelo usuário: cada abertura começa no responsável atual dele. */}
        {usuario && <FormularioResponsavel key={usuario.id} usuario={usuario} gerentes={gerentes} onSalvo={onFechar} />}
      </DrawerContent>
    </Dialog>
  );
}

function FormularioResponsavel({ usuario, gerentes, onSalvo }: { usuario: Usuario; gerentes: Usuario[]; onSalvo: () => void }) {
  const { t } = useTranslation();
  const [responsavelId, setResponsavelId] = useState(usuario.responsavel_id ?? "");
  const atribuirResponsavel = useAtribuirResponsavel();
  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={async (event) => {
      event.preventDefault();
      try {
        await atribuirResponsavel.mutateAsync({ id: usuario.id, responsavelId: responsavelId || null });
        toast.success(t("ownerUpdated"));
        onSalvo();
      } catch {
        toast.error(t("ownerUpdateError"));
      }
    }}>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-7 py-6">
        <div className="flex flex-col">
          <Label htmlFor={`responsavel-${usuario.id}`}>{t("managerOwner")}</Label>
          <Select value={responsavelId} onValueChange={(value) => setResponsavelId(value === SELECT_EMPTY_VALUE ? "" : value)}>
            <SelectTrigger id={`responsavel-${usuario.id}`} aria-describedby={`responsavel-hint-${usuario.id}`} className="mt-2.5 h-11 rounded-xl px-3.5">
              <SelectValue placeholder={t("noOwner")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_EMPTY_VALUE}>{t("noOwner")}</SelectItem>
              {gerentes.filter((gerente) => gerente.ativo).map((gerente) => <SelectItem key={gerente.id} value={gerente.id}>{gerente.nome} · {gerente.email}</SelectItem>)}
            </SelectContent>
          </Select>
          <p id={`responsavel-hint-${usuario.id}`} className="mt-1.5 text-xs leading-5 text-muted-foreground">{t("managerOwnerHint")}</p>
        </div>
      </div>
      <div className="flex shrink-0 justify-end border-t border-border bg-white px-7 py-5">
        <div className="flex gap-2">
          <DrawerClose asChild><Button type="button" variant="outline">{t("cancel")}</Button></DrawerClose>
          <Button type="submit" disabled={atribuirResponsavel.isPending}>{atribuirResponsavel.isPending ? t("saving") : t("save")}</Button>
        </div>
      </div>
    </form>
  );
}
