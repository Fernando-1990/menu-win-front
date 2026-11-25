"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Carregando } from "@/components/Mensagem";
import type { ApiErro } from "@/lib/api";
import { DIAS, ordenar, quandoAbre } from "@/lib/horario";
import type { Funcionamento, Horario } from "@/lib/tipos";
import { usePainel } from "../PainelContexto";

type Faixa = { abre: string; fecha: string };
type Semana = Faixa[][]; // índice 0 = segunda ... 6 = domingo

const hora = "rounded-lg border border-stone-300 bg-white p-1.5 tabular-nums";

function paraSemana(horarios: Horario[]): Semana {
  const semana: Semana = DIAS.map(() => []);
  for (const h of ordenar(horarios)) semana[h.diaSemana - 1].push({ abre: h.abre, fecha: h.fecha });
  return semana;
}

function paraApi(semana: Semana): Horario[] {
  return semana.flatMap((faixas, i) => faixas.map((f) => ({ diaSemana: i + 1, ...f })));
}

/** Horários da semana (só o DONO). Sem horário = aceita pedido a qualquer hora. */
export function HorariosForm() {
  const { chamar } = usePainel();
  const [f, setF] = useState<Funcionamento | null>(null);
  const [livre, setLivre] = useState(true);
  const [semana, setSemana] = useState<Semana>(() => DIAS.map(() => []));
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  function aplicar(novo: Funcionamento) {
    setF(novo);
    setLivre(novo.horarios.length === 0);
    setSemana(novo.horarios.length ? paraSemana(novo.horarios) : DIAS.map((_, i) => (i < 6 ? [{ abre: "07:00", fecha: "19:00" }] : [])));
  }

  useEffect(() => {
    chamar<Funcionamento>("/api/painel/funcionamento")
      .then(aplicar)
      .catch((e: ApiErro) => setMsg({ ok: false, texto: e.message }));
  }, [chamar]);

  if (!f) return msg ? <p className="text-red-700">{msg.texto}</p> : <Carregando />;

  const mudarFaixa = (dia: number, i: number, campo: keyof Faixa, valor: string) =>
    setSemana(semana.map((faixas, d) => (d !== dia ? faixas : faixas.map((fx, j) => (j === i ? { ...fx, [campo]: valor } : fx)))));
  const adicionar = (dia: number) =>
    setSemana(semana.map((faixas, d) => (d !== dia ? faixas : [...faixas, faixas.length ? { abre: "18:00", fecha: "22:00" } : { abre: "07:00", fecha: "19:00" }])));
  const remover = (dia: number, i: number) =>
    setSemana(semana.map((faixas, d) => (d !== dia ? faixas : faixas.filter((_, j) => j !== i))));
  const copiarParaTodos = (dia: number) => setSemana(semana.map(() => semana[dia].map((fx) => ({ ...fx }))));

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    const horarios = livre ? [] : paraApi(semana);
    if (!livre && horarios.length === 0) {
      return setMsg({ ok: false, texto: "Marque pelo menos um horário, ou escolha aceitar pedidos a qualquer hora." });
    }
    if (horarios.some((h) => !h.abre || !h.fecha)) return setMsg({ ok: false, texto: "Preencha todas as horas." });
    setSalvando(true);
    try {
      const salvo = await chamar<Funcionamento>("/api/painel/funcionamento/horarios", { metodo: "PUT", corpo: { horarios } });
      aplicar(salvo);
      setMsg({
        ok: true,
        texto: salvo.aberta ? "Horários salvos. A loja está aberta agora."
          : salvo.pedidosPausados ? "Horários salvos. Os pedidos continuam pausados pela cozinha."
          : `Horários salvos. A loja está fechada agora${salvo.abreEm ? ` e abre ${quandoAbre(salvo.abreEm)}` : ""}.`,
      });
    } catch (err) {
      setMsg({ ok: false, texto: (err as ApiErro).message });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Horário de funcionamento</h2>
      <p className="text-sm text-stone-600">
        Fora do horário o cardápio continua aparecendo, mas não aceita pedidos e mostra quando a loja abre.
        Para parar na hora (cozinha lotada, faltou algo), use <strong>Pausar pedidos</strong> na tela de Pedidos.
      </p>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2">
          <input type="radio" name="modo" checked={livre} onChange={() => setLivre(true)} />
          Aceitar pedidos a qualquer hora
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="modo" checked={!livre} onChange={() => setLivre(false)} />
          Só nos horários abaixo
        </label>
      </div>

      {!livre && (
        <>
          <ul className="flex flex-col divide-y divide-stone-100">
            {DIAS.map((nome, dia) => (
              <li key={nome} className="flex flex-wrap items-start gap-x-3 gap-y-2 py-2">
                <span className="w-20 pt-1.5 font-medium capitalize">{nome}</span>
                <div className="flex flex-1 flex-col gap-2">
                  {semana[dia].length === 0 && <span className="pt-1.5 text-sm text-stone-500">Fechado</span>}
                  {semana[dia].map((fx, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                      <input type="time" aria-label={`${nome}: abre`} value={fx.abre} required
                        onChange={(e) => mudarFaixa(dia, i, "abre", e.target.value)} className={hora} />
                      às
                      <input type="time" aria-label={`${nome}: fecha`} value={fx.fecha} required
                        onChange={(e) => mudarFaixa(dia, i, "fecha", e.target.value)} className={hora} />
                      <button type="button" onClick={() => remover(dia, i)} aria-label={`Remover horário de ${nome}`}
                        className="rounded px-2 py-1 text-stone-500 hover:bg-stone-100">✕</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 text-sm">
                  <button type="button" onClick={() => adicionar(dia)} className="rounded-lg border border-stone-300 px-2 py-1">
                    {semana[dia].length ? "+ outro horário" : "+ abrir"}
                  </button>
                  {dia === 0 && semana[0].length > 0 && (
                    <button type="button" onClick={() => copiarParaTodos(0)} className="rounded-lg border border-stone-300 px-2 py-1">
                      Copiar para todos
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-stone-500">
            Fecha depois da meia-noite? Ponha a hora de fechar menor que a de abrir (ex.: 18:00 às 02:00): conta como o dia em que abriu.
            Horários no fuso de Brasília.
          </p>
        </>
      )}

      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.texto}</p>}
      <button disabled={salvando} className="self-start rounded-lg bg-marca px-4 py-2 font-semibold text-white disabled:opacity-50">
        {salvando ? "Salvando…" : "Salvar horários"}
      </button>
    </form>
  );
}
