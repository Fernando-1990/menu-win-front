import type { MetadataRoute } from "next";

// PWA: o cliente pode "instalar" o cardápio na tela inicial do celular.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Menu Win",
    short_name: "Menu Win",
    description: "Cardápio digital e pedidos",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f3",
    theme_color: "#c0392b",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
