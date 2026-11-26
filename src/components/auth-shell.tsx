import type { ReactNode } from "react";
import { Sky } from "./sky";
import { SiteHeader } from "./site-header";
import { Brand } from "./ui";

/**
 * Страницы входа, регистрации и смены пароля: небо с облаками, как на главной.
 * Форма — белая карточка.
 */
export function AuthShell({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <Sky />
      <SiteHeader>
        <Brand />
      </SiteHeader>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 md:items-center md:pt-0 md:pb-[10dvh]">
        <div className="w-full max-w-[420px] rounded-[28px] bg-raised p-6 md:p-8">
          <h1 className="text-[28px] leading-9 font-medium tracking-[-0.01em]">{title}</h1>
          <p className="mt-2 mb-8 text-base leading-6 text-muted">{lead}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
