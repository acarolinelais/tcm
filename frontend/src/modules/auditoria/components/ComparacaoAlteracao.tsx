import { useTranslation } from "react-i18next";

import { rotuloCampoAuditoria, valorAuditoria } from "@/shared/lib/auditoria";
import { TONS_STATUS_CASO_TESTE, tomDoToken, type TomEtiqueta } from "@/shared/lib/tom-etiqueta";
import { cn } from "@/shared/lib/utils";
import { TONS_ETIQUETA, TagChip } from "@/shared/ui/tag-chip";

import type { AlteracaoAuditoria } from "../model/auditoria";

// Comparação como num diff: o valor que saiu em vermelho e riscado, o que entrou em verde. O Status usa as cores
// dele no resto do sistema, para quem lê reconhecer o estado de origem e o de destino.
const TOM_ANTES = tomDoToken("etiqueta-fixes");
const TOM_DEPOIS = TONS_ETIQUETA.ativo;

function Valor({ campo, valor, lado, compacto }: { campo: string; valor: string | null; lado: "antes" | "depois"; compacto: boolean }) {
  const { t } = useTranslation();
  if (valor === null || valor === "") return <span className="text-muted">—</span>;
  const status = campo === "status";
  const tom: TomEtiqueta = status ? TONS_STATUS_CASO_TESTE[valor] ?? TONS_ETIQUETA.neutro : lado === "antes" ? TOM_ANTES : TOM_DEPOIS;
  const riscado = !status && lado === "antes";
  const texto = valorAuditoria(campo, valor, t);
  if (compacto) return <TagChip tom={tom} className={cn("max-w-[160px]", riscado && "line-through")}><span className="truncate">{texto}</span></TagChip>;
  // No painel, textos longos (procedimento, link de PR) quebram linha em vez de virar uma etiqueta de 17px.
  return <span className={cn("rounded-md px-2 py-0.5 text-[13px] font-medium leading-5 whitespace-pre-wrap break-words", riscado && "line-through")} style={{ backgroundColor: tom.fundo, color: tom.texto }}>{texto}</span>;
}

/** "Campo  [antes] → [depois]"; a criação do Test Case vira uma etiqueta verde. */
export function ComparacaoAlteracao({ alteracao, compacto = false }: { alteracao: AlteracaoAuditoria; compacto?: boolean }) {
  const { t } = useTranslation();
  const rotulo = rotuloCampoAuditoria(alteracao.campo, t);
  if (alteracao.campo === "criacao") return <TagChip tom={TONS_ETIQUETA.ativo}>{rotulo}</TagChip>;
  return (
    <span className={cn("flex min-w-0 gap-1.5", compacto ? "items-center" : "flex-col items-start")}>
      <span className={cn("shrink-0", compacto ? "text-muted" : "text-[14px] font-medium text-body")}>{rotulo}</span>
      <span className={cn("flex min-w-0 items-center gap-1.5", !compacto && "flex-wrap")}>
        <Valor campo={alteracao.campo} valor={alteracao.valor_anterior} lado="antes" compacto={compacto} />
        <span aria-hidden="true" className="text-muted">→</span>
        <span className="sr-only">{t("auditChangedTo")}</span>
        <Valor campo={alteracao.campo} valor={alteracao.valor_novo} lado="depois" compacto={compacto} />
      </span>
    </span>
  );
}
