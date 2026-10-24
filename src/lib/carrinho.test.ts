import { describe, expect, it } from "vitest";
import { adicionar, montarItem, mudarQuantidade, paraPedido, subtotal, totalItem, validarSelecao } from "./carrinho";
import { formatar, lerReais, paraApi } from "./dinheiro";
import type { ProdutoPublico } from "./tipos";

// Mesmo cardápio do PedidoPublicoTest da API, para os totais baterem com o servidor.
const xBurguer: ProdutoPublico = {
  id: "x", nome: "X-Burguer", descricao: null, fotoUrl: null, preco: 20, precoPromocional: 18, disponivel: true,
  grupos: [
    { id: "pao", nome: "Pão", minimo: 1, maximo: 1, opcoes: [{ id: "frances", nome: "Francês", preco: 0 }, { id: "australiano", nome: "Australiano", preco: 2 }] },
    { id: "extras", nome: "Extras", minimo: 0, maximo: 3, opcoes: [{ id: "bacon", nome: "Bacon", preco: 3 }] },
  ],
};

describe("validarSelecao", () => {
  it("exige o mínimo e respeita o máximo por grupo, com as mensagens da API", () => {
    expect(validarSelecao(xBurguer, [])).toEqual(['Escolha pelo menos 1 em "Pão"']);
    expect(validarSelecao(xBurguer, [{ opcaoId: "frances", quantidade: 1 }, { opcaoId: "australiano", quantidade: 1 }]))
      .toEqual(['No máximo 1 em "Pão"']);
    expect(validarSelecao(xBurguer, [{ opcaoId: "frances", quantidade: 1 }, { opcaoId: "bacon", quantidade: 4 }]))
      .toEqual(['No máximo 3 em "Extras"']);
    expect(validarSelecao(xBurguer, [{ opcaoId: "frances", quantidade: 1 }, { opcaoId: "bacon", quantidade: 3 }])).toEqual([]);
  });
});

describe("totais", () => {
  it("bate com o cálculo do servidor: (18 + 2 + 2x3) x 2 = 52", () => {
    const item = montarItem(xBurguer, [{ opcaoId: "australiano", quantidade: 1 }, { opcaoId: "bacon", quantidade: 2 }], 2);
    expect(item.precoUnitarioCentavos).toBe(1800);   // usa o promocional
    expect(totalItem(item)).toBe(5200);
    expect(paraApi(subtotal([item]))).toBe("52.00");
  });

  it("não sofre com ponto flutuante", () => {
    const p = { ...xBurguer, preco: 0.1, precoPromocional: null, grupos: [] };
    const itens = [montarItem(p, [], 1), montarItem({ ...p, id: "y", preco: 0.2 }, [], 1)];
    expect(paraApi(subtotal(itens))).toBe("0.30");
  });
});

describe("carrinho", () => {
  it("junta itens iguais e separa os diferentes", () => {
    const comBacon = montarItem(xBurguer, [{ opcaoId: "frances", quantidade: 1 }, { opcaoId: "bacon", quantidade: 1 }], 1);
    const semBacon = montarItem(xBurguer, [{ opcaoId: "frances", quantidade: 1 }], 1);
    let itens = adicionar([], comBacon);
    itens = adicionar(itens, { ...comBacon, quantidade: 2 });
    itens = adicionar(itens, semBacon);
    expect(itens).toHaveLength(2);
    expect(itens[0].quantidade).toBe(3);

    itens = mudarQuantidade(itens, semBacon.chave, 0);
    expect(itens).toHaveLength(1);
  });

  it("monta o corpo do pedido sem preços (o servidor calcula)", () => {
    const item = montarItem(xBurguer, [{ opcaoId: "frances", quantidade: 1 }], 1, "  sem cebola ");
    expect(paraPedido([item])).toEqual([
      { produtoId: "x", quantidade: 1, observacao: "sem cebola", adicionais: [{ opcaoId: "frances", quantidade: 1 }] },
    ]);
  });
});

describe("dinheiro", () => {
  it("formata e lê valores em reais", () => {
    expect(formatar(1950).replace(/\s/g, " ")).toBe("R$ 19,50");
    expect(lerReais("12,50")).toBe(1250);
    expect(lerReais("R$ 1.234,56")).toBe(123456);
    expect(lerReais("7")).toBe(700);
    expect(lerReais("abc")).toBeNull();
    expect(lerReais("1,234")).toBeNull();
  });
});
