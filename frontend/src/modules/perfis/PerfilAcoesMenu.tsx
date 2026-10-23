import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, MoreHorizontal, Pencil } from "lucide-react";

import type { Perfil } from "./api/perfis.api";

export function PerfilAcoesMenu({
  perfil,
  onVisualizar,
  onEditar,
  podeEditar,
}: {
  perfil: Perfil;
  onVisualizar: () => void;
  onEditar: () => void;
  podeEditar: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState({ top: 0, right: 8 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fecharFora = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setAberto(false);
    };
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAberto(false);
        triggerRef.current?.focus();
      }
    };
    const posicionar = () => {
      const bounds = triggerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setPosicao({ top: Math.min(bounds.bottom + 6, window.innerHeight - 100), right: Math.max(8, window.innerWidth - bounds.right) });
    };
    posicionar();
    document.addEventListener("pointerdown", fecharFora);
    document.addEventListener("keydown", fecharComEscape);
    window.addEventListener("resize", posicionar);
    window.addEventListener("scroll", posicionar, true);
    return () => {
      document.removeEventListener("pointerdown", fecharFora);
      document.removeEventListener("keydown", fecharComEscape);
      window.removeEventListener("resize", posicionar);
      window.removeEventListener("scroll", posicionar, true);
    };
  }, [aberto]);

  const executar = (acao: () => void) => {
    setAberto(false);
    acao();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Ações para ${perfil.nome}`}
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((valor) => !valor)}
        className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreHorizontal aria-hidden="true" className="size-5" />
      </button>
      {aberto && createPortal(
        <div ref={menuRef} role="menu" aria-label={`Ações para ${perfil.nome}`} style={{ position: "fixed", top: posicao.top, right: posicao.right }} className="z-50 min-w-48 rounded-xl border border-border bg-card p-1 shadow-lg">
          <button type="button" role="menuitem" onClick={() => executar(onVisualizar)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary">
            <Eye aria-hidden="true" className="size-4 text-muted-foreground" /> Visualizar permissões
          </button>
          {podeEditar && <button type="button" role="menuitem" onClick={() => executar(onEditar)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary">
            <Pencil aria-hidden="true" className="size-4 text-muted-foreground" /> Editar permissões
          </button>}
        </div>,
        document.body,
      )}
    </>
  );
}
