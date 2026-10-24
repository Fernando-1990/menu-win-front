"use client";

import { useState } from "react";
import { CarrinhoGaveta } from "@/components/CarrinhoGaveta";
import { Carregando, Erro } from "@/components/Mensagem";
import { ProdutoModal } from "@/components/ProdutoModal";
import { precoVigente, subtotal } from "@/lib/carrinho";
import { centavos, formatar } from "@/lib/dinheiro";
import type { ProdutoPublico } from "@/lib/tipos";
import { useCarrinho } from "@/lib/useCarrinho";
import { useLoja } from "./LojaContexto";

export default function CardapioPublico() {
  const { slug, cardapio, erro, naoEncontrada, recarregar } = useLoja();
  const carrinho = useCarrinho(slug);
  const [produtoAberto, setProdutoAberto] = useState<ProdutoPublico | null>(null);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);

  if (erro) {
    return naoEncontrada
      ? <Erro>Não encontramos esta loja. Confira o endereço.</Erro>
      : <Erro acao={<button onClick={recarregar} className="rounded-lg bg-marca px-4 py-2 text-white">Tentar de novo</button>}>{erro}</Erro>;
  }
  if (!cardapio) return <Carregando texto="Carregando cardápio…" />;

  const { loja, categorias } = cardapio;
  const qtdItens = carrinho.itens.reduce((s, i) => s + i.quantidade, 0);
  const grade = loja.layout === "GRADE";

  return (
    <div className="flex flex-1 flex-col pb-24">
      <header className="bg-marca text-white">
        {loja.capaUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa cadastrada pela loja
          <img src={loja.capaUrl} alt="" className="h-36 w-full object-cover" />
        )}
        <div className="mx-auto flex max-w-3xl items-center gap-3 p-4">
          {loja.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa cadastrada pela loja
            <img src={loja.logoUrl} alt="" className="size-14 rounded-full border-2 border-white bg-white object-cover" />
          )}
          <div>
            <h1 className="text-2xl font-bold">{loja.nome}</h1>
            <p className="text-sm opacity-90">
              {loja.aberta ? "Aberto agora" : "Fechado agora"}
              {loja.aceitaDelivery && ` · Entrega ${formatar(centavos(loja.taxaEntrega))}`}
              {loja.pedidoMinimo > 0 && ` · Pedido mínimo ${formatar(centavos(loja.pedidoMinimo))}`}
            </p>
          </div>
        </div>
      </header>

      {!loja.aberta && (
        <p className="bg-amber-100 p-3 text-center text-sm text-amber-900">
          A loja está fechada agora. Você pode ver o cardápio, mas os pedidos estão pausados.
        </p>
      )}

      {categorias.length > 1 && (
        <nav aria-label="Categorias" className="sticky top-0 z-10 overflow-x-auto border-b border-stone-200 bg-white">
          <ul className="mx-auto flex max-w-3xl gap-2 p-2">
            {categorias.map((c) => (
              <li key={c.id}>
                <a href={`#cat-${c.id}`} className="block whitespace-nowrap rounded-full bg-stone-100 px-3 py-1 text-sm">{c.nome}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <main className="mx-auto w-full max-w-3xl flex-1 p-4">
        {categorias.length === 0 && <p className="p-8 text-center text-stone-500">Cardápio em preparação.</p>}
        {categorias.map((c) => (
          <section key={c.id} id={`cat-${c.id}`} className="mb-8 scroll-mt-14">
            <h2 className="mb-3 text-lg font-bold">{c.nome}</h2>
            <ul className={grade ? "grid grid-cols-2 gap-3 sm:grid-cols-3" : "flex flex-col gap-3"}>
              {c.produtos.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setProdutoAberto(p)}
                    disabled={!p.disponivel || !loja.aberta}
                    className={`flex h-full w-full gap-3 rounded-xl bg-white p-3 text-left shadow-sm disabled:opacity-60 ${grade ? "flex-col" : "flex-row-reverse items-center justify-between"}`}
                  >
                    {p.fotoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- URL externa cadastrada pela loja
                      <img src={p.fotoUrl} alt="" className={grade ? "aspect-square w-full rounded-lg object-cover" : "size-20 shrink-0 rounded-lg object-cover"} />
                    )}
                    <span className="flex flex-col">
                      <span className="font-semibold">{p.nome}</span>
                      {p.descricao && <span className="line-clamp-2 text-sm text-stone-500">{p.descricao}</span>}
                      <span className="mt-1">
                        {p.precoPromocional != null && (
                          <span className="mr-2 text-sm text-stone-400 line-through">{formatar(centavos(p.preco))}</span>
                        )}
                        <span className="font-semibold text-marca">{formatar(precoVigente(p))}</span>
                      </span>
                      {!p.disponivel && <span className="text-sm font-semibold text-stone-500">Esgotado hoje</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      {qtdItens > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 p-3">
          <button
            onClick={() => setCarrinhoAberto(true)}
            className="mx-auto flex w-full max-w-3xl items-center justify-between rounded-xl bg-marca px-4 py-3 font-semibold text-white shadow-lg"
          >
            <span>Ver pedido ({qtdItens})</span>
            <span className="tabular-nums">{formatar(subtotal(carrinho.itens))}</span>
          </button>
        </div>
      )}

      {produtoAberto && (
        <ProdutoModal
          produto={produtoAberto}
          onFechar={() => setProdutoAberto(null)}
          onAdicionar={(item) => {
            carrinho.adicionar(item);
            setProdutoAberto(null);
          }}
        />
      )}
      {carrinhoAberto && (
        <CarrinhoGaveta
          slug={slug}
          itens={carrinho.itens}
          lojaAberta={loja.aberta}
          onMudarQuantidade={carrinho.mudarQuantidade}
          onFechar={() => setCarrinhoAberto(false)}
        />
      )}
    </div>
  );
}
