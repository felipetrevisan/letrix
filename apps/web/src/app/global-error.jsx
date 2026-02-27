"use client";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="w-full max-w-lg rounded-2xl border border-border/60 bg-background/90 p-6 text-center shadow-xl">
          <h1 className="mb-3 text-2xl font-bold">Algo deu errado</h1>
          <p className="mb-5 break-words text-sm text-muted-foreground">
            {error?.message ?? "Erro inesperado ao carregar o jogo."}
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
