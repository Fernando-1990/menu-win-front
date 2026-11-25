"use client";

import { useState, type FormEvent } from "react";
import { Carregando } from "@/components/Mensagem";
import type { ApiErro } from "@/lib/api";
import type { Papel } from "@/lib/tipos";
import { usePainel } from "../PainelContexto";

const campo = "mt-1 w-full rounded-lg border border-stone-300 bg-white p-2";

const PAPEL: Record<Papel, string> = { DONO: "Dono", GERENTE: "Gerente", COZINHA: "Cozinha" };

export function Tela() {
  const { sessao } = usePainel();
  if (!sessao) return <Carregando />;
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 p-4">
      <h1 className="text-xl font-bold">Minha conta</h1>
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-stone-500">Nome</dt><dd>{sessao.nome}</dd>
          <dt className="text-stone-500">E-mail</dt><dd>{sessao.email}</dd>
          <dt className="text-stone-500">Função</dt><dd>{PAPEL[sessao.papel]}</dd>
          <dt className="text-stone-500">Loja</dt><dd>{sessao.lojaNome}</dd>
        </dl>
      </section>
      <TrocarSenha />
    </main>
  );
}

function TrocarSenha() {
  const { chamar } = usePainel();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (nova.trim().length < 8) return setMsg({ ok: false, texto: "A nova senha precisa ter pelo menos 8 caracteres." });
    if (nova !== confirmacao) return setMsg({ ok: false, texto: "A confirmação não é igual à nova senha." });
    if (nova === atual) return setMsg({ ok: false, texto: "A nova senha precisa ser diferente da atual." });

    setEnviando(true);
    try {
      await chamar("/api/painel/conta/senha", { metodo: "PUT", corpo: { senhaAtual: atual, novaSenha: nova } });
      setAtual("");
      setNova("");
      setConfirmacao("");
      setMsg({ ok: true, texto: "Senha alterada. Use a nova senha no próximo login." });
    } catch (err) {
      setMsg({ ok: false, texto: (err as ApiErro).message });
    } finally {
      setEnviando(false);
    }
  }

  const tipo = mostrar ? "text" : "password";
  return (
    <form onSubmit={salvar} className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Trocar senha</h2>
      <label className="text-sm">Senha atual
        <input type={tipo} autoComplete="current-password" required value={atual} onChange={(e) => setAtual(e.target.value)} className={campo} />
      </label>
      <label className="text-sm">Nova senha <span className="text-stone-500">(mínimo 8 caracteres)</span>
        <input type={tipo} autoComplete="new-password" required minLength={8} maxLength={72} value={nova} onChange={(e) => setNova(e.target.value)} className={campo} />
      </label>
      <label className="text-sm">Repita a nova senha
        <input type={tipo} autoComplete="new-password" required value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className={campo} />
      </label>
      <label className="flex items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} /> Mostrar senhas
      </label>
      {msg && <p role="status" className={msg.ok ? "text-green-700" : "text-red-700"}>{msg.texto}</p>}
      <button disabled={enviando} className="self-start rounded-lg bg-marca px-4 py-2 text-white disabled:opacity-60">
        {enviando ? "Salvando…" : "Trocar senha"}
      </button>
    </form>
  );
}
