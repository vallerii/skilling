import ReactMarkdown from "react-markdown";

/** Markdown эталонных ответов и объяснений. HTML внутри markdown не рендерится (безопасно). */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-3 text-base leading-6">
      <ReactMarkdown
        components={{
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-xl bg-code p-4 text-sm leading-6 text-white">
              {children}
            </pre>
          ),
          code: ({ children, className }) =>
            className ? (
              <code className="font-mono">{children}</code>
            ) : (
              <code className="rounded-md bg-active px-1 py-0.5 font-mono text-[0.9em]">
                {children}
              </code>
            ),
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
