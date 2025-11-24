"use client";

import { createContext, PropsWithChildren, useCallback, useContext } from "react";
import { fireConfetti, type ConfettiLevel } from "@/lib/confetti";

type TriggerConfetti = (level?: ConfettiLevel) => void;

const ConfettiContext = createContext<TriggerConfetti>(() => {});

export function ConfettiProvider({ children }: PropsWithChildren) {
  const trigger = useCallback((level: ConfettiLevel = "medium") => {
    void fireConfetti(level);
  }, []);

  return <ConfettiContext.Provider value={trigger}>{children}</ConfettiContext.Provider>;
}

export function useConfetti() {
  return useContext(ConfettiContext);
}
