"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { Papel } from "@/lib/tipos";
import { PainelProvider, usePainel } from "./PainelContexto";

const LINKS: { href: string; rotulo: string; papeis: Papel[] }[] = [
  { href: "/painel/cozinha", rotulo: "Pedidos", papeis: ["DONO", "GERENTE", "COZINHA"] },
  { href: "/painel/cardapio", rotulo: "Cardápio", papeis: ["DONO", "GERENTE"] },
  { href: "/painel/configuracoes", rotulo: "Configurações", papeis: ["DONO"] },
];

export function CascaPainel({ children }: { children: ReactNode }) {
  return (
    <PainelProvider>
      <Navegacao />
      <div className="flex flex-1 flex-col">{children}</div>
    </PainelProvider>
  );
}

function Navegacao() {
  const { papel, sessao, sair } = usePainel();
  const atual = usePathname();
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <span className="font-bold text-marca">{sessao?.lojaNome ?? "Menu Win"}</span>
        <nav aria-label="Painel" className="flex gap-1">
          {LINKS.filter((l) => l.papeis.includes(papel)).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={atual.startsWith(l.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm ${atual.startsWith(l.href) ? "bg-marca text-white" : "text-stone-700 hover:bg-stone-100"}`}
            >
              {l.rotulo}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {sessao && (
            <a href={`/${sessao.lojaSlug}`} target="_blank" rel="noreferrer" className="text-stone-600 underline">
              Ver cardápio
            </a>
          )}
          <span className="text-stone-500">{sessao?.nome}</span>
          <button onClick={sair} className="rounded-lg border border-stone-300 px-3 py-1">Sair</button>
        </div>
      </div>
    </header>
  );
}
