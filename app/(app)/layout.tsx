import type { ReactNode } from "react";
import { ConfettiProvider } from "@/components/feedback/ConfettiManager";
import { FilterProvider } from "@/components/layout/FilterProvider";
import { TaskPanelProvider } from "@/components/layout/TaskPanelProvider";
import { AppShell } from "@/components/layout/AppShell";
import { HeaderNav } from "@/components/HeaderNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ConfettiProvider>
      <FilterProvider>
        <TaskPanelProvider>
          <AppShell>
            <HeaderNav />
            <main className="px-4 py-4 lg:px-6 lg:py-6">{children}</main>
          </AppShell>
        </TaskPanelProvider>
      </FilterProvider>
    </ConfettiProvider>
  );
}
