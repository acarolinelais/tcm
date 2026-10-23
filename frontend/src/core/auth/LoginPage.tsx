import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";

import { login } from "./api";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await login(email, senha);
      navigate("/", { replace: true });
    } catch {
      setErro("E-mail ou senha inválidos.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FBFBFB] p-4">
      <form onSubmit={enviar} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <h1 className="text-xl font-semibold">Entrar no SDF Control</h1>
          <p className="mt-1 text-sm text-muted-foreground">Use sua conta da unidade.</p>
        </div>
        <label className="block space-y-1 text-sm">
          <span>E-mail</span>
          <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Senha</span>
          <input required type="password" autoComplete="current-password" value={senha} onChange={(event) => setSenha(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        <button disabled={carregando} className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
