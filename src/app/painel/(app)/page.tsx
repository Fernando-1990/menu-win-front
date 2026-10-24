import { redirect } from "next/navigation";

// Só redireciona: não há UI para validar navegação instantânea.
export const instant = false;

export default function Painel() {
  redirect("/painel/cozinha");
}
