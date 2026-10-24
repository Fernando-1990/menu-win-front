"use client";

import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL, type ApiErro } from "@/lib/api";
import { centavos, formatar } from "@/lib/dinheiro";
import { METODO_PAGAMENTO, STATUS_PAGAMENTO, TIPO_ENTREGA } from "@/lib/rotulos";
import type { PedidoCozinha, StatusPedido } from "@/lib/tipos";
import { usePainel } from "../PainelContexto";

type Conexao = "conectando" | "ao-vivo" | "reconectando";

const COLUNAS: { titulo: string; filtro: (p: PedidoCozinha) => boolean }[] = [
  { titulo: "Novos", filtro: (p) => p.status === "RECEBIDO" },
  { titulo: "Em preparo", filtro: (p) => p.status === "EM_PREPARO" },
  { titulo: "Prontos", filtro: (p) => p.status === "PRONTO" || p.status === "SAIU_PARA_ENTREGA" },
  { titulo: "Entregues · falta receber", filtro: (p) => p.status === "ENTREGUE" },
];

/** Mesma regra do GET /abertos da API: o que some da tela. */
const naTela = (p: PedidoCozinha) =>
  ["RECEBIDO", "EM_PREPARO", "PRONTO", "SAIU_PARA_ENTREGA"].includes(p.status) ||
  (p.status === "ENTREGUE" && p.pagamentoPendenteNoBalcao);

class SessaoExpirada extends Error {}

export function Tela() {
  const { token, papel, chamar, sair } = usePainel();
  const [pedidos, setPedidos] = useState<Map<string, PedidoCozinha>>(new Map());
  const [conexao, setConexao] = useState<Conexao>("conectando");
  const [erro, setErro] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [som, setSom] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const conhecidos = useRef<Set<string>>(new Set());

  const apitar = useCallback(() => {
    const ctx = audio.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.frequency.value = 880;
    ganho.gain.setValueAtTime(0.2, ctx.currentTime);
    ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(ganho).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  }, []);

  const atualizar = useCallback((p: PedidoCozinha) => {
    if (p.status === "RECEBIDO" && !conhecidos.current.has(p.id)) apitar();
    conhecidos.current.add(p.id);
    setPedidos((atual) => {
      const novo = new Map(atual);
      if (naTela(p)) novo.set(p.id, p);
      else novo.delete(p.id);
      return novo;
    });
  }, [apitar]);

  const recarregarLista = useCallback(async () => {
    const lista = await chamar<PedidoCozinha[]>("/api/painel/pedidos/abertos");
    lista.forEach((p) => conhecidos.current.add(p.id));
    setPedidos(new Map(lista.map((p) => [p.id, p])));
  }, [chamar]);

  // Tempo real. Sem replay de eventos: a cada (re)conexão, recarrega a lista inteira.
  useEffect(() => {
    const controle = new AbortController();
    fetchEventSource(`${API_URL}/api/painel/pedidos/eventos`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
      signal: controle.signal,
      openWhenHidden: true,   // a tela da cozinha costuma ficar em segundo plano
      async onopen(resposta) {
        if (resposta.ok) return setConexao("ao-vivo");
        if (resposta.status === 401) throw new SessaoExpirada();
        throw new Error(`SSE ${resposta.status}`);
      },
      onmessage(evento) {
        if (evento.event === "conectado") recarregarLista().catch((e: ApiErro) => setErro(e.message));
        if (evento.event === "pedido") atualizar(JSON.parse(evento.data));
      },
      onclose() {
        throw new Error("conexão encerrada pelo servidor");   // vira retry no onerror
      },
      onerror(e) {
        if (e instanceof SessaoExpirada) throw e;   // para de tentar
        setConexao("reconectando");
        return 3000;   // tenta de novo em 3s
      },
    }).catch((e) => {
      if (e instanceof SessaoExpirada) sair();
    });
    return () => controle.abort();
  }, [token, recarregarLista, atualizar, sair]);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  async function mudarStatus(p: PedidoCozinha, status: StatusPedido, motivo?: string) {
    setErro(null);
    try {
      atualizar(await chamar<PedidoCozinha>(`/api/painel/pedidos/${p.id}/status`, { metodo: "PATCH", corpo: { status, motivo } }));
    } catch (e) {
      setErro(`#${p.numero}: ${(e as ApiErro).message}`);
    }
  }

  async function receberPagamento(p: PedidoCozinha) {
    setErro(null);
    try {
      atualizar(await chamar<PedidoCozinha>(`/api/painel/pedidos/${p.id}/pagamento/recebido`, { metodo: "POST" }));
    } catch (e) {
      setErro(`#${p.numero}: ${(e as ApiErro).message}`);
    }
  }

  function cancelar(p: PedidoCozinha) {
    const motivo = window.prompt(`Cancelar o pedido #${p.numero}? Informe o motivo:`);
    if (motivo && motivo.trim()) mudarStatus(p, "CANCELADO", motivo.trim());
  }

  function ativarSom() {
    audio.current ??= new AudioContext();   // navegadores só liberam áudio depois de um clique
    setSom(true);
    apitar();
  }

  const lista = [...pedidos.values()].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));

  return (
    <main className="flex flex-1 flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Pedidos</h1>
        <span
          role="status"
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${conexao === "ao-vivo" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}
        >
          {conexao === "ao-vivo" ? "● Ao vivo" : conexao === "conectando" ? "Conectando…" : "Reconectando…"}
        </span>
        {!som && (
          <button onClick={ativarSom} className="rounded-lg border border-stone-300 bg-white px-3 py-1 text-sm">
            Ativar som de pedido novo
          </button>
        )}
      </div>

      {erro && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-800">{erro}</p>}

      <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUNAS.map((col) => {
          const doStatus = lista.filter(col.filtro);
          return (
            <section key={col.titulo} aria-label={col.titulo} className="flex flex-col gap-2 rounded-xl bg-stone-200/60 p-2">
              <h2 className="px-1 font-semibold">{col.titulo} <span className="text-stone-500">({doStatus.length})</span></h2>
              {doStatus.map((p) => (
                <CartaoPedido
                  key={p.id}
                  pedido={p}
                  agora={agora}
                  podeCancelar={papel !== "COZINHA"}
                  onStatus={(s) => mudarStatus(p, s)}
                  onReceber={() => receberPagamento(p)}
                  onCancelar={() => cancelar(p)}
                />
              ))}
            </section>
          );
        })}
      </div>
    </main>
  );
}

