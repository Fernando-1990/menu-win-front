"use client";

import { useCallback, useEffect, useState } from "react";
import { Erro } from "@/components/Mensagem";
import type { ApiErro } from "@/lib/api";
import { centavos, formatar } from "@/lib/dinheiro";
import { METODO_PAGAMENTO, STATUS_PAGAMENTO, STATUS_PEDIDO, TIPO_ENTREGA } from "@/lib/rotulos";
import type { Historico, PedidoDetalhe, PedidoResumo, StatusPedido } from "@/lib/tipos";
import { usePainel } from "../PainelContexto";

const URL = "/api/painel/historico/pedidos";

/** "2026-10-24" no fuso da loja (a API interpreta as datas no horário de Brasília). */
const diaDaLoja = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
const diasAtras = (n: number) => diaDaLoja(new Date(Date.now() - n * 86_400_000));
const hora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const SITUACOES: { valor: string; rotulo: string; status: StatusPedido[] }[] = [
  { valor: "todos", rotulo: "Todas as situações", status: [] },
  { valor: "andamento", rotulo: "Em andamento", status: ["RECEBIDO", "EM_PREPARO", "PRONTO", "SAIU_PARA_ENTREGA"] },
  { valor: "entregues", rotulo: "Entregues", status: ["ENTREGUE"] },
  { valor: "cancelados", rotulo: "Cancelados", status: ["CANCELADO"] },
  { valor: "aguardando", rotulo: "Aguardando Pix", status: ["AGUARDANDO_PAGAMENTO"] },
];

const COR_STATUS: Partial<Record<StatusPedido, string>> = {
  ENTREGUE: "bg-green-100 text-green-800",
  CANCELADO: "bg-red-100 text-red-800",
  AGUARDANDO_PAGAMENTO: "bg-amber-100 text-amber-900",
};

interface Filtro {
  de: string;
  ate: string;
  situacao: string;
  soPendente: boolean;
}

function consulta(f: Filtro, pagina: number): string {
  const q = new URLSearchParams({ de: f.de, ate: f.ate, pagamentoPendente: String(f.soPendente), pagina: String(pagina) });
  SITUACOES.find((s) => s.valor === f.situacao)!.status.forEach((s) => q.append("status", s));
  return `${URL}?${q}`;
}

