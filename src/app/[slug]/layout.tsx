import { Suspense } from "react";
import { Carregando } from "@/components/Mensagem";
import { LojaProvider } from "./LojaContexto";

// O slug só existe em tempo de execução: o Suspense deixa a casca ser pré-renderizada
// e o provider (cliente, com useParams) chega por streaming.
export default function LayoutDaLoja({ children }: LayoutProps<"/[slug]">) {
  return (
    <Suspense fallback={<Carregando />}>
      <LojaProvider>{children}</LojaProvider>
    </Suspense>
  );
}
