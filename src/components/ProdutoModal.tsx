"use client";

import { useState } from "react";
import { montarItem, precoVigente, totalItem, validarSelecao, type ItemCarrinho, type SelecaoAdicional } from "@/lib/carrinho";
import { centavos, formatar } from "@/lib/dinheiro";
import type { GrupoPublico, ProdutoPublico } from "@/lib/tipos";

interface Props {
  produto: ProdutoPublico;
  onFechar: () => void;
  onAdicionar: (item: ItemCarrinho) => void;
}

export function ProdutoModal({ produto, onFechar, onAdicionar }: Props) {
  const [selecao, setSelecao] = useState<SelecaoAdicional[]>([]);
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");
  const [tentou, setTentou] = useState(false);

  const erros = validarSelecao(produto, selecao);
  const previa = montarItem(produto, selecao, quantidade, observacao);

  const qtdDe = (opcaoId: string) => selecao.find((s) => s.opcaoId === opcaoId)?.quantidade ?? 0;
  const somaDoGrupo = (g: GrupoPublico) => g.opcoes.reduce((s, o) => s + qtdDe(o.id), 0);

  function definir(g: GrupoPublico, opcaoId: string, qtd: number) {
    setSelecao((atual) => {
      // grupo de escolha única: trocar a opção em vez de somar
      const base = g.maximo === 1 ? atual.filter((s) => !g.opcoes.some((o) => o.id === s.opcaoId)) : atual.filter((s) => s.opcaoId !== opcaoId);
      return qtd > 0 ? [...base, { opcaoId, quantidade: qtd }] : base;
    });
  }

  function confirmar() {
    setTentou(true);
    if (erros.length === 0) onAdicionar(previa);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center" onClick={onFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="produto-titulo"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-y-auto p-5">
          {produto.fotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa cadastrada pela loja
            <img src={produto.fotoUrl} alt="" className="mb-4 h-48 w-full rounded-xl object-cover" />
          )}
          <div className="flex items-start justify-between gap-3">
            <h2 id="produto-titulo" className="text-xl font-bold">{produto.nome}</h2>
            <button onClick={onFechar} aria-label="Fechar" className="rounded-full px-2 text-2xl leading-none text-stone-500">×</button>
          </div>
          {produto.descricao && <p className="mt-1 text-stone-600">{produto.descricao}</p>}
          <p className="mt-2 font-semibold">{formatar(precoVigente(produto))}</p>

          {produto.grupos.map((g) => {
            const soma = somaDoGrupo(g);
            const faltando = tentou && soma < g.minimo;
            return (
              <fieldset key={g.id} className="mt-5">
                <legend className="flex w-full items-center justify-between rounded-lg bg-stone-100 px-3 py-2">
                  <span className="font-semibold">{g.nome}</span>
                  <span className={`text-xs ${faltando ? "font-bold text-red-700" : "text-stone-500"}`}>
                    {g.minimo > 0 ? "Obrigatório · " : ""}
                    {g.maximo === 1 ? "escolha 1" : `até ${g.maximo}`}
                  </span>
                </legend>
                <ul className="mt-1 divide-y divide-stone-100">
                  {g.opcoes.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                      <span>
                        {o.nome}
                        {o.preco > 0 && <span className="ml-2 text-sm text-stone-500">+ {formatar(centavos(o.preco))}</span>}
                      </span>
                      {g.maximo === 1 ? (
                        <input
                          type="radio"
                          name={g.id}
                          aria-label={o.nome}
                          checked={qtdDe(o.id) === 1}
                          onChange={() => definir(g, o.id, 1)}
                          className="size-5 accent-[var(--cor)]"
                        />
                      ) : (
                        <Contador
                          valor={qtdDe(o.id)}
                          rotulo={o.nome}
                          podeAumentar={soma < g.maximo}
                          onMudar={(q) => definir(g, o.id, q)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </fieldset>
            );
          })}

          <label className="mt-5 block">
            <span className="text-sm font-semibold">Observação</span>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              maxLength={140}
              rows={2}
              placeholder="Ex.: sem cebola"
              className="mt-1 w-full rounded-lg border border-stone-300 p-2"
            />
          </label>

          {tentou && erros.length > 0 && (
            <ul className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
              {erros.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-stone-200 p-4">
          <Contador valor={quantidade} rotulo="quantidade" minimo={1} podeAumentar={quantidade < 99} onMudar={setQuantidade} />
          <button onClick={confirmar} className="flex-1 rounded-lg bg-marca px-4 py-3 font-semibold text-white">
            Adicionar · {formatar(totalItem(previa))}
          </button>
        </div>
      </div>
    </div>
  );
}

function Contador({ valor, rotulo, minimo = 0, podeAumentar, onMudar }: {
  valor: number; rotulo: string; minimo?: number; podeAumentar: boolean; onMudar: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Diminuir ${rotulo}`}
        disabled={valor <= minimo}
        onClick={() => onMudar(valor - 1)}
        className="size-8 rounded-full border border-stone-300 text-lg disabled:opacity-30"
      >−</button>
      <span className="w-5 text-center tabular-nums" aria-live="polite">{valor}</span>
      <button
        type="button"
        aria-label={`Aumentar ${rotulo}`}
        disabled={!podeAumentar}
        onClick={() => onMudar(valor + 1)}
        className="size-8 rounded-full border border-stone-300 text-lg disabled:opacity-30"
      >+</button>
    </div>
  );
}
