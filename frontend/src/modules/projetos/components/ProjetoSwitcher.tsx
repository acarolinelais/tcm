import { Button, Dropdown } from "@heroui/react";
import { useNavigate, useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { SmallChevronIcon } from "@/shared/ui/figma-icons";
import { PageTitle } from "@/shared/ui/page-card";
import { useProjetosSeletor } from "../hooks/useProjetos";

// Título do projeto (Figma TCM 2070:1476); com outros projetos visíveis, vira um menu para trocar de projeto.
// O Board (spec 037) passa a própria lista, do escopo do Board, e o destino na tela só do Kanban.
export function ProjetoSwitcher({ projetoId, nome, projetos: lista, destino = (id) => `/projetos/${id}` }: {
  projetoId: string;
  nome: string;
  projetos?: { id: string; nome: string }[];
  destino?: (projetoId: string) => string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const perfil = useOutletContext<PerfilAtual>();
  const projetos = useProjetosSeletor(perfil, !lista);
  const opcoes = lista ?? projetos.data?.pages.flatMap((pagina) => pagina.items) ?? [];
  const outros = opcoes.filter((projeto) => projeto.id !== projetoId);

  if (!outros.length && !projetos.hasNextPage && !projetos.isError) return <PageTitle>{nome}</PageTitle>;

  return (
    <h1 className="min-w-0">
      <Dropdown>
        <Button variant="ghost" className="h-auto min-h-0 max-w-full gap-1 rounded-lg px-0 text-[22px] font-medium leading-[27px] text-body hover:bg-transparent data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus">
          <span className="truncate">{nome}</span>
          <SmallChevronIcon className="h-[23px] w-[23px] text-body" />
        </Button>
        <Dropdown.Popover placement="bottom start" className="max-h-80 min-w-56 overflow-y-auto">
          <Dropdown.Menu
            aria-label={t("switchProject")}
            selectionMode="single"
            selectedKeys={new Set([projetoId])}
            onAction={(id) => { if (id !== projetoId) navigate(destino(String(id))); }}
          >
            {opcoes.map((projeto) => (
              <Dropdown.Item key={projeto.id} id={projeto.id} textValue={projeto.nome} className="text-[14px]">
                <span className="truncate">{projeto.nome}</span>
                <Dropdown.ItemIndicator />
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
          {projetos.isError && <p role="alert" className="p-2 text-[13px] text-danger">{t("projectsLoadError")}</p>}
          {(projetos.hasNextPage || projetos.isError) && <Button variant="ghost" size="sm" className="m-1" isDisabled={projetos.isFetching} onPress={() => void (projetos.isError && !projetos.isFetchNextPageError ? projetos.refetch() : projetos.fetchNextPage())}>{t(projetos.isError ? "retryQuery" : "moreProjects")}</Button>}
        </Dropdown.Popover>
      </Dropdown>
    </h1>
  );
}
