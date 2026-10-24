// Regras do carrinho, sem React: testadas em carrinho.test.ts.
// Espelham o PedidoPublicoService da API, que é quem decide de verdade (o servidor recalcula tudo).

import { centavos } from "./dinheiro";
import type { CriarPedido, ProdutoPublico } from "./tipos";

export interface SelecaoAdicional {
  opcaoId: string;
  quantidade: number;
}

export interface AdicionalNoCarrinho {
  opcaoId: string;
  grupoNome: string;
  nome: string;
  precoCentavos: number;
  quantidade: number;
}

export interface ItemCarrinho {
  /** Mesmo produto + mesmos adicionais + mesma observação = mesma linha (soma a quantidade). */
  chave: string;
  produtoId: string;
  nome: string;
  precoUnitarioCentavos: number;
  quantidade: number;
  observacao: string;
  adicionais: AdicionalNoCarrinho[];
}

export function precoVigente(p: Pick<ProdutoPublico, "preco" | "precoPromocional">): number {
  return centavos(p.precoPromocional ?? p.preco);
}

/** Mesmas regras e mensagens da API: por grupo, soma das quantidades entre mínimo e máximo. */
export function validarSelecao(produto: ProdutoPublico, selecao: SelecaoAdicional[]): string[] {
  const erros: string[] = [];
  for (const g of produto.grupos) {
    const ids = new Set(g.opcoes.map((o) => o.id));
    const escolhidas = selecao.filter((s) => ids.has(s.opcaoId)).reduce((soma, s) => soma + s.quantidade, 0);
    if (escolhidas < g.minimo) erros.push(`Escolha pelo menos ${g.minimo} em "${g.nome}"`);
    if (escolhidas > g.maximo) erros.push(`No máximo ${g.maximo} em "${g.nome}"`);
  }
  return erros;
}

export function montarItem(
  produto: ProdutoPublico,
  selecao: SelecaoAdicional[],
  quantidade: number,
  observacao = "",
): ItemCarrinho {
  const adicionais: AdicionalNoCarrinho[] = [];
  for (const g of produto.grupos) {
    for (const o of g.opcoes) {
      const s = selecao.find((x) => x.opcaoId === o.id);
      if (s && s.quantidade > 0) {
        adicionais.push({ opcaoId: o.id, grupoNome: g.nome, nome: o.nome, precoCentavos: centavos(o.preco), quantidade: s.quantidade });
      }
    }
  }
  const obs = observacao.trim();
  const chave = [produto.id, ...adicionais.map((a) => `${a.opcaoId}x${a.quantidade}`).sort(), obs].join("|");
  return { chave, produtoId: produto.id, nome: produto.nome, precoUnitarioCentavos: precoVigente(produto), quantidade, observacao: obs, adicionais };
}

/** (preço + adicionais de uma unidade) × quantidade — igual a ItemPedido.calcularTotal na API. */
export function totalItem(item: ItemCarrinho): number {
  const adicionais = item.adicionais.reduce((soma, a) => soma + a.precoCentavos * a.quantidade, 0);
  return (item.precoUnitarioCentavos + adicionais) * item.quantidade;
}

export function subtotal(itens: ItemCarrinho[]): number {
  return itens.reduce((soma, i) => soma + totalItem(i), 0);
}

export function adicionar(itens: ItemCarrinho[], novo: ItemCarrinho): ItemCarrinho[] {
  const existente = itens.find((i) => i.chave === novo.chave);
  if (!existente) return [...itens, novo];
  return itens.map((i) => (i.chave === novo.chave ? { ...i, quantidade: i.quantidade + novo.quantidade } : i));
}

export function mudarQuantidade(itens: ItemCarrinho[], chave: string, quantidade: number): ItemCarrinho[] {
  if (quantidade <= 0) return itens.filter((i) => i.chave !== chave);
  return itens.map((i) => (i.chave === chave ? { ...i, quantidade: Math.min(quantidade, 99) } : i));
}

export function paraPedido(itens: ItemCarrinho[]): CriarPedido["itens"] {
  return itens.map((i) => ({
    produtoId: i.produtoId,
    quantidade: i.quantidade,
    observacao: i.observacao || undefined,
    adicionais: i.adicionais.map((a) => ({ opcaoId: a.opcaoId, quantidade: a.quantidade })),
  }));
}
