"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Carregando, Erro } from "@/components/Mensagem";
import { api, ApiErro } from "@/lib/api";
import { paraPedido, subtotal, totalItem } from "@/lib/carrinho";
import { centavos, formatar, lerReais, paraApi } from "@/lib/dinheiro";
import type { CriarPedido, LojaInfo, MetodoPagamento, PedidoCriado, TipoEntrega } from "@/lib/tipos";
import { TIPO_ENTREGA } from "@/lib/rotulos";
import { useCarrinho } from "@/lib/useCarrinho";
import { useLoja } from "../LojaContexto";

/** Formas de pagamento que fazem sentido para cada tipo de atendimento, conforme o que a loja liga. */
function metodosPara(tipo: TipoEntrega, loja: LojaInfo): { valor: MetodoPagamento; rotulo: string }[] {
  const lista: { valor: MetodoPagamento; rotulo: string }[] = [];
  if (loja.aceitaPix) lista.push({ valor: "PIX", rotulo: "Pix agora (pelo celular)" });
  if (tipo === "DELIVERY") {
    lista.push({ valor: "DINHEIRO_NA_ENTREGA", rotulo: "Dinheiro na entrega" }, { valor: "CARTAO_NA_ENTREGA", rotulo: "Cartão na entrega" });
  } else if (loja.aceitaPagarNoCaixa) {
    lista.push({ valor: "NO_CAIXA", rotulo: tipo === "CONSUMO_LOCAL" ? "Pagar no caixa ao sair" : "Pagar no caixa ao retirar" });
  } else {
    lista.push({ valor: "DINHEIRO_NA_ENTREGA", rotulo: "Dinheiro na retirada" }, { valor: "CARTAO_NA_ENTREGA", rotulo: "Cartão na retirada" });
  }
  return lista;
}

const CHAVE_CLIENTE = "menuwin.cliente";

function clienteSalvo(): { nome: string; telefone: string; email: string } {
  try {
    return { nome: "", telefone: "", email: "", ...JSON.parse(localStorage.getItem(CHAVE_CLIENTE) ?? "{}") };
  } catch {
    return { nome: "", telefone: "", email: "" };
  }
}

