import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { usePerfilAtual } from "@/core/auth/usePerfilAtual";
import { ApiError } from "@/shared/api/problem-details";
import { Button } from "@/shared/ui/button";
import { criarPerfil, listarPerfis, listarPermissoes, salvarPermissoes } from "./api/perfis.api";

export function PerfisPage() {
  const queryClient = useQueryClient();
  const perfilAtual = usePerfilAtual();
  const perfis = useQuery({ queryKey: ["perfis"], queryFn: listarPerfis });
  const permissoes = useQuery({ queryKey: ["permissoes"], queryFn: listarPermissoes });
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [selecionado, setSelecionado] = useState("");
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const criar = useMutation({
    mutationFn: () => criarPerfil(nome, descricao),
    onSuccess: async (novo) => {
      setNome("");
      setDescricao("");
      setSelecionado(novo.id);
      await queryClient.invalidateQueries({ queryKey: ["perfis"] });
    },
  });
  const salvar = useMutation({
    mutationFn: () => salvarPermissoes(selecionado, marcadas),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["perfis"] }),
  });
  const atual = perfis.data?.find((item) => item.id === selecionado);

  useEffect(() => {
    if (!selecionado && perfis.data?.length) setSelecionado(perfis.data[0].id);
  }, [perfis.data, selecionado]);
  useEffect(() => {
    setMarcadas(atual?.permissoes ?? []);
  }, [atual?.id, atual?.permissoes]);

  const acessoNegado = perfilAtual.data && perfilAtual.data.perfil_codigo !== "ADMIN_UNIDADE" &&
    !perfilAtual.data.permissoes.includes("perfis.gerenciar");
  if (acessoNegado) return <p role="alert" className="p-6 text-sm">Você não tem permissão para gerenciar perfis.</p>;
  if (perfis.isLoading || permissoes.isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando perfis...</p>;
  if (perfis.error instanceof ApiError && perfis.error.problem.status === 403) {
    return <p role="alert" className="p-6 text-sm">Você não tem permissão para gerenciar perfis.</p>;
  }

  return (
    <section className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Perfis e permissões</h1>
        <p className="mt-1 text-sm text-muted-foreground">Defina as ações disponíveis para cada perfil da unidade.</p>
      </header>
      <form className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_2fr_auto]" onSubmit={(event) => { event.preventDefault(); criar.mutate(); }}>
        <input required maxLength={100} placeholder="Nome do perfil" value={nome} onChange={(event) => setNome(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <input maxLength={300} placeholder="Descrição (opcional)" value={descricao} onChange={(event) => setDescricao(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <Button disabled={criar.isPending}>Criar perfil</Button>
      </form>
      {criar.error && <p role="alert" className="text-sm text-destructive">Não foi possível criar o perfil.</p>}
      {perfis.data?.length ? (
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <nav className="flex flex-col gap-1" aria-label="Perfis">
            {perfis.data.map((item) => <button key={item.id} onClick={() => setSelecionado(item.id)} className={`rounded-lg px-3 py-2 text-left text-sm ${selecionado === item.id ? "bg-primary/10 font-medium" : "hover:bg-secondary"}`}>{item.nome}</button>)}
          </nav>
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <div><h2 className="font-medium">{atual?.nome}</h2><p className="text-sm text-muted-foreground">{atual?.descricao || "Sem descrição"}</p>{atual?.codigo && <p className="mt-1 text-xs text-muted-foreground">Perfil padrão do sistema; não pode ser editado.</p>}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {permissoes.data?.map((item) => <label key={item.id} className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
                <input type="checkbox" disabled={Boolean(atual?.codigo)} checked={marcadas.includes(item.id)} onChange={(event) => setMarcadas((value) => event.target.checked ? [...value, item.id] : value.filter((code) => code !== item.id))} />
                <span><span className="block font-medium">{item.id}</span><span className="text-muted-foreground">{item.descricao}</span></span>
              </label>)}
            </div>
            <Button disabled={salvar.isPending || !selecionado || Boolean(atual?.codigo)} onClick={() => salvar.mutate()}>Salvar permissões</Button>
            {salvar.error && <p role="alert" className="text-sm text-destructive">Não foi possível salvar as permissões.</p>}
          </div>
        </div>
      ) : <p className="text-sm text-muted-foreground">Nenhum perfil cadastrado.</p>}
    </section>
  );
}