export function Tela() {
  const { papel, chamar } = usePainel();
  const [filtro, setFiltro] = useState<Filtro>(() => ({ de: diasAtras(0), ate: diasAtras(0), situacao: "todos", soPendente: false }));
  const [dados, setDados] = useState<Historico | null>(null);
  const [lista, setLista] = useState<PedidoResumo[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);   // muda para recarregar depois de uma ação no detalhe

  // primeira página sempre que o filtro muda
  useEffect(() => {
    let vivo = true;
    chamar<Historico>(consulta(filtro, 0))
      .then((h) => {
        if (!vivo) return;
        setDados(h);
        setLista(h.pedidos);
        setErro(null);
        setCarregando(false);
      })
      .catch((e: ApiErro) => {
        if (!vivo) return;
        setErro(e.message);
        setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, [filtro, chamar, versao]);

  const mudarFiltro = (mudanca: Partial<Filtro>) => {
    setCarregando(true);
    setFiltro((f) => ({ ...f, ...mudanca }));
  };

  async function carregarMais() {
    if (!dados) return;
    try {
      const h = await chamar<Historico>(consulta(filtro, dados.pagina + 1));
      setDados(h);
      setLista((atual) => [...atual, ...h.pedidos]);
    } catch (e) {
      setErro((e as ApiErro).message);
    }
  }

  if (papel === "COZINHA") return <Erro>Só o dono ou o gerente veem o histórico.</Erro>;

  const atalhos = [
    { rotulo: "Hoje", de: diasAtras(0), ate: diasAtras(0) },
    { rotulo: "Ontem", de: diasAtras(1), ate: diasAtras(1) },
    { rotulo: "7 dias", de: diasAtras(6), ate: diasAtras(0) },
    { rotulo: "30 dias", de: diasAtras(29), ate: diasAtras(0) },
  ];
  const campo = "rounded-lg border border-stone-300 bg-white p-2 text-sm";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
      <h1 className="text-xl font-bold">Histórico de pedidos</h1>

      <section aria-label="Filtros" className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-3 shadow-sm">
        <div className="flex gap-1">
          {atalhos.map((a) => (
            <button
              key={a.rotulo}
              onClick={() => mudarFiltro({ de: a.de, ate: a.ate })}
              className={`rounded-full px-3 py-1 text-sm ${filtro.de === a.de && filtro.ate === a.ate ? "bg-marca text-white" : "bg-stone-100"}`}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
        <label className="text-sm">De
          <input type="date" value={filtro.de} max={filtro.ate} onChange={(e) => e.target.value && mudarFiltro({ de: e.target.value })} className={`${campo} ml-1`} />
        </label>
        <label className="text-sm">até
          <input type="date" value={filtro.ate} min={filtro.de} onChange={(e) => e.target.value && mudarFiltro({ ate: e.target.value })} className={`${campo} ml-1`} />
        </label>
        <select aria-label="Situação" value={filtro.situacao} onChange={(e) => mudarFiltro({ situacao: e.target.value })} className={campo}>
          {SITUACOES.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
        </select>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={filtro.soPendente} onChange={(e) => mudarFiltro({ soPendente: e.target.checked })} />
          Só pagamento a receber
        </label>
      </section>

      {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}

      {dados && (
        <section aria-label="Resumo do período" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Cartao rotulo="Pedidos" valor={String(dados.resumo.pedidos)} />
          <Cartao rotulo="Vendido" valor={formatar(centavos(dados.resumo.vendido))} />
          <Cartao rotulo="Recebido" valor={formatar(centavos(dados.resumo.recebido))} destaque="text-green-700" />
          <Cartao rotulo="A receber" valor={formatar(centavos(dados.resumo.aReceber))} destaque={dados.resumo.aReceber > 0 ? "text-amber-700" : undefined} />
          <Cartao rotulo="Cancelados" valor={String(dados.resumo.cancelados)} />
        </section>
      )}

      <section aria-label="Pedidos" className="rounded-xl bg-white shadow-sm">
        {carregando && !dados ? (
          <p className="p-6 text-center text-stone-500">Carregando…</p>
        ) : lista.length === 0 ? (
          <p className="p-6 text-center text-stone-500">Nenhum pedido neste período com esses filtros.</p>
        ) : (
          <ul className={`divide-y divide-stone-100 ${carregando ? "opacity-50" : ""}`}>
            {lista.map((p) => (
              <li key={p.id}>
                <button onClick={() => setAberto(p.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-3 text-left hover:bg-stone-50">
                  <span className="w-16 font-bold tabular-nums">#{String(p.numero).padStart(4, "0")}</span>
                  <span className="w-24 text-sm text-stone-500 tabular-nums">{hora(p.criadoEm)}</span>
                  <span className="min-w-32 flex-1 truncate">{p.clienteNome ?? "—"}</span>
                  <span className="text-sm text-stone-600">{TIPO_ENTREGA[p.tipoEntrega]}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${COR_STATUS[p.status] ?? "bg-blue-100 text-blue-800"}`}>
                    {STATUS_PEDIDO[p.status]}
                  </span>
                  <span className="text-sm">
                    {p.metodoPagamento && METODO_PAGAMENTO[p.metodoPagamento]}
                    {p.statusPagamento === "PENDENTE" && p.status !== "CANCELADO" && <span className="ml-1 font-semibold text-amber-700">· a receber</span>}
                  </span>
                  <span className="w-24 text-right font-semibold tabular-nums">{formatar(centavos(p.total))}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {dados && (
          <footer className="flex items-center justify-between border-t border-stone-100 p-3 text-sm text-stone-500">
            <span>{lista.length} de {dados.totalFiltrado} pedido(s)</span>
            {dados.temMais && <button onClick={carregarMais} className="rounded-lg border border-stone-300 px-3 py-1">Carregar mais</button>}
          </footer>
        )}
      </section>

      {aberto && (
        <DetalhePedido
          id={aberto}
          onFechar={() => setAberto(null)}
          onMudou={() => setVersao((v) => v + 1)}
        />
      )}
    </main>
  );
}

function Cartao({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: string }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <p className="text-xs text-stone-500">{rotulo}</p>
      <p className={`text-lg font-bold tabular-nums ${destaque ?? ""}`}>{valor}</p>
    </div>
  );
}

function DetalhePedido({ id, onFechar, onMudou }: { id: string; onFechar: () => void; onMudou: () => void }) {
  const { chamar } = usePainel();
  const [p, setP] = useState<PedidoDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let vivo = true;
    chamar<PedidoDetalhe>(`${URL}/${id}`)
      .then((d) => vivo && setP(d))
      .catch((e: ApiErro) => vivo && setErro(e.message));
    return () => {
      vivo = false;
    };
  }, [id, chamar, versao]);

  const receber = useCallback(async () => {
    try {
      await chamar(`/api/painel/pedidos/${id}/pagamento/recebido`, { metodo: "POST" });
      setVersao((v) => v + 1);
      onMudou();
    } catch (e) {
      setErro((e as ApiErro).message);
    }
  }, [chamar, id, onMudou]);

  const pendenteNoBalcao = p?.pagamento?.recebidoPelaLoja && p.pagamento.status === "PENDENTE" && p.status !== "CANCELADO";

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onFechar}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detalhe do pedido"
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-2xl font-bold tabular-nums">{p ? `#${String(p.numero).padStart(4, "0")}` : "Pedido"}</h2>
          <button onClick={onFechar} aria-label="Fechar" className="px-2 text-2xl leading-none text-stone-500">×</button>
        </div>
        {erro && <p role="alert" className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-800">{erro}</p>}
        {!p ? (
          !erro && <p className="mt-6 text-stone-500">Carregando…</p>
        ) : (
          <>
            <p className="mt-1">
              <span className={`rounded px-2 py-0.5 text-sm font-semibold ${COR_STATUS[p.status] ?? "bg-blue-100 text-blue-800"}`}>{STATUS_PEDIDO[p.status]}</span>
              <span className="ml-2 text-sm text-stone-500">{TIPO_ENTREGA[p.tipoEntrega]} · {hora(p.criadoEm)}</span>
            </p>
            {p.motivoCancelamento && <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-800">Motivo: {p.motivoCancelamento}</p>}

            <h3 className="mt-5 text-sm font-semibold text-stone-500">Cliente</h3>
            <p>{p.clienteNome ?? "—"}{p.clienteTelefone && <span className="ml-2 text-sm text-stone-500">{p.clienteTelefone}</span>}</p>
            {p.endereco && (
              <p className="text-sm text-stone-600">
                {p.endereco.logradouro}, {p.endereco.numero} {p.endereco.complemento} · {p.endereco.bairro} · {p.endereco.cidade}/{p.endereco.uf}
              </p>
            )}

            <h3 className="mt-5 text-sm font-semibold text-stone-500">Itens</h3>
            <ul className="divide-y divide-stone-100 text-sm">
              {p.itens.map((i, idx) => (
                <li key={idx} className="py-1">
                  <span className="font-semibold">{i.quantidade}x</span> {i.nome}
                  {i.adicionais.length > 0 && <span className="block pl-5 text-xs text-stone-600">{i.adicionais.join(" · ")}</span>}
                  {i.observacao && <span className="block pl-5 text-xs italic text-stone-600">Obs.: {i.observacao}</span>}
                </li>
              ))}
            </ul>
            {p.observacao && <p className="mt-1 text-sm italic text-stone-600">Pedido: {p.observacao}</p>}
            <dl className="mt-2 space-y-0.5 border-t border-stone-200 pt-2 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatar(centavos(p.subtotal))}</dd></div>
              {p.taxaEntrega > 0 && <div className="flex justify-between"><dt>Entrega</dt><dd className="tabular-nums">{formatar(centavos(p.taxaEntrega))}</dd></div>}
              {p.desconto > 0 && <div className="flex justify-between"><dt>Desconto</dt><dd className="tabular-nums">−{formatar(centavos(p.desconto))}</dd></div>}
              <div className="flex justify-between font-bold"><dt>Total</dt><dd className="tabular-nums">{formatar(centavos(p.total))}</dd></div>
            </dl>

            {p.pagamento && (
              <>
                <h3 className="mt-5 text-sm font-semibold text-stone-500">Pagamento</h3>
                <p className="text-sm">
                  {METODO_PAGAMENTO[p.pagamento.metodo]} ·{" "}
                  <span className={p.pagamento.status === "APROVADO" ? "font-semibold text-green-700" : "font-semibold text-amber-700"}>
                    {STATUS_PAGAMENTO[p.pagamento.status]}
                  </span>
                  {p.pagamento.pagoEm && <span className="text-stone-500"> em {hora(p.pagamento.pagoEm)}</span>}
                  {p.pagamento.trocoPara != null && <span className="block text-stone-500">Troco para {formatar(centavos(p.pagamento.trocoPara))}</span>}
                </p>
                {pendenteNoBalcao && (
                  <button onClick={receber} className="mt-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white">
                    Recebi o pagamento
                  </button>
                )}
              </>
            )}

            <h3 className="mt-5 text-sm font-semibold text-stone-500">Linha do tempo</h3>
            <ol className="mt-1 border-l-2 border-stone-200 pl-4 text-sm">
              {p.linhaDoTempo.map((e, idx) => (
                <li key={idx} className="relative pb-2">
                  <span className="absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full bg-marca" aria-hidden />
                  <span className="font-semibold">{STATUS_PEDIDO[e.status]}</span>
                  <span className="ml-2 tabular-nums text-stone-500">{hora(e.quando)}</span>
                  <span className="block text-xs text-stone-500">{e.quem ?? "Cliente / sistema"}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </aside>
    </div>
  );
}