export default function Checkout() {
  const { slug, cardapio, erro: erroCardapio, recarregar } = useLoja();
  const carrinho = useCarrinho(slug);
  const router = useRouter();

  const [tipoEscolhido, setTipo] = useState<TipoEntrega | null>(null);
  const [metodoEscolhido, setMetodo] = useState<MetodoPagamento | null>(null);
  const [cliente, setCliente] = useState(() => (typeof window === "undefined" ? { nome: "", telefone: "", email: "" } : clienteSalvo()));
  const [endereco, setEndereco] = useState({ logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", cep: "" });
  const [troco, setTroco] = useState("");
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (erroCardapio) return <Erro>{erroCardapio}</Erro>;
  if (!cardapio) return <Carregando />;
  const { loja } = cardapio;

  const tipos = (["CONSUMO_LOCAL", "RETIRADA", "DELIVERY"] as TipoEntrega[]).filter((t) =>
    t === "RETIRADA" ? loja.aceitaRetirada : t === "DELIVERY" ? loja.aceitaDelivery : loja.aceitaConsumoLocal);
  const tipo = tipoEscolhido && tipos.includes(tipoEscolhido) ? tipoEscolhido : tipos[0];
  const metodos = tipo ? metodosPara(tipo, loja) : [];
  const metodo = metodoEscolhido && metodos.some((m) => m.valor === metodoEscolhido) ? metodoEscolhido : metodos[0]?.valor;

  const sub = subtotal(carrinho.itens);
  const taxa = tipo === "DELIVERY" ? centavos(loja.taxaEntrega) : 0;
  const total = sub + taxa;
  const minimo = centavos(loja.pedidoMinimo);

  if (carrinho.itens.length === 0) {
    return (
      <Erro acao={<Link href={`/${slug}`} className="rounded-lg bg-marca px-4 py-2 text-white">Ver cardápio</Link>}>
        Seu carrinho está vazio.
      </Erro>
    );
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!tipo || !metodo) return;
    setErro(null);
    if (sub < minimo) return setErro(`O pedido mínimo é ${formatar(minimo)}.`);
    const trocoCentavos = metodo === "DINHEIRO_NA_ENTREGA" && troco.trim() ? lerReais(troco) : null;
    if (metodo === "DINHEIRO_NA_ENTREGA" && troco.trim() && trocoCentavos == null) return setErro("Valor do troco inválido.");

    const pedido: CriarPedido = {
      tipoEntrega: tipo,
      metodoPagamento: metodo,
      cliente: { nome: cliente.nome, telefone: cliente.telefone, email: cliente.email.trim() || undefined },
      endereco: tipo === "DELIVERY" ? { ...endereco, uf: endereco.uf.toUpperCase() } : undefined,
      itens: paraPedido(carrinho.itens),
      trocoPara: trocoCentavos != null ? paraApi(trocoCentavos) : undefined,
      observacao: observacao.trim() || undefined,
      totalEsperado: paraApi(total),   // se o preço mudou no meio-tempo, a API recusa (409) em vez de cobrar diferente
    };

    setEnviando(true);
    try {
      const criado = await api<PedidoCriado>(`/api/public/lojas/${slug}/pedidos`, { metodo: "POST", corpo: pedido });
      try {
        localStorage.setItem(CHAVE_CLIENTE, JSON.stringify(cliente));
        if (criado.pix) sessionStorage.setItem(`menuwin.pix.${criado.id}`, JSON.stringify(criado.pix));
      } catch {
        // sem storage: só perde a conveniência
      }
      carrinho.limpar();
      router.push(`/${slug}/pedido/${criado.id}`);
    } catch (e) {
      const err = e as ApiErro;
      setErro(err.message);
      if (err.status === 409) recarregar();   // loja fechou ou preço mudou: atualiza o cardápio
    } finally {
      setEnviando(false);
    }
  }

  const campo = "mt-1 w-full rounded-lg border border-stone-300 bg-white p-2";

  return (
    <main className="mx-auto w-full max-w-lg flex-1 p-4 pb-10">
      <Link href={`/${slug}`} className="text-sm text-marca">← Voltar ao cardápio</Link>
      <h1 className="mt-2 text-2xl font-bold">Finalizar pedido</h1>

      <form onSubmit={enviar} className="mt-4 flex flex-col gap-5">
        <fieldset>
          <legend className="font-semibold">Como você quer receber?</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {tipos.map((t) => (
              <label key={t} className={`cursor-pointer rounded-lg border p-3 text-center text-sm ${t === tipo ? "border-marca bg-marca/10 font-semibold" : "border-stone-300 bg-white"}`}>
                <input type="radio" name="tipo" value={t} checked={t === tipo} onChange={() => setTipo(t)} className="sr-only" />
                {TIPO_ENTREGA[t]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="font-semibold">Seus dados</legend>
          <label className="text-sm">Nome
            <input required maxLength={120} autoComplete="name" value={cliente.nome} onChange={(e) => setCliente({ ...cliente, nome: e.target.value })} className={campo} />
          </label>
          <label className="text-sm">Celular com DDD
            <input required type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 98888-7777" value={cliente.telefone} onChange={(e) => setCliente({ ...cliente, telefone: e.target.value })} className={campo} />
          </label>
          <label className="text-sm">E-mail {metodo === "PIX" ? "(obrigatório para Pix)" : "(opcional)"}
            <input type="email" required={metodo === "PIX"} autoComplete="email" value={cliente.email} onChange={(e) => setCliente({ ...cliente, email: e.target.value })} className={campo} />
          </label>
        </fieldset>

        {tipo === "DELIVERY" && (
          <fieldset className="grid grid-cols-6 gap-3">
            <legend className="col-span-6 font-semibold">Endereço de entrega</legend>
            <label className="col-span-4 text-sm">Rua
              <input required autoComplete="address-line1" value={endereco.logradouro} onChange={(e) => setEndereco({ ...endereco, logradouro: e.target.value })} className={campo} />
            </label>
            <label className="col-span-2 text-sm">Número
              <input required value={endereco.numero} onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })} className={campo} />
            </label>
            <label className="col-span-6 text-sm">Complemento
              <input autoComplete="address-line2" value={endereco.complemento} onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })} className={campo} />
            </label>
            <label className="col-span-3 text-sm">Bairro
              <input required value={endereco.bairro} onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })} className={campo} />
            </label>
            <label className="col-span-2 text-sm">Cidade
              <input required autoComplete="address-level2" value={endereco.cidade} onChange={(e) => setEndereco({ ...endereco, cidade: e.target.value })} className={campo} />
            </label>
            <label className="col-span-1 text-sm">UF
              <input required maxLength={2} minLength={2} value={endereco.uf} onChange={(e) => setEndereco({ ...endereco, uf: e.target.value })} className={`${campo} uppercase`} />
            </label>
          </fieldset>
        )}

        <fieldset>
          <legend className="font-semibold">Pagamento</legend>
          <div className="mt-2 flex flex-col gap-2">
            {metodos.map((m) => (
              <label key={m.valor} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${m.valor === metodo ? "border-marca bg-marca/10" : "border-stone-300 bg-white"}`}>
                <input type="radio" name="metodo" checked={m.valor === metodo} onChange={() => setMetodo(m.valor)} className="accent-[var(--cor)]" />
                {m.rotulo}
              </label>
            ))}
          </div>
          {metodo === "DINHEIRO_NA_ENTREGA" && (
            <label className="mt-3 block text-sm">Troco para quanto? (opcional)
              <input inputMode="decimal" placeholder="Ex.: 50,00" value={troco} onChange={(e) => setTroco(e.target.value)} className={campo} />
            </label>
          )}
        </fieldset>

        <label className="text-sm font-semibold">Observação do pedido
          <textarea maxLength={500} rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} className={`${campo} font-normal`} />
        </label>

        <section aria-label="Resumo" className="rounded-xl bg-white p-4 shadow-sm">
          <ul className="divide-y divide-stone-100 text-sm">
            {carrinho.itens.map((i) => (
              <li key={i.chave} className="flex justify-between gap-3 py-1">
                <span>{i.quantidade}x {i.nome}</span>
                <span className="tabular-nums">{formatar(totalItem(i))}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-stone-200 pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatar(sub)}</dd></div>
            {taxa > 0 && <div className="flex justify-between"><dt>Entrega</dt><dd className="tabular-nums">{formatar(taxa)}</dd></div>}
            <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{formatar(total)}</dd></div>
          </dl>
          {sub < minimo && <p className="mt-2 text-sm text-red-700">Pedido mínimo: {formatar(minimo)}</p>}
        </section>

        {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
        {!loja.aberta && <p className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900">A loja está fechada agora.</p>}

        <button
          type="submit"
          disabled={enviando || !loja.aberta || !tipo || !metodo}
          className="rounded-lg bg-marca px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {enviando ? "Enviando…" : `Fazer pedido · ${formatar(total)}`}
        </button>
      </form>
    </main>
  );
}
