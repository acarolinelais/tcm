import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Pencil, UserRoundCheck, UserRoundX, UserRoundCog } from "lucide-react";

import type { Usuario } from "../model/usuario";
import { useAtribuirResponsavel, useAtivarUsuario, useInativarUsuario } from "../hooks/useUsuarios";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { toast } from "@/shared/lib/toast";

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

  return (
    <>
      <ConfirmDialog
        open={confirmacaoAberta}
        onOpenChange={setConfirmacaoAberta}
        title="Inativar usuário?"
        description={`Tem certeza que deseja inativar o usuário “${usuario.nome}”?`}
        confirmLabel="Inativar usuário"
        variant="destructive"
        isPending={inativar.isPending}
        onConfirm={() => {
          inativar.mutate(usuario.id);
          setConfirmacaoAberta(false);
        }}
      />
      <Dialog open={responsavelAberto} onOpenChange={setResponsavelAberto}>
        <DialogContent>
          <DialogHeader><DialogTitle>Responsável por {usuario.nome}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={async (event) => {
            event.preventDefault();
            try {
              await atribuirResponsavel.mutateAsync({ id: usuario.id, responsavelId: responsavelId || null });
              toast.success("Responsável atualizado com sucesso.");
              setResponsavelAberto(false);
            } catch {
              toast.error("Não foi possível atualizar o responsável.");
            }
          }}>
            <label htmlFor={`responsavel-${usuario.id}`} className="block space-y-1.5 text-sm">
              <span>Gerente responsável</span>
              <select id={`responsavel-${usuario.id}`} value={responsavelId} onChange={(event) => setResponsavelId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Sem responsável</option>
                {gerentes.filter((gerente) => gerente.ativo).map((gerente) => <option key={gerente.id} value={gerente.id}>{gerente.nome} · {gerente.email}</option>)}
              </select>
            </label>
            <Button type="submit" disabled={atribuirResponsavel.isPending}>{atribuirResponsavel.isPending ? "Salvando..." : "Salvar"}</Button>
          </form>
        </DialogContent>
      </Dialog>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Ações para ${usuario.nome}`}
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
          aria-label={`Ações para ${usuario.nome}`}
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
            Editar
          </button>}
          {podeAtribuirResponsavel && <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-secondary"
            onClick={() => { setAberto(false); setResponsavelId(usuario.responsavel_id ?? ""); setResponsavelAberto(true); }}
          >
            <UserRoundCog aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            Alterar responsável
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
            {usuario.ativo ? "Inativar" : "Ativar"}
          </button>}
        </div>,
        document.body,
      )}
    </>
  );
}
