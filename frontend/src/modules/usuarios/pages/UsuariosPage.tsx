import { useState } from "react";
import { useOutletContext } from "react-router";

import { Button } from "@/shared/ui/button";
import { Dialog, DrawerContent, DrawerHeader, DrawerTitle } from "@/shared/ui/dialog";
import { toast } from "@/shared/lib/toast";

import { UsuarioForm } from "../components/UsuarioForm";
import { UsuariosTable } from "../components/UsuariosTable";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from "@/shared/ui/table";
import type { Usuario } from "../model/usuario";
import type { PerfilAtual } from "@/core/auth/api";
import type { UsuarioFiltros } from "../api/usuario.api";
import { useTranslation } from "react-i18next";

export function UsuariosPage({ modoAdmin = false }: { modoAdmin?: boolean }) {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const ehAdmin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const ehGerente = perfil.perfil_codigo === "GERENTE";
  const podeGerenciar = ehAdmin || perfil.permissoes.includes("usuarios.gerenciar");
  const podeAtribuirPerfil = ehAdmin || perfil.permissoes.includes("perfis.gerenciar");
  const podeAtribuirPerfilKP = ehGerente;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtros, setFiltros] = useState<UsuarioFiltros>({});
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<Usuario | undefined>();
  if (modoAdmin && !ehAdmin) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;

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
      toast.success(t("userUpdateSuccess", { name: usuarioSalvo.nome }));
      return;
    }
    toast.success(t("userCreateSuccess", { name: usuarioSalvo.nome }), {
      description: t("initialPasswordNotice"),
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
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[42px] border border-[#EEEEF1] bg-card px-7 py-8 sm:px-11 sm:py-10">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium leading-8 text-[#3478F6]">{t("users")}</h1>
        </div>
        {podeGerenciar && (
          <Button onClick={abrirCriar} className="h-10 rounded-lg px-5 text-sm">
            {t("newUser")}
          </Button>
        )}
      </div>
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
        podeAtribuirPerfilKP={podeAtribuirPerfilKP}
        usuarioAtualId={perfil.id}
      />

      <Dialog open={podeGerenciar && modalAberto} onOpenChange={setModalAberto}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{usuarioEmEdicao ? t("editUser") : t("newUser")}</DrawerTitle>
          </DrawerHeader>
          <UsuarioForm
            usuario={usuarioEmEdicao}
            onSalvo={aoSalvar}
            podeGerenciar={podeGerenciar}
            podeAtribuirPerfil={podeAtribuirPerfil}
            podeAtribuirPerfilKP={podeAtribuirPerfilKP}
          />
        </DrawerContent>
      </Dialog>
    </div>
  );
}
