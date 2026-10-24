import type { ReactNode } from "react";

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return <p className="p-8 text-center text-stone-500" role="status">{texto}</p>;
}

export function Erro({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md p-6 text-center" role="alert">
      <p className="text-stone-700">{children}</p>
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}
