"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Carregando, Erro } from "@/components/Mensagem";
import type { ApiErro } from "@/lib/api";
import { centavos, formatar, lerReais, paraApi } from "@/lib/dinheiro";
import type { CategoriaPainel, GrupoPainel, ProdutoPainel } from "@/lib/tipos";
import { usePainel } from "../PainelContexto";

const BASE = "/api/painel/cardapio";
const campo = "mt-1 w-full rounded-lg border border-stone-300 bg-white p-2";
const botaoPrimario = "rounded-lg bg-marca px-4 py-2 font-semibold text-white disabled:opacity-50";

type Aba = "produtos" | "categorias" | "adicionais";

function buscarTudo(chamar: ReturnType<typeof usePainel>["chamar"]) {
  return Promise.all([
    chamar<CategoriaPainel[]>(`${BASE}/categorias`),
    chamar<ProdutoPainel[]>(`${BASE}/produtos`),
    chamar<GrupoPainel[]>(`${BASE}/grupos`),
  ]);
}

export function Tela() {
  const { papel, chamar } = usePainel();
  const [aba, setAba] = useState<Aba>("produtos");
  const [categorias, setCategorias] = useState<CategoriaPainel[] | null>(null);
  const [produtos, setProdutos] = useState<ProdutoPainel[]>([]);
  const [grupos, setGrupos] = useState<GrupoPainel[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const aplicar = useCallback(([c, p, g]: Awaited<ReturnType<typeof buscarTudo>>) => {
    setCategorias(c);
    setProdutos(p);
    setGrupos(g);
  }, []);

  const recarregar = useCallback(async () => aplicar(await buscarTudo(chamar)), [chamar, aplicar]);

  useEffect(() => {
    let vivo = true;
    buscarTudo(chamar)
      .then((dados) => vivo && aplicar(dados))
      .catch((e: ApiErro) => vivo && setErro(e.message));
    return () => {
      vivo = false;
    };
  }, [chamar, aplicar]);

  /** Roda a ação, mostra o erro da API se houver e recarrega tudo. */
  const executar = useCallback(async (acao: () => Promise<unknown>) => {
    setErro(null);
    try {
      await acao();
      await recarregar();
      return true;
    } catch (e) {
      setErro((e as ApiErro).message);
      return false;
    }
  }, [recarregar]);

  if (papel === "COZINHA") return <Erro>Só o dono ou o gerente editam o cardápio.</Erro>;
  if (!categorias) return erro ? <Erro>{erro}</Erro> : <Carregando />;

  return (
    <main className="mx-auto w-full max-w-4xl p-4">
      <h1 className="text-xl font-bold">Cardápio</h1>
      <div role="tablist" className="mt-3 flex gap-2 border-b border-stone-200">
        {(["produtos", "categorias", "adicionais"] as Aba[]).map((a) => (
          <button
            key={a}
            role="tab"
            aria-selected={aba === a}
            onClick={() => setAba(a)}
            className={`-mb-px border-b-2 px-3 py-2 capitalize ${aba === a ? "border-marca font-semibold text-marca" : "border-transparent text-stone-600"}`}
          >
            {a}
          </button>
        ))}
      </div>
      {erro && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}

      <div className="mt-4">
        {aba === "categorias" && <Categorias categorias={categorias} executar={executar} chamar={chamar} />}
        {aba === "produtos" && <Produtos categorias={categorias} produtos={produtos} grupos={grupos} executar={executar} chamar={chamar} />}
        {aba === "adicionais" && <Adicionais grupos={grupos} executar={executar} chamar={chamar} />}
      </div>
    </main>
  );
}

type Executar = (acao: () => Promise<unknown>) => Promise<boolean>;
type Chamar = ReturnType<typeof usePainel>["chamar"];

// ---------------------------------------------------------------- categorias

function Categorias({ categorias, executar, chamar }: { categorias: CategoriaPainel[]; executar: Executar; chamar: Chamar }) {
  const [nome, setNome] = useState("");

  async function criar(e: FormEvent) {
    e.preventDefault();
    const ordem = Math.max(0, ...categorias.map((c) => c.ordem)) + 1;
    if (await executar(() => chamar(`${BASE}/categorias`, { metodo: "POST", corpo: { nome, ordem } }))) setNome("");
  }

  const salvar = (c: CategoriaPainel, mudanca: Partial<CategoriaPainel>) =>
    executar(() => chamar(`${BASE}/categorias/${c.id}`, { metodo: "PUT", corpo: { nome: c.nome, ordem: c.ordem, ativa: c.ativa, ...mudanca } }));

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={criar} className="flex gap-2">
        <input required maxLength={80} placeholder="Nova categoria (ex.: Bebidas)" value={nome} onChange={(e) => setNome(e.target.value)} className="flex-1 rounded-lg border border-stone-300 p-2" />
        <button className={botaoPrimario}>Adicionar</button>
      </form>
      <ul className="divide-y divide-stone-100 rounded-xl bg-white shadow-sm">
        {categorias.map((c, i) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 p-3">
            <input
              defaultValue={c.nome}
              aria-label={`Nome da categoria ${c.nome}`}
              onBlur={(e) => e.target.value.trim() && e.target.value !== c.nome && salvar(c, { nome: e.target.value.trim() })}
              className={`flex-1 rounded border border-transparent p-1 hover:border-stone-300 ${c.ativa ? "" : "text-stone-400 line-through"}`}
            />
            <button disabled={i === 0} onClick={() => salvar(c, { ordem: categorias[i - 1].ordem - 1 })} aria-label="Subir" className="px-2 disabled:opacity-30">↑</button>
            <button disabled={i === categorias.length - 1} onClick={() => salvar(c, { ordem: categorias[i + 1].ordem + 1 })} aria-label="Descer" className="px-2 disabled:opacity-30">↓</button>
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={c.ativa} onChange={(e) => salvar(c, { ativa: e.target.checked })} /> visível
            </label>
            {c.ativa && (
              <button onClick={() => confirm(`Remover "${c.nome}"?`) && executar(() => chamar(`${BASE}/categorias/${c.id}`, { metodo: "DELETE" }))} className="text-sm text-red-700 underline">
                remover
              </button>
            )}
          </li>
        ))}
        {categorias.length === 0 && <li className="p-4 text-stone-500">Nenhuma categoria ainda. Comece criando uma.</li>}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- produtos

interface FormProduto {
  id?: string;
  categoriaId: string;
  nome: string;
  descricao: string;
  fotoUrl: string;
  preco: string;
  precoPromocional: string;
  ordem: number;
  disponivel: boolean;
  grupoIds: string[];
}

const reais = (v: number | null) => (v == null ? "" : (centavos(v) / 100).toFixed(2).replace(".", ","));

function Produtos({ categorias, produtos, grupos, executar, chamar }: {
  categorias: CategoriaPainel[]; produtos: ProdutoPainel[]; grupos: GrupoPainel[]; executar: Executar; chamar: Chamar;
}) {
  const [editando, setEditando] = useState<FormProduto | null>(null);
  const [erroForm, setErroForm] = useState<string | null>(null);

  function novo() {
    setErroForm(null);
    setEditando({ categoriaId: categorias[0]?.id ?? "", nome: "", descricao: "", fotoUrl: "", preco: "", precoPromocional: "", ordem: produtos.length + 1, disponivel: true, grupoIds: [] });
  }

  function editar(p: ProdutoPainel) {
    setErroForm(null);
    setEditando({ ...p, descricao: p.descricao ?? "", fotoUrl: p.fotoUrl ?? "", preco: reais(p.preco), precoPromocional: reais(p.precoPromocional) });
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    const preco = lerReais(editando.preco);
    const promo = editando.precoPromocional.trim() ? lerReais(editando.precoPromocional) : null;
    if (preco == null) return setErroForm("Preço inválido. Ex.: 12,50");
    if (editando.precoPromocional.trim() && promo == null) return setErroForm("Preço promocional inválido.");
    const corpo = {
      categoriaId: editando.categoriaId,
      nome: editando.nome,
      descricao: editando.descricao.trim() || null,
      fotoUrl: editando.fotoUrl.trim() || null,
      preco: paraApi(preco),
      precoPromocional: promo == null ? null : paraApi(promo),
      ordem: editando.ordem,
      disponivel: editando.disponivel,
      grupoIds: editando.grupoIds,
    };
    const ok = await executar(() => editando.id
      ? chamar(`${BASE}/produtos/${editando.id}`, { metodo: "PUT", corpo })
      : chamar(`${BASE}/produtos`, { metodo: "POST", corpo }));
    if (ok) setEditando(null);
  }

  if (categorias.length === 0) return <p className="text-stone-600">Crie uma categoria primeiro, na aba Categorias.</p>;

  return (
    <div className="flex flex-col gap-4">
      <button onClick={novo} className={`${botaoPrimario} self-start`}>Novo produto</button>

      {editando && (
        <form onSubmit={salvar} className="grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">{editando.id ? "Editar produto" : "Novo produto"}</h2>
          <label className="text-sm">Nome
            <input required maxLength={120} value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} className={campo} />
          </label>
          <label className="text-sm">Categoria
            <select value={editando.categoriaId} onChange={(e) => setEditando({ ...editando, categoriaId: e.target.value })} className={campo}>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">Descrição
            <textarea rows={2} value={editando.descricao} onChange={(e) => setEditando({ ...editando, descricao: e.target.value })} className={campo} />
          </label>
          <label className="text-sm">Preço (R$)
            <input required inputMode="decimal" placeholder="12,50" value={editando.preco} onChange={(e) => setEditando({ ...editando, preco: e.target.value })} className={campo} />
          </label>
          <label className="text-sm">Preço promocional (opcional)
            <input inputMode="decimal" value={editando.precoPromocional} onChange={(e) => setEditando({ ...editando, precoPromocional: e.target.value })} className={campo} />
          </label>
          <label className="text-sm sm:col-span-2">URL da foto (opcional)
            <input type="url" placeholder="https://…" value={editando.fotoUrl} onChange={(e) => setEditando({ ...editando, fotoUrl: e.target.value })} className={campo} />
          </label>
          {grupos.length > 0 && (
            <fieldset className="text-sm sm:col-span-2">
              <legend>Adicionais deste produto (na ordem em que marcar)</legend>
              <div className="mt-1 flex flex-wrap gap-3">
                {grupos.map((g) => (
                  <label key={g.id} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={editando.grupoIds.includes(g.id)}
                      onChange={(e) => setEditando({
                        ...editando,
                        grupoIds: e.target.checked ? [...editando.grupoIds, g.id] : editando.grupoIds.filter((x) => x !== g.id),
                      })}
                    />
                    {g.nome}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editando.disponivel} onChange={(e) => setEditando({ ...editando, disponivel: e.target.checked })} />
            Disponível hoje
          </label>
          {erroForm && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{erroForm}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button className={botaoPrimario}>Salvar</button>
            <button type="button" onClick={() => setEditando(null)} className="rounded-lg border border-stone-300 px-4 py-2">Cancelar</button>
          </div>
        </form>
      )}

      {categorias.map((c) => {
        const daCategoria = produtos.filter((p) => p.categoriaId === c.id);
        if (daCategoria.length === 0) return null;
        return (
          <section key={c.id}>
            <h2 className="mb-2 font-semibold">{c.nome}</h2>
            <ul className="divide-y divide-stone-100 rounded-xl bg-white shadow-sm">
              {daCategoria.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 p-3">
                  <span className="flex-1">
                    <span className="font-medium">{p.nome}</span>
                    <span className="ml-2 text-sm text-stone-500">
                      {p.precoPromocional != null ? `${formatar(centavos(p.precoPromocional))} (de ${formatar(centavos(p.preco))})` : formatar(centavos(p.preco))}
                    </span>
                  </span>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={p.disponivel}
                      onChange={(e) => executar(() => chamar(`${BASE}/produtos/${p.id}/disponibilidade`, { metodo: "PATCH", corpo: { disponivel: e.target.checked } }))}
                    />
                    disponível
                  </label>
                  <button onClick={() => editar(p)} className="text-sm underline">editar</button>
                  <button onClick={() => confirm(`Remover "${p.nome}"?`) && executar(() => chamar(`${BASE}/produtos/${p.id}`, { metodo: "DELETE" }))} className="text-sm text-red-700 underline">remover</button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {produtos.length === 0 && !editando && <p className="text-stone-500">Nenhum produto ainda.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- grupos de adicionais

interface FormGrupo {
  id?: string;
  nome: string;
  minimo: number;
  maximo: number;
  opcoes: { id?: string; nome: string; preco: string; disponivel: boolean }[];
}

function Adicionais({ grupos, executar, chamar }: { grupos: GrupoPainel[]; executar: Executar; chamar: Chamar }) {
  const [editando, setEditando] = useState<FormGrupo | null>(null);
  const [erroForm, setErroForm] = useState<string | null>(null);

  function editar(g?: GrupoPainel) {
    setErroForm(null);
    setEditando(g
      ? { id: g.id, nome: g.nome, minimo: g.minimo, maximo: g.maximo, opcoes: g.opcoes.map((o) => ({ id: o.id, nome: o.nome, preco: reais(o.preco), disponivel: o.disponivel })) }
      : { nome: "", minimo: 0, maximo: 1, opcoes: [{ nome: "", preco: "0,00", disponivel: true }] });
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    const opcoes = [];
    for (const o of editando.opcoes) {
      const preco = lerReais(o.preco || "0");
      if (preco == null) return setErroForm(`Preço inválido em "${o.nome}".`);
      opcoes.push({ id: o.id, nome: o.nome, preco: paraApi(preco), disponivel: o.disponivel });
    }
    const corpo = { nome: editando.nome, minimo: editando.minimo, maximo: editando.maximo, opcoes };
    const ok = await executar(() => editando.id
      ? chamar(`${BASE}/grupos/${editando.id}`, { metodo: "PUT", corpo })
      : chamar(`${BASE}/grupos`, { metodo: "POST", corpo }));
    if (ok) setEditando(null);
  }

  const mudarOpcao = (i: number, mudanca: Partial<FormGrupo["opcoes"][number]>) =>
    setEditando((f) => f && { ...f, opcoes: f.opcoes.map((o, j) => (j === i ? { ...o, ...mudanca } : o)) });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-600">
        Grupos como “Escolha o pão” (mínimo 1, máximo 1) ou “Adicionais” (mínimo 0, máximo 5). Depois, marque o grupo no produto.
      </p>
      <button onClick={() => editar()} className={`${botaoPrimario} self-start`}>Novo grupo</button>

      {editando && (
        <form onSubmit={salvar} className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm sm:col-span-3">Nome do grupo
              <input required maxLength={80} value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} className={campo} />
            </label>
            <label className="text-sm">Mínimo (0 = opcional)
              <input type="number" min={0} value={editando.minimo} onChange={(e) => setEditando({ ...editando, minimo: Number(e.target.value) })} className={campo} />
            </label>
            <label className="text-sm">Máximo
              <input type="number" min={1} value={editando.maximo} onChange={(e) => setEditando({ ...editando, maximo: Number(e.target.value) })} className={campo} />
            </label>
          </div>
          <fieldset>
            <legend className="text-sm font-semibold">Opções</legend>
            {editando.opcoes.map((o, i) => (
              <div key={o.id ?? `nova-${i}`} className="mt-2 flex flex-wrap items-center gap-2">
                <input required maxLength={80} placeholder="Nome" aria-label="Nome da opção" value={o.nome} onChange={(e) => mudarOpcao(i, { nome: e.target.value })} className="flex-1 rounded-lg border border-stone-300 p-2" />
                <input inputMode="decimal" aria-label="Preço da opção" value={o.preco} onChange={(e) => mudarOpcao(i, { preco: e.target.value })} className="w-24 rounded-lg border border-stone-300 p-2" />
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={o.disponivel} onChange={(e) => mudarOpcao(i, { disponivel: e.target.checked })} /> disponível
                </label>
                <button
                  type="button"
                  disabled={editando.opcoes.length === 1}
                  onClick={() => setEditando({ ...editando, opcoes: editando.opcoes.filter((_, j) => j !== i) })}
                  className="text-sm text-red-700 underline disabled:opacity-30"
                >
                  tirar
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setEditando({ ...editando, opcoes: [...editando.opcoes, { nome: "", preco: "0,00", disponivel: true }] })} className="mt-2 text-sm underline">
              + opção
            </button>
          </fieldset>
          {erroForm && <p role="alert" className="text-sm text-red-700">{erroForm}</p>}
          <div className="flex gap-2">
            <button className={botaoPrimario}>Salvar</button>
            <button type="button" onClick={() => setEditando(null)} className="rounded-lg border border-stone-300 px-4 py-2">Cancelar</button>
          </div>
        </form>
      )}

      <ul className="divide-y divide-stone-100 rounded-xl bg-white shadow-sm">
        {grupos.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center gap-3 p-3">
            <span className="flex-1">
              <span className="font-medium">{g.nome}</span>
              <span className="ml-2 text-sm text-stone-500">
                {g.minimo > 0 ? `obrigatório, ` : ""}até {g.maximo} · {g.opcoes.map((o) => o.nome).join(", ")}
              </span>
            </span>
            <button onClick={() => editar(g)} className="text-sm underline">editar</button>
            <button onClick={() => confirm(`Remover "${g.nome}"? Ele sai de todos os produtos.`) && executar(() => chamar(`${BASE}/grupos/${g.id}`, { metodo: "DELETE" }))} className="text-sm text-red-700 underline">remover</button>
          </li>
        ))}
        {grupos.length === 0 && <li className="p-4 text-stone-500">Nenhum grupo de adicionais ainda.</li>}
      </ul>
    </div>
  );
}
