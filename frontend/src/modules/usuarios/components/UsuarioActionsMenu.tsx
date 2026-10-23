import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IdCard, MoreHorizontal, Pencil, UserRoundCheck, UserRoundX } from "lucide-react";

import type { Usuario } from "../model/usuario";
import { useAtivarUsuario, useInativarUsuario } from "../hooks/useUsuarios";

export function UsuarioActionsMenu({
  usuario,
  onEditar,
  onEditarPerfil,
  podeAtribuirPerfil,
  podeGerenciar,
}: {
  usuario: Usuario;
  onEditar: (usuario: Usuario) => void;
  onEditarPerfil: (usuario: Usuario) => void;
  podeAtribuirPerfil: boolean;
  podeGerenciar: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState({ top: 0, right: 8 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const ativar = useAtivarUsuario();
  const inativar = useInativarUsuario();
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
      if (!confirm(`Inativar o usuário "${usuario.nome}"?`)) return;
      setAberto(false);
      inativar.mutate(usuario.id);
      return;
    }

    setAberto(false);
    ativar.mutate(usuario.id);
  }

  return (
    <>
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
          {podeGerenciar && <button
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
          {podeAtribuirPerfil && <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-secondary"
            onClick={() => {
              setAberto(false);
              onEditarPerfil(usuario);
            }}
          >
            <IdCard aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            Alterar perfil
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
