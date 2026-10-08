// Ambient declarations so the edge function's SOURCE type-checks in the Node project (the generated file runs on Deno).
declare const Deno: { env: { get(key: string): string | undefined } };
declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}
declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}
