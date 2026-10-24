"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Carregando, Erro } from "@/components/Mensagem";
import type { ApiErro } from "@/lib/api";
import { centavos, lerReais, paraApi } from "@/lib/dinheiro";
import type { Operacao } from "@/lib/tipos";
import { usePainel } from "../PainelContexto";

const campo = "mt-1 w-full rounded-lg border border-stone-300 bg-white p-2";
const reais = (v: number) => (centavos(v) / 100).toFixed(2).replace(".", ",");

export function Tela() {
  const { papel } = usePainel();
  if (papel !== "DONO") return <Erro>Só o dono da loja altera as configurações.</Erro>;
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      <h1 className="text-xl font-bold">Configurações</h1>
      <OperacaoForm />
      <MercadoPagoForm />
    </main>
  );
}

function OperacaoForm() {
  const { chamar } = usePainel();
  const [op, setOp] = useState<Operacao | null>(null);
  const [taxa, setTaxa] = useState("");
  const [minimo, setMinimo] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    chamar<Operacao>("/api/painel/loja/operacao")
      .then((o) => {
        setOp(o);
        setTaxa(reais(o.taxaEntregaPadrao));
        setMinimo(reais(o.pedidoMinimo));
      })
      .catch((e: ApiErro) => setMsg({ ok: false, texto: e.message }));
  }, [chamar]);

  if (!op) return msg ? <p className="text-red-700">{msg.texto}</p> : <Carregando />;

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const t = lerReais(taxa);
    const m = lerReais(minimo);
    if (t == null || m == null) return setMsg({ ok: false, texto: "Valores em reais inválidos. Ex.: 5,00" });
    try {
      const salvo = await chamar<Operacao>("/api/painel/loja/operacao", {
        metodo: "PUT",
        corpo: { ...op, taxaEntregaPadrao: paraApi(t), pedidoMinimo: paraApi(m) },
      });
      setOp(salvo);
      setMsg({ ok: true, texto: "Configurações salvas." });
    } catch (err) {
      setMsg({ ok: false, texto: (err as ApiErro).message });
    }
  }

  const marcar = (campoOp: keyof Operacao, rotulo: string, ajuda: string) => (
    <label className="flex items-start gap-3">
      <input type="checkbox" checked={op[campoOp] as boolean} onChange={(e) => setOp({ ...op, [campoOp]: e.target.checked })} className="mt-1" />
      <span><span className="font-medium">{rotulo}</span><span className="block text-sm text-stone-500">{ajuda}</span></span>
    </label>
  );

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Como a loja atende</h2>
      {marcar("aceitaRetirada", "Retirada no balcão", "O cliente pede pelo cardápio e busca.")}
      {marcar("aceitaConsumoLocal", "Comer aqui", "O cliente pede pelo celular e come na loja.")}
      {marcar("aceitaDelivery", "Entrega", "Cobra a taxa de entrega abaixo.")}
      {marcar("aceitaPagarNoCaixa", "Pagar no caixa", "O pedido vai direto para a cozinha e o cliente paga ao sair ou retirar. Não vale para entrega.")}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Taxa de entrega (R$)
          <input inputMode="decimal" value={taxa} onChange={(e) => setTaxa(e.target.value)} className={campo} />
        </label>
        <label className="text-sm">Pedido mínimo (R$)
          <input inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} className={campo} />
        </label>
        <label className="text-sm">Tempo de preparo (min)
          <input type="number" min={0} max={600} value={op.tempoPreparoMin} onChange={(e) => setOp({ ...op, tempoPreparoMin: Number(e.target.value) })} className={campo} />
        </label>
      </div>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.texto}</p>}
      <button className="self-start rounded-lg bg-marca px-4 py-2 font-semibold text-white">Salvar</button>
    </form>
  );
}

function MercadoPagoForm() {
  const { chamar } = usePainel();
  const [status, setStatus] = useState<{ configurado: boolean; modoTeste: boolean } | null>(null);
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    chamar<{ configurado: boolean; modoTeste: boolean }>("/api/painel/pagamentos/mercadopago")
      .then(setStatus)
      .catch((e: ApiErro) => setMsg({ ok: false, texto: e.message }));
  }, [chamar]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMsg(null);
    try {
      setStatus(await chamar("/api/painel/pagamentos/mercadopago", { metodo: "PUT", corpo: { accessToken: token } }));
      setToken("");
      setMsg({ ok: true, texto: "Conta do Mercado Pago conectada. O Pix já aparece no cardápio." });
    } catch (err) {
      setMsg({ ok: false, texto: (err as ApiErro).message });
    } finally {
      setSalvando(false);
    }
  }

  async function remover() {
    if (!confirm("Desconectar o Mercado Pago? O Pix sai do cardápio.")) return;
    try {
      await chamar("/api/painel/pagamentos/mercadopago", { metodo: "DELETE" });
      setStatus({ configurado: false, modoTeste: false });
    } catch (err) {
      setMsg({ ok: false, texto: (err as ApiErro).message });
    }
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Pix pelo Mercado Pago</h2>
      <p className="text-sm text-stone-600">
        O dinheiro do Pix cai direto na conta da loja. Cole o <strong>access token</strong> da sua conta do Mercado Pago
        (em Seu negócio → Configurações → Credenciais). Ele fica guardado criptografado e não aparece de novo aqui.
      </p>
      {status && (
        <p className="text-sm">
          Situação:{" "}
          {status.configurado
            ? <strong className="text-green-700">conectado{status.modoTeste ? " (modo de teste)" : ""}</strong>
            : <strong className="text-stone-600">não conectado</strong>}
        </p>
      )}
      <label className="text-sm">{status?.configurado ? "Trocar access token" : "Access token"}
        <input type="password" required autoComplete="off" placeholder="APP_USR-… ou TEST-…" value={token} onChange={(e) => setToken(e.target.value)} className={campo} />
      </label>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.texto}</p>}
      <div className="flex gap-2">
        <button disabled={salvando} className="rounded-lg bg-marca px-4 py-2 font-semibold text-white disabled:opacity-50">
          {salvando ? "Verificando…" : "Conectar"}
        </button>
        {status?.configurado && <button type="button" onClick={remover} className="rounded-lg border border-stone-300 px-4 py-2">Desconectar</button>}
      </div>
    </form>
  );
}
