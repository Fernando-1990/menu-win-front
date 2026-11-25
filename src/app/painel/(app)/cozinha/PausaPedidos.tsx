"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiErro } from "@/lib/api";
import { quandoAbre } from "@/lib/horario";
import type { Funcionamento } from "@/lib/tipos";
import { usePainel } from "../PainelContexto";

/**
 * Pausar/retomar pedidos do cardápio (qualquer papel: quem está na cozinha é quem vê que lotou).
 * Relê a cada minuto: o horário muda sozinho e outro aparelho pode ter pausado.
 */
export function PausaPedidos() {
  const { chamar } = usePainel();
  const [f, setF] = useState<Funcionamento | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    chamar<Funcionamento>("/api/painel/funcionamento").then(setF).catch((e: ApiErro) => setErro(e.message));
  }, [chamar]);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 60_000);
    return () => clearInterval(t);
  }, [carregar]);

  async function mudar(pausado: boolean) {
    if (pausado && !confirm("Pausar os pedidos? O cardápio continua aparecendo, mas ninguém consegue pedir até você retomar.")) {
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      setF(await chamar<Funcionamento>("/api/painel/funcionamento/pausa", { metodo: "PUT", corpo: { pausado } }));
    } catch (e) {
      setErro((e as ApiErro).message);
    } finally {
      setSalvando(false);
    }
  }

  if (!f) return erro ? <p role="alert" className="text-sm text-red-800">{erro}</p> : null;

  if (f.pedidosPausados) {
    return (
      <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg bg-red-600 p-3 text-white">
        <strong className="flex-1">Pedidos pausados: o cardápio não está aceitando pedidos.</strong>
        <button onClick={() => mudar(false)} disabled={salvando}
          className="rounded-lg bg-white px-4 py-2 font-semibold text-red-700 disabled:opacity-50">
          {salvando ? "Retomando…" : "Retomar pedidos"}
        </button>
        {erro && <p className="w-full text-sm">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {f.aberta
        ? <span className="text-green-800">Recebendo pedidos</span>
        : <span className="text-amber-900">Fora do horário{f.abreEm && ` · abre ${quandoAbre(f.abreEm)}`}</span>}
      <button onClick={() => mudar(true)} disabled={salvando}
        className="rounded-lg border border-red-300 bg-white px-3 py-1 font-medium text-red-700 disabled:opacity-50">
        {salvando ? "Pausando…" : "Pausar pedidos"}
      </button>
      {erro && <span role="alert" className="text-red-800">{erro}</span>}
    </div>
  );
}
