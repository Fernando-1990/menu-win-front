import { Tela } from "./Tela";

// A tela depende do token do painel, que só existe no navegador: não há o que pré-renderizar.
// `instant` só vale em arquivo de servidor, por isso a página é este invólucro.
export const instant = false;

export default function Pagina() {
  return <Tela />;
}
