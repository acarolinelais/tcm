import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Pencil, UserRoundCheck, UserRoundX, UserRoundCog } from "lucide-react";

import type { Usuario } from "../model/usuario";
import { useAtribuirResponsavel, useAtivarUsuario, useInativarUsuario } from "../hooks/useUsuarios";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Button } from "@/shared/ui/button";
import { Dialog, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { SELECT_EMPTY_VALUE, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { toast } from "@/shared/lib/toast";
import { useTranslation } from "react-i18next";

export function UsuarioActionsMenu({
  usuario,
  onEditar,
  podeAtribuirPerfil,
  podeGerenciar,
  podeAtribuirResponsavel,
  gerentes,
}: {
  usuario: Usuario;
  onEditar: (usuario: Usuario) => void;
  podeAtribuirPerfil: boolean;
  podeGerenciar: boolean;
  podeAtribuirResponsavel: boolean;
  gerentes: Usuario[];
}) {
  const { t } = useTranslation();
  const [aberto, setAberto] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const [responsavelAberto, setResponsavelAberto] = useState(false);
  const [responsavelId, setResponsavelId] = useState(usuario.responsavel_id ?? "");
  const [posicao, setPosicao] = useState({ top: 0, right: 8 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const ativar = useAtivarUsuario();
  const inativar = useInativarUsuario();
  const atribuirResponsavel = useAtribuirResponsavel();
  const pendente = ativar.isPending || inativar.isPending;

  useEffect(() => {
    if (!aberto) return;

    function fecharSeFora(event: PointerEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setAberto(false);
      }
    }

    function fecharComEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAberto(false);
        triggerRef.current?.focus();
      }
    }

    function atualizarPosicao() {
      const bounds = triggerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const top = bounds.bottom + 94 > window.innerHeight
        ? Math.max(8, bounds.top - 94)
        : bounds.bottom + 6;
      setPosicao({ top, right: Math.max(8, window.innerWidth - bounds.right) });
    }

    atualizarPosicao();
    document.addEventListener("pointerdown", fecharSeFora);
    document.addEventListener("keydown", fecharComEscape);
    window.addEventListener("resize", atualizarPosicao);
    window.addEventListener("scroll", atualizarPosicao, true);

    return () => {
      document.removeEventListener("pointerdown", fecharSeFora);
      document.removeEventListener("keydown", fecharComEscape);
      window.removeEventListener("resize", atualizarPosicao);
      window.removeEventListener("scroll", atualizarPosicao, true);
    };
  }, [aberto]);

  function alternarAtivo() {
    if (usuario.ativo) {
      setAberto(false);
      setConfirmacaoAberta(true);
      return;
    }

    setAberto(false);
    ativar.mutate(usuario.id);
  }

  if (!podeGerenciar && !podeAtribuirPerfil && !podeAtribuirResponsavel) return null;

  return (
    <>
      <ConfirmDialog
        open={confirmacaoAberta}
        onOpenChange={setConfirmacaoAberta}
        title={t("deactivateUserQuestion")}
        description={t("deactivateUserDescription", { name: usuario.nome })}
        confirmLabel={t("deactivateUser")}
        variant="destructive"
        isPending={inativar.isPending}
        onConfirm={() => {
          inativar.mutate(usuario.id);
          setConfirmacaoAberta(false);
        }}
      />
      <Dialog open={responsavelAberto} onOpenChange={setResponsavelAberto}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>{t("ownerFor", { name: usuario.nome })}</DrawerTitle></DrawerHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={async (event) => {
            event.preventDefault();
            try {
              await atribuirResponsavel.mutateAsync({ id: usuario.id, responsavelId: responsavelId || null });
              toast.success(t("ownerUpdated"));
              setResponsavelAberto(false);
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
        </DrawerContent>
      </Dialog>
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("rowActionsFor", { label: usuario.nome })}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setAberto((valor) => !valor)}
      >
        <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
      </button>
      {aberto && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={t("rowActionsFor", { label: usuario.nome })}
          style={{ position: "fixed", top: posicao.top, right: posicao.right }}
          className="z-50 min-w-40 rounded-xl border border-border bg-card p-1 shadow-lg"
        >
          {(podeGerenciar || podeAtribuirPerfil) && <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-secondary"
            onClick={() => {
              setAberto(false);
              onEditar(usuario);
            }}
          >
            <Pencil aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            {t("edit")}
          </button>}
          {podeAtribuirResponsavel && <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-secondary"
            onClick={() => { setAberto(false); setResponsavelId(usuario.responsavel_id ?? ""); setResponsavelAberto(true); }}
          >
            <UserRoundCog aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            {t("changeOwner")}
          </button>}
          {podeGerenciar && <button
            type="button"
            role="menuitem"
            disabled={pendente}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-secondary disabled:opacity-50"
            onClick={alternarAtivo}
          >
            {usuario.ativo
              ? <UserRoundX aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
              : <UserRoundCheck aria-hidden="true" className="h-4 w-4 text-muted-foreground" />}
            {usuario.ativo ? t("inactivate") : t("activate")}
          </button>}
        </div>,
        document.body,
      )}
    </>
  );
}
