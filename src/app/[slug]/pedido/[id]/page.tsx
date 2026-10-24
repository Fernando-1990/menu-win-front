"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Carregando, Erro } from "@/components/Mensagem";
import { api, type ApiErro } from "@/lib/api";
import { centavos, formatar } from "@/lib/dinheiro";
import { METODO_PAGAMENTO, STATUS_PEDIDO } from "@/lib/rotulos";
import type { PedidoStatus, StatusPedido } from "@/lib/tipos";
import { useLoja } from "../../LojaContexto";

const ETAPAS: StatusPedido[] = ["RECEBIDO", "EM_PREPARO", "PRONTO", "ENTREGUE"];
const FINAIS: StatusPedido[] = ["ENTREGUE", "CANCELADO"];

/** Acompanhamento pelo cliente: consulta a cada 4s até o pedido terminar. */
export default function AcompanharPedido() {
  const { id } = useParams<{ id: string }>();
  const { slug, cardapio } = useLoja();
  const [pedido, setPedido] = useState<PedidoStatus | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [qrCode] = useState<string | null>(() => {
    try {
      return typeof window === "undefined" ? null : JSON.parse(sessionStorage.getItem(`menuwin.pix.${id}`) ?? "null")?.qrCodeBase64 ?? null;
    } catch {
      return null;
    }
  });
  const [copiado, setCopiado] = useState(false);

  const terminou = pedido != null && FINAIS.includes(pedido.status) && pedido.statusPagamento !== "PENDENTE";

  useEffect(() => {
    if (terminou) return;
    let vivo = true;
    const buscar = () =>
      api<PedidoStatus>(`/api/public/lojas/${slug}/pedidos/${id}`)
        .then((p) => vivo && (setPedido(p), setErro(null)))
        .catch((e: ApiErro) => vivo && setErro(e.message));
    buscar();
    const timer = setInterval(buscar, 4000);
    return () => {
      vivo = false;
      clearInterval(timer);
    };
  }, [slug, id, terminou]);

  if (!pedido) return erro ? <Erro>{erro}</Erro> : <Carregando texto="Carregando seu pedido…" />;

  const aguardandoPix = pedido.status === "AGUARDANDO_PAGAMENTO" && pedido.pixCopiaECola;
  const etapaAtual = ETAPAS.indexOf(pedido.status === "SAIU_PARA_ENTREGA" ? "PRONTO" : pedido.status);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(pedido!.pixCopiaECola!);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // sem permissão de clipboard: o código continua visível para copiar à mão
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 p-4">
      <p className="text-sm text-stone-500">Pedido</p>
      <h1 className="text-4xl font-bold tabular-nums">#{String(pedido.numero).padStart(4, "0")}</h1>
      <p className="mt-1 text-lg">{STATUS_PEDIDO[pedido.status]}</p>

      {pedido.status === "CANCELADO" ? (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-red-800">
          Pedido cancelado{pedido.motivoCancelamento ? `: ${pedido.motivoCancelamento}` : "."}
        </p>
      ) : aguardandoPix ? (
        <section className="mt-5 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Pague com Pix para enviar seu pedido à cozinha</h2>
          {qrCode && (
            // eslint-disable-next-line @next/next/no-img-element -- imagem base64 gerada pelo Mercado Pago
            <img src={`data:image/png;base64,${qrCode}`} alt="QR code do Pix" className="mx-auto my-4 size-56" />
          )}
          <p className="mt-2 text-sm text-stone-600">Ou copie o código e cole no app do seu banco:</p>
          <textarea readOnly value={pedido.pixCopiaECola!} rows={3} className="mt-1 w-full rounded-lg border border-stone-300 p-2 font-mono text-xs" />
          <button onClick={copiar} className="mt-2 w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white">
            {copiado ? "Copiado!" : "Copiar código Pix"}
          </button>
          {pedido.pixExpiraEm && (
            <p className="mt-2 text-center text-xs text-stone-500">
              Válido até {new Date(pedido.pixExpiraEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.
              Esta tela atualiza sozinha quando o pagamento for confirmado.
            </p>
          )}
          {cardapio?.loja.pixSimulado && (
            <SimuladorPix slug={slug} pedidoId={id} onSimulado={(p) => setPedido(p)} />
          )}
        </section>
      ) : (
        <ol className="mt-6 flex flex-col gap-3" aria-label="Andamento">
          {ETAPAS.map((s, i) => (
            <li key={s} className={`flex items-center gap-3 ${i <= etapaAtual ? "font-semibold" : "text-stone-400"}`}>
              <span className={`size-4 rounded-full ${i <= etapaAtual ? "bg-marca" : "bg-stone-300"}`} aria-hidden />
              {s === "PRONTO" && pedido.status === "SAIU_PARA_ENTREGA" ? "Saiu para entrega" : STATUS_PEDIDO[s]}
            </li>
          ))}
        </ol>
      )}

      <dl className="mt-6 space-y-1 text-sm">
        <div className="flex justify-between"><dt>Total</dt><dd className="font-semibold tabular-nums">{formatar(centavos(pedido.total))}</dd></div>
        <div className="flex justify-between"><dt>Pagamento</dt><dd>{METODO_PAGAMENTO[pedido.metodoPagamento]}</dd></div>
      </dl>

      {erro && <p className="mt-4 text-sm text-amber-800">Sem conexão no momento; tentando de novo…</p>}

      <Link href={`/${slug}`} className="mt-8 block text-center text-marca">Voltar ao cardápio</Link>
    </main>
  );
}

/**
 * Só aparece com o Pix simulado (API em dev). Faz o papel do banco: a API processa pelo
 * mesmo caminho do webhook real do Mercado Pago.
 */
function SimuladorPix({ slug, pedidoId, onSimulado }: { slug: string; pedidoId: string; onSimulado: (p: PedidoStatus) => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function simular(status: "APROVADO" | "EXPIRADO") {
    setErro(null);
    setEnviando(true);
    try {
      onSimulado(await api<PedidoStatus>(`/api/public/lojas/${slug}/simulador-pix/${pedidoId}?status=${status}`, { metodo: "POST" }));
    } catch (e) {
      setErro((e as ApiErro).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border-2 border-dashed border-amber-500 bg-amber-50 p-3">
      <p className="text-sm font-semibold text-amber-900">Ambiente de teste: este Pix é simulado e não pode ser pago.</p>
      <div className="mt-2 flex gap-2">
        <button disabled={enviando} onClick={() => simular("APROVADO")} className="flex-1 rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Simular pagamento aprovado
        </button>
        <button disabled={enviando} onClick={() => simular("EXPIRADO")} className="flex-1 rounded-lg border border-stone-400 px-3 py-2 text-sm disabled:opacity-50">
          Simular Pix expirado
        </button>
      </div>
      {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}
    </div>
  );
}
