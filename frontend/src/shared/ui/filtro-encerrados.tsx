import { Archive } from "lucide-react";
import { useTranslation } from "react-i18next";

import { FiltroPilula } from "@/shared/ui/filtro-pilula";

/** Pílula que liga a exibição dos projetos Completed e Canceled, no estilo do seletor "Day or Week". Só aparece quando há um projeto encerrado na lista (ou se já estiver ligada). */
export function FiltroEncerrados({ existem, ligado, onChange, autoFocus }: { existem: boolean; ligado: boolean; onChange: (ligado: boolean) => void; autoFocus?: boolean }) {
  const { t } = useTranslation();
  if (!ligado && !existem) return null;
  return <FiltroPilula ligado={ligado} onChange={onChange} autoFocus={autoFocus} icone={<Archive aria-hidden="true" className="size-4" strokeWidth={1.75} />} rotulo={t("showClosedProjects")} />;
}
