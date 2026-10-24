"use client";

import { useSyncExternalStore } from "react";

const nada = () => () => {};

/** false no servidor e na hidratação; true depois. Para ler localStorage sem divergir do HTML do servidor. */
export function useNoCliente(): boolean {
  return useSyncExternalStore(nada, () => true, () => false);
}
