import { CascaPainel } from "./CascaPainel";

export default function LayoutPainel({ children }: LayoutProps<"/painel">) {
  return <CascaPainel>{children}</CascaPainel>;
}
