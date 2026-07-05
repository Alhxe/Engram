import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function PublicPage() {
  const { token } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["public", token],
    queryFn: () => api.nodes.publicPage(token!),
    enabled: !!token,
    retry: false,
  });

  return (
    <div className="min-h-full bg-app">
      <header className="border-b border-line px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-violet-500 text-xs font-bold text-white">
            E
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-ink">Engram</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {isLoading && <p className="text-sm text-dim">…</p>}
        {(error || (!isLoading && !data)) && (
          <p className="text-sm text-dim">This page is not available.</p>
        )}
        {data && (
          <article>
            <h1 className="text-[2.1rem] font-bold leading-tight tracking-tight text-ink">
              {data.title || "Untitled"}
            </h1>
            <div
              className="tiptap mt-8 text-[15px] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: data.content ?? "" }}
            />
          </article>
        )}
      </main>
    </div>
  );
}
