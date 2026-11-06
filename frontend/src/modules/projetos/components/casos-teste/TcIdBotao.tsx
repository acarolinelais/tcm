import { linkClassName } from "@/shared/ui/link";
import type { CasoTesteResumo } from "../../model/projeto";

/** TC ID com aparência de link que abre o painel de detalhes do caso (specs 028 e 030), nas tabelas da página do projeto (spec 050). */
export function TcIdBotao({ caso, onAbrir }: { caso: CasoTesteResumo; onAbrir: (caso: CasoTesteResumo) => void }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => onAbrir(caso)}
      className={linkClassName}
    >
      {caso.tc_id}
    </button>
  );
}
