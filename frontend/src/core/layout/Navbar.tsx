import chevronUser from "@/shared/assets/figma/icons/chevron-user.svg";
import language from "@/shared/assets/figma/icons/language.svg";
import search from "@/shared/assets/figma/icons/search.svg";
import type { PerfilAtual } from "@/core/auth/api";
import { useNavigate } from "react-router";
import { httpPost } from "@/core/api/http-client";
import { clearTokens } from "@/core/auth/session";

export function Navbar({ perfil }: { perfil: PerfilAtual }) {
  const navigate = useNavigate();
  async function sair() {
    try {
      await httpPost<void>("/api/auth/logout", {});
    } finally {
      clearTokens();
      navigate("/login", { replace: true });
    }
  }
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex h-10 w-full max-w-xs items-center gap-2 rounded-full border border-border bg-card px-4">
        <img src={search} alt="" className="h-3.5 w-3.5 opacity-70" />
        <input
          type="search"
          placeholder="Search keyword..."
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-1.5 text-sm text-foreground">
          <img src={language} alt="" className="h-4 w-4" />
          English
        </button>
        <button onClick={sair} title="Sair" className="flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8880F7] text-xs font-medium text-white">
            {perfil.nome.slice(0, 1).toUpperCase()}
          </span>
          <span className="text-sm font-medium">{perfil.nome}</span>
          <img src={chevronUser} alt="" className="h-[5px] w-[9px]" />
        </button>
      </div>
    </header>
  );
}
