// supabase/functions/concierge/index.ts — RETIRED.
// The "Ask the island" box, the chat, WhatsApp and Telegram all answer through the concierge brain on the website
// (lib/concierge/brain.ts), which talks to OpenAI. Nothing calls this function any more.
//
// You can delete it in the Supabase dashboard (Edge Functions → concierge). This file stays only because a ZIP upload cannot delete a file.
// If a stray caller still reaches the deployed function, it answers 410 Gone.
Deno.serve(() => new Response(JSON.stringify({ ok: false, error: 'This function has been retired.' }), { status: 410, headers: { 'Content-Type': 'application/json' } }));
