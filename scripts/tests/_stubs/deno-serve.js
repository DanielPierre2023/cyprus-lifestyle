// Stand-in for https://deno.land/std/http/server.ts in the tests: keeps the handler the edge function registers.
export function serve(handler) { globalThis.__edgeHandler = handler; }
