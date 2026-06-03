import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Preview({ source }: { source: string }) {
  return (
    <div
      data-color-mode="dark"
      className="rounded-xl border border-border bg-card p-6 text-sm leading-7 text-foreground"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => <a {...props} className="text-primary underline underline-offset-4" />,
          code: (props) => (
            <code
              {...props}
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]"
            />
          ),
          h1: (props) => <h1 {...props} className="mb-4 text-3xl font-semibold" />,
          h2: (props) => <h2 {...props} className="mb-3 mt-8 text-2xl font-semibold" />,
          h3: (props) => <h3 {...props} className="mb-3 mt-6 text-xl font-semibold" />,
          li: (props) => <li {...props} className="ml-5 list-disc" />,
          p: (props) => <p {...props} className="mb-4 last:mb-0" />,
          pre: (props) => (
            <pre
              {...props}
              className="mb-4 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm"
            />
          ),
          ul: (props) => <ul {...props} className="mb-4 space-y-2" />,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
