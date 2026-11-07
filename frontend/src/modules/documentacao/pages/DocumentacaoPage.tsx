import { useState } from "react";
import { SearchField } from "@heroui/react";
import { SearchX } from "lucide-react";
import { Link, useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageCard, PageDescription, PageTitle } from "@/shared/ui/page-card";

import { destaquesDoPerfil, guiasNoIdioma, type GuiaNoIdioma } from "../conteudo/guias";

function ListaGuias({ titulo, guias }: { titulo: string; guias: GuiaNoIdioma[] }) {
  return (
    <section aria-label={titulo} className="mt-8">
      <h2 className="text-[15px] font-medium text-body">{titulo}</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {guias.map((guia) => (
          <li key={guia.slug}>
            <Link
              to={`/documentation/${guia.slug}`}
              className="block h-full rounded-2xl border border-edge bg-surface p-4 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <span className="block text-[15px] font-medium text-accent-text">{guia.titulo}</span>
              <span className="mt-1 block text-[13px] leading-5 text-muted">{guia.resumo}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DocumentacaoPage() {
  const { t, i18n } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const [filtro, setFiltro] = useState("");
  const guias = guiasNoIdioma(i18n.resolvedLanguage);
  const termo = filtro.trim().toLocaleLowerCase();
  const filtrados = guias.filter((guia) => guia.titulo.toLocaleLowerCase().includes(termo));
  const destaques = destaquesDoPerfil(perfil.perfil_codigo, i18n.resolvedLanguage);

  return (
    <PageCard className="overflow-y-auto [&>*]:shrink-0">
      <PageTitle>{t("documentation")}</PageTitle>
      <PageDescription>{t("docsDescription")}</PageDescription>
      <SearchField aria-label={t("docsSearch")} value={filtro} onChange={setFiltro} className="mt-6 max-w-sm">
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder={t("docsSearch")} />
          <SearchField.ClearButton aria-label={t("clearText")} />
        </SearchField.Group>
      </SearchField>
      {termo ? (
        filtrados.length ? <ListaGuias titulo={t("docsAllGuides")} guias={filtrados} /> : (
          <EstadoVazio className="mx-auto mt-10" titulo={t("docsNoMatch")} dica={t("docsNoMatchHint")} icone={<SearchX aria-hidden="true" className="size-7" />} />
        )
      ) : (
        <>
          {destaques.length > 0 && <ListaGuias titulo={t("docsForYou")} guias={destaques} />}
          <ListaGuias titulo={t("docsAllGuides")} guias={guias} />
        </>
      )}
    </PageCard>
  );
}
