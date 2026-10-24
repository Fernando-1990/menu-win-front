"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, type ApiErro } from "@/lib/api";
import { lerToken, salvarToken } from "@/lib/sessao";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    if (lerToken()) router.replace("/painel");   // já logado
  }, [router]);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEntrando(true);
    try {
      const { token } = await api<{ token: string }>("/api/auth/login", { metodo: "POST", corpo: { email, senha } });
      salvarToken(token);
      router.replace("/painel");
    } catch (err) {
      setErro((err as ApiErro).message);
    } finally {
      setEntrando(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-marca">Menu Win</h1>
        <p className="mb-5 text-stone-600">Painel da loja</p>
        <label className="block text-sm">E-mail
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" />
        </label>
        <label className="mt-3 block text-sm">Senha
          <input type="password" required autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" />
        </label>
        {erro && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-800">{erro}</p>}
        <button disabled={entrando} className="mt-5 w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white disabled:opacity-50">
          {entrando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
