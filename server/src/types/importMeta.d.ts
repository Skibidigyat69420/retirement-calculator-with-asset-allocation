/**
 * The frontend engine modules (../../src/lib) are type-checked as part of this
 * project. Some of them (transitively, via type-only imports) reference Vite's
 * `import.meta.env`. That global does not exist under Node typings, so it is
 * declared here — this file is never executed, it only satisfies typecheck.
 */
interface ImportMeta {
  env: Record<string, string | undefined>;
}
