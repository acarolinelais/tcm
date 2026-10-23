import { useState } from "react";
import { NavLink, useOutletContext } from "react-router";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { toast } from "@/shared/lib/toast";

import { UsuarioForm } from "../components/UsuarioForm";
import { UsuariosTable } from "../components/UsuariosTable";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from "@/shared/ui/table";
import type { Usuario } from "../model/usuario";
import type { PerfilAtual } from "@/core/auth/api";
import type { UsuarioFiltros } from "../api/usuario.api";

export function UsuariosPage({ modoAdmin = false }: { modoAdmin?: boolean }) {
  const perfil = useOutletContext<PerfilAtual>();
  const ehAdmin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  if (modoAdmin && !ehAdmin) return <p role="alert" className="p-6 text-sm">Apenas o administrador da unidade pode acessar esta página.</p>;
  const podeGerenciar = ehAdmin || perfil.permissoes.includes("usuarios.gerenciar");
  const podeAtribuirPerfil = ehAdmin || perfil.permissoes.includes("perfis.gerenciar");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtros, setFiltros] = useState<UsuarioFiltros>({});
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<Usuario | undefined>();

  function abrirCriar() {
    setUsuarioEmEdicao(undefined);
    setModalAberto(true);
  }

  function abrirEditar(usuario: Usuario) {
    setUsuarioEmEdicao(usuario);
    setModalAberto(true);
  }

  function aoSalvar(usuarioSalvo: Usuario) {
    setModalAberto(false);
    if (usuarioEmEdicao) {
      toast.success(`Usuário ${usuarioSalvo.nome} foi atualizado com sucesso.`);
      return;
    }
    toast.success(`Usuário ${usuarioSalvo.nome} foi cadastrado com sucesso.`, {
      description: "Informe a senha inicial configurada; a troca será exigida no primeiro acesso.",
    });
  }

  function alterarFiltro(campo: "nome" | "email" | "ativo" | "perfil", valor: string) {
    setPage(1);
    setFiltros((atuais) => {
      if (campo === "nome" || campo === "email") {
        return { ...atuais, [campo]: valor || undefined };
      }
      if (campo === "ativo") {
        return { ...atuais, ativo: valor === "" ? undefined : valor === "true" };
      }
      return {
        ...atuais,
        perfil_id: valor || undefined,
      };
    });
  }

  function limparFiltros() {
    setFiltros({});
    setPage(1);
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[42px] border border-[#EEEEF1] bg-card px-7 py-8 sm:rounded-[52px] sm:px-11 sm:py-10">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium leading-8 text-[#3478F6]">Usuários</h1>
        </div>
        {podeGerenciar && (
          <Button onClick={abrirCriar} className="h-10 rounded-lg px-5 text-sm">
            Novo usuário
          </Button>
        )}
      </div>
      <nav aria-label="Seções de gerenciamento" className="mb-8 flex items-center gap-6 border-b border-border">
        <span className="border-b-2 border-[#3478F6] px-1 pb-2 text-lg font-medium text-[#3478F6]">
          Usuários
        </span>
        {(ehAdmin || perfil.permissoes.includes("perfis.gerenciar")) && (
          <NavLink
            to="/perfis"
            className="px-1 pb-2 text-lg text-muted-foreground transition-colors hover:text-foreground"
          >
            Perfis e permissões
          </NavLink>
        )}
      </nav>

      <UsuariosTable
        page={page}
        pageSize={pageSize}
        filtros={filtros}
        onFiltroChange={alterarFiltro}
        onPageChange={setPage}
          pageSizeOptions={TABLE_PAGE_SIZE_OPTIONS}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onEditar={abrirEditar}
        onNovoUsuario={abrirCriar}
        onLimparFiltros={limparFiltros}
        podeGerenciar={podeGerenciar}
        podeAtribuirPerfil={podeAtribuirPerfil}
        usuarioAtualId={perfil.id}
      />

      <Dialog open={podeGerenciar && modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{usuarioEmEdicao ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          </DialogHeader>
          <UsuarioForm usuario={usuarioEmEdicao} onSalvo={aoSalvar} podeGerenciar={podeGerenciar} podeAtribuirPerfil={podeAtribuirPerfil} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