function CartaoPedido({ pedido: p, agora, podeCancelar, onStatus, onReceber, onCancelar }: {
  pedido: PedidoCozinha;
  agora: number;
  podeCancelar: boolean;
  onStatus: (s: StatusPedido) => void;
  onReceber: () => void;
  onCancelar: () => void;
}) {
  const minutos = Math.max(0, Math.floor((agora - new Date(p.criadoEm).getTime()) / 60_000));
  const delivery = p.tipoEntrega === "DELIVERY";
  const botao = "rounded-lg px-3 py-2 text-sm font-semibold";

  return (
    <article className={`rounded-lg bg-white p-3 shadow-sm ${p.pagamentoPendenteNoBalcao && p.status === "ENTREGUE" ? "ring-2 ring-amber-500" : ""}`}>
      <header className="flex items-baseline justify-between gap-2">
        <span className="text-lg font-bold tabular-nums">#{String(p.numero).padStart(4, "0")}</span>
        <span className={`text-sm tabular-nums ${minutos >= 20 && p.status !== "ENTREGUE" ? "font-bold text-red-700" : "text-stone-500"}`}>
          {minutos} min
        </span>
      </header>
      <p className="text-sm font-medium">{TIPO_ENTREGA[p.tipoEntrega]} · {p.clienteNome}</p>
      {delivery && p.endereco && (
        <p className="text-xs text-stone-600">
          {p.endereco.logradouro}, {p.endereco.numero} {p.endereco.complemento} · {p.endereco.bairro} · {p.clienteTelefone}
        </p>
      )}

      <ul className="my-2 space-y-1 border-y border-stone-100 py-2 text-sm">
        {p.itens.map((i, idx) => (
          <li key={idx}>
            <span className="font-semibold">{i.quantidade}x</span> {i.nome}
            {i.adicionais.length > 0 && <span className="block pl-5 text-xs text-stone-600">{i.adicionais.join(" · ")}</span>}
            {i.observacao && <span className="block pl-5 text-xs font-semibold text-red-700">Obs.: {i.observacao}</span>}
          </li>
        ))}
      </ul>
      {p.observacao && <p className="mb-2 text-xs font-semibold text-red-700">Pedido: {p.observacao}</p>}

      <p className="text-sm">
        {formatar(centavos(p.total))} · {p.metodoPagamento ? METODO_PAGAMENTO[p.metodoPagamento] : "—"}
        {p.statusPagamento && (
          <span className={`ml-1 rounded px-1 text-xs ${p.statusPagamento === "APROVADO" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}>
            {STATUS_PAGAMENTO[p.statusPagamento]}
          </span>
        )}
        {p.trocoPara != null && <span className="block text-xs text-stone-600">Troco para {formatar(centavos(p.trocoPara))}</span>}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {p.status === "RECEBIDO" && <button onClick={() => onStatus("EM_PREPARO")} className={`${botao} bg-marca text-white`}>Começar preparo</button>}
        {(p.status === "RECEBIDO" || p.status === "EM_PREPARO") && (
          <button onClick={() => onStatus("PRONTO")} className={`${botao} ${p.status === "EM_PREPARO" ? "bg-marca text-white" : "border border-stone-300"}`}>Pronto</button>
        )}
        {p.status === "PRONTO" && delivery && <button onClick={() => onStatus("SAIU_PARA_ENTREGA")} className={`${botao} bg-marca text-white`}>Saiu para entrega</button>}
        {(p.status === "SAIU_PARA_ENTREGA" || (p.status === "PRONTO" && !delivery)) && (
          <button onClick={() => onStatus("ENTREGUE")} className={`${botao} bg-marca text-white`}>Entregue</button>
        )}
        {p.pagamentoPendenteNoBalcao && (
          <button onClick={onReceber} className={`${botao} bg-amber-500 text-white`}>Recebi o pagamento</button>
        )}
        {p.status === "EM_PREPARO" && <button onClick={() => onStatus("RECEBIDO")} className="text-xs text-stone-500 underline">voltar</button>}
        {p.status !== "ENTREGUE" && podeCancelar && <button onClick={onCancelar} className="ml-auto text-xs text-red-700 underline">cancelar</button>}
      </div>
    </article>
  );
}
