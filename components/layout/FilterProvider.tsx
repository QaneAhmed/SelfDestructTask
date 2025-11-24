"use client";

import { createContext, PropsWithChildren, useContext, useState } from "react";

export type FilterKey = "all" | "high" | "medium" | "low";

type FilterContextValue = {
  activeFilter: FilterKey;
  setFilter: (key: FilterKey) => void;
};

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

export function FilterProvider({ children }: PropsWithChildren) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  return (
    <FilterContext.Provider value={{ activeFilter, setFilter: setActiveFilter }}>{children}</FilterContext.Provider>
  );
}

export function useFilter() {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error("useFilter must be used within FilterProvider");
  }
  return ctx;
}
