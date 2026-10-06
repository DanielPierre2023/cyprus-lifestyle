// POST /api/concierge  { q, locale }
// Public "Ask the island" endpoint. Rate-limited, then answered by the SHARED
// concierge brain (lib/concierge/brain.ts) — the SAME grounded, multilingual core
// that powers the streaming web chat, Telegram and WhatsApp. One concierge brain,
// one behaviour on every surface. The model key (CLAUDE_API_KEY) stays server-side.
//
// Previously this route PROXIED to the `concierge` Supabase edge function (which
// held its own model key). That function is now deprecated (see
// supabase/functions/concierge/index.ts) and no longer the primary path. The brain
// does its OWN knowledge-base + directory retrieval inside assembleContext, so the
// manual retrieveKnowledge pre-fetch that existed only to feed the edge function is
// gone.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { publicAiCeilingDeny } from '@/lib/spendGuard';
import { runConcierge, type ChatMessage } from '@/lib/concierge/brain';
import { cardsFor, sourceHints } from '@/lib/concierge/sources';

export const runtime = 'nodejs';
// The brain embeds, retrieves across several legs, reranks, then makes one
// non-streaming Claude call (60s timeout inside runConcierge). Match the chat
// route's budget so the function isn't killed before that call can complete.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, 'concierge', 12, 60))) {
    return NextResponse.json({ ok: false, error: 'A lot of questions at once — give it a moment and try again.' }, { status: 429 });
  }
  if (await publicAiCeilingDeny('chat')) {
    return NextResponse.json({ ok: false, error: 'A lot of questions at once — give it a moment and try again.' }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const q = String(body.q || '').trim().slice(0, 500);
  const locale = String(body.locale || 'en');
  if (q.length < 3) return NextResponse.json({ ok: false, error: 'Please ask a fuller question.' }, { status: 400 });

  // The brain reuses the model key already on the Next side (the same key the chat,
  // Telegram and WhatsApp concierge use). Without it there is nothing to answer with.
  if (!process.env.CLAUDE_API_KEY) {
    return NextResponse.json({ ok: false, error: 'The concierge is not configured.' }, { status: 500 });
  }

  try {
    // One grounded, locale-aware turn through the shared brain. runConcierge's
    // assembleContext does its own KB + directory retrieval and returns the picks and
    // guide links, so this route no longer pre-fetches knowledge for an edge function.
    const messages: ChatMessage[] = [{ role: 'user', content: q }];
    const { text, ctx } = await runConcierge(messages, locale);

    // Map the brain's context into the EXACT shape the Ask-box widget consumes:
    // { ok, answer, picks:[{slug,type,name,district,rating,rating_count,price_band,
    // image,why}], guides:[{label,path}] }. Brain Picks carry no per-pick `why` (the
    // retired edge function asked the model for one); the grounded prose `answer`
    // already explains the picks, so we send `why: ''`. The widget tolerates an empty
    // why (empty line) and /api/concierge/request reads it defensively.
    const picks = ctx.picks.map((p) => ({
      slug: p.slug,
      type: p.type,
      name: p.name,
      district: p.district,
      rating: p.rating,
      rating_count: p.rating_count,
      price_band: p.price_band,
      image: p.image,
      // false → a 'listed' business with no public page: the widget shows it as text, never a link.
      linkable: p.linkable,
      why: '',
    }));
    const guides = ctx.guides.map((g) => ({ label: g.label, path: g.path }));

    if (!text.trim()) {
      // Retrieval may have succeeded, but with no answer prose there is nothing to
      // show — surface the error path cleanly (the widget renders its own message).
      return NextResponse.json({ ok: false, error: 'The concierge is taking a moment — please try again.' }, { status: 502 });
    }
    // Bookable experiences (GetYourGuide) that fit this question — rendered as booking cards.
    const activities = ctx.activities || [];
    // Cards for events / articles / knowledge pages / official notes / webcams, each with its trust label.
    const sourceCards = cardsFor(ctx.sources, locale);
    return NextResponse.json({ ok: true, answer: text, picks, guides, activities, sourceCards, sourceHints: sourceHints(ctx.sources, ctx.sourceNotes) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
