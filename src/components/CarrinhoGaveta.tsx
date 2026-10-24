"use client";

import Link from "next/link";
import { subtotal, totalItem, type ItemCarrinho } from "@/lib/carrinho";
import { formatar } from "@/lib/dinheiro";

interface Props {
  slug: string;
  itens: ItemCarrinho[];
  lojaAberta: boolean;
  onMudarQuantidade: (chave: string, quantidade: number) => void;
  onFechar: () => void;
}

export function CarrinhoGaveta({ slug, itens, lojaAberta, onMudarQuantidade, onFechar }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={onFechar}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Seu pedido"
        className="flex h-full w-full max-w-md flex-col bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-stone-200 p-4">
          <h2 className="text-lg font-bold">Seu pedido</h2>
          <button onClick={onFechar} aria-label="Fechar" className="px-2 text-2xl leading-none text-stone-500">×</button>
        </header>

        {itens.length === 0 ? (
          <p className="p-6 text-center text-stone-500">Seu carrinho está vazio.</p>
        ) : (
          <ul className="flex-1 divide-y divide-stone-100 overflow-y-auto px-4">
            {itens.map((i) => (
              <li key={i.chave} className="py-3">
                <div className="flex justify-between gap-3">
                  <span className="font-medium">{i.nome}</span>
                  <span className="tabular-nums">{formatar(totalItem(i))}</span>
                </div>
                {i.adicionais.length > 0 && (
                  <p className="text-sm text-stone-500">
                    {i.adicionais.map((a) => (a.quantidade > 1 ? `${a.quantidade}x ${a.nome}` : a.nome)).join(", ")}
                  </p>
                )}
                {i.observacao && <p className="text-sm italic text-stone-500">“{i.observacao}”</p>}
                <div className="mt-2 flex items-center gap-2">
                  <button aria-label={`Diminuir ${i.nome}`} onClick={() => onMudarQuantidade(i.chave, i.quantidade - 1)} className="size-7 rounded-full border border-stone-300">−</button>
                  <span className="w-5 text-center tabular-nums">{i.quantidade}</span>
                  <button aria-label={`Aumentar ${i.nome}`} onClick={() => onMudarQuantidade(i.chave, i.quantidade + 1)} className="size-7 rounded-full border border-stone-300">+</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <footer className="border-t border-stone-200 p-4">
          <div className="mb-3 flex justify-between font-semibold">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatar(subtotal(itens))}</span>
          </div>
          {lojaAberta ? (
            <Link
              href={`/${slug}/checkout`}
              aria-disabled={itens.length === 0}
              className={`block rounded-lg bg-marca px-4 py-3 text-center font-semibold text-white ${itens.length === 0 ? "pointer-events-none opacity-40" : ""}`}
            >
              Continuar
            </Link>
          ) : (
            <p className="rounded-lg bg-stone-100 p-3 text-center text-sm text-stone-600">A loja está fechada agora.</p>
          )}
        </footer>
      </aside>
    </div>
  );
}
