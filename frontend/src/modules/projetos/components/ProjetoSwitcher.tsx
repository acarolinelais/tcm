import { useState } from "react";
import { Button, Dropdown, SearchField } from "@heroui/react";
import { Autocomplete, useFilter } from "react-aria-components";
import { useNavigate, useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { SmallChevronIcon } from "@/shared/ui/figma-icons";
import { PageTitle } from "@/shared/ui/page-card";
import { useProjetosSeletor } from "../hooks/useProjetos";

// Título do projeto (Figma TCM 2070:1476); com outros projetos visíveis, vira um menu para trocar de projeto.
// O Board (spec 037) passa a própria lista, do escopo do Board, e o destino na tela só do Kanban.
// A General Results (spec 053) liga a busca e troca de projeto pelo `onEscolher`, sem navegar.
// Com `comoTitulo={false}` (Board, spec 056) o seletor não é o `h1` da página e usa a cor do texto. Com `azul={false}`
// (Projects, spec 058) continua `h1`, mas na cor do texto, como no frame.
export function ProjetoSwitcher({ projetoId, nome, projetos: lista, destino = (id) => `/projetos/${id}`, buscavel = false, comoTitulo = true, azul = true, onEscolher }: {
  projetoId: string;
  nome: string;
  projetos?: { id: string; nome: string }[];
  destino?: (projetoId: string) => string;
  buscavel?: boolean;
  comoTitulo?: boolean;
  azul?: boolean;
  onEscolher?: (projetoId: string) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const perfil = useOutletContext<PerfilAtual>();
  const projetos = useProjetosSeletor(perfil, !lista);
  const opcoes = lista ?? projetos.data?.pages.flatMap((pagina) => pagina.items) ?? [];
  const outros = opcoes.filter((projeto) => projeto.id !== projetoId);
  const { contains } = useFilter({ sensitivity: "base" });
  const escolher = onEscolher ?? ((id: string) => navigate(destino(id)));
  const [aberto, setAberto] = useState(false);
  const Raiz = comoTitulo ? "h1" : "div";
  const cor = comoTitulo && azul ? "text-accent-text" : "text-body";

  if (!outros.length && !projetos.hasNextPage && !projetos.isError) {
    return comoTitulo ? <PageTitle className={cor}>{nome}</PageTitle> : <p className="truncate text-[22px] font-medium leading-[27px] text-body">{nome}</p>;
  }

  const menu = (
    <Dropdown.Menu
      aria-label={t("switchProject")}
      selectionMode="single"
      selectedKeys={new Set([projetoId])}
      onAction={(id) => { if (id !== projetoId) escolher(String(id)); }}
      // Só a busca esvazia o menu; sem ela, a lista vazia é a falha de carga, que já tem o próprio aviso.
      renderEmptyState={buscavel ? () => <p className="p-2 text-[13px] text-muted">{t("noProjectsFound")}</p> : undefined}
    >
      {opcoes.map((projeto) => (
        <Dropdown.Item key={projeto.id} id={projeto.id} textValue={projeto.nome} className="text-[14px]">
          <span className="truncate">{projeto.nome}</span>
          <Dropdown.ItemIndicator />
        </Dropdown.Item>
      ))}
    </Dropdown.Menu>
  );

  return (
    <Raiz className={`min-w-0 ${cor}`}>
      <Dropdown isOpen={aberto} onOpenChange={setAberto}>
        <Button variant="ghost" className={`h-auto min-h-0 max-w-full gap-1 rounded-lg px-0 text-[22px] font-medium leading-[27px] ${cor} hover:bg-transparent data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus`}>
          <span className="truncate">{nome}</span>
          <SmallChevronIcon className={`h-[23px] w-[23px] ${cor}`} />
        </Button>
        <Dropdown.Popover placement="bottom start" className="max-h-80 min-w-56 overflow-y-auto">
          {buscavel ? (
            <Autocomplete filter={contains}>
              {/* O campo de busca segura o Escape para limpar o texto; com ele vazio, o Escape fecha o menu. */}
              <SearchField aria-label={t("searchProject")} autoFocus className="m-1" onKeyDown={(evento) => { if (evento.key === "Escape" && !evento.currentTarget.value) setAberto(false); }}>
                <SearchField.Group className="h-8">
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder={t("searchProject")} className="text-[13px]" />
                  <SearchField.ClearButton aria-label={t("clearText")} />
                </SearchField.Group>
              </SearchField>
              {menu}
            </Autocomplete>
          ) : menu}
          {projetos.isError && <p role="alert" className="p-2 text-[13px] text-danger">{t("projectsLoadError")}</p>}
          {(projetos.hasNextPage || projetos.isError) && <Button variant="ghost" size="sm" className="m-1" isDisabled={projetos.isFetching} onPress={() => void (projetos.isError && !projetos.isFetchNextPageError ? projetos.refetch() : projetos.fetchNextPage())}>{t(projetos.isError ? "retryQuery" : "moreProjects")}</Button>}
        </Dropdown.Popover>
      </Dropdown>
    </Raiz>
  );
}
