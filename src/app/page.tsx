import Link from "next/link";

export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-marca">Menu Win</h1>
        <p className="mt-2 text-stone-600">
          Cardápio digital e pedidos com a marca da sua loja. Mensalidade fixa, sem comissão por pedido.
        </p>
      </div>
      <p className="text-sm text-stone-500">
        Clientes acessam o cardápio pelo endereço da loja, por exemplo <code className="font-mono">/padaria-demo</code>.
      </p>
      <Link href="/painel" className="rounded-lg bg-marca px-4 py-3 text-center font-semibold text-white">
        Entrar no painel da loja
      </Link>
    </main>
  );
}
