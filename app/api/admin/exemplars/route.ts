// /api/admin/exemplars — the editor-in-chief's MODEL PIECES (table style_exemplars; see lib/journalism/exemplars.ts).
//   GET                                   every piece (without the long text, with a preview)
//   GET ?id=…                             one piece with its full text
//   POST {action:'create', desk, lang, title, body, articleType?, note?}   add a piece (inactive until switched on)
//   POST {action:'from_post', postId, desk?}   copy the seven editions of a published article as seven pieces (inactive)
//   PATCH {id, active?, title?, body?, desk?, note?, articleType?}          switch on / off, or edit
//   DELETE ?id=…                          remove a piece
// Admin session-gated. A piece reaches the writers only while active is true, so nothing here changes what the desk writes until a human
// switches a piece on.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { auditAdminRequest } from '@/lib/auditRequest';
import { EXEMPLAR_DESKS as DESKS } from '@/lib/journalism/exemplars';
import { LANGS } from '@/lib/journalism/languages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const plain = (s: string): string => String(s || '')
  .replace(/<\/?(?:strong|em|b|i|u|span|a|sup|sub|mark)\b[^>]*>/gi, '')
  .replace(/<\/(p|h2|h3|blockquote|li)>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, '’')
  .replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const sameSite = (req: NextRequest) => { const f = req.headers.get('sec-fetch-site'); return !f || f === 'same-origin' || f === 'none'; };
const str = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return bad('Sign in to /admin first.', 401);
  const sb = supabaseAdmin();
  const one = str(req.nextUrl.searchParams.get('id'), 64);
  if (one) {   // a single piece with its full text, to read it (or edit it) before switching it on
    const { data: piece, error: e1 } = await sb.from('style_exemplars').select('id, desk, lang, title, body, article_type, note, active, source_post_id').eq('id', one).maybeSingle();
    if (e1) return bad(e1.message, 500);
    if (!piece) return bad('Piece not found.', 404);
    return NextResponse.json({ ok: true, piece });
  }
  const { data, error } = await sb.from('style_exemplars').select('id, desk, lang, title, article_type, note, source_post_id, active, created_at, updated_at, body').order('desk').order('lang').order('created_at', { ascending: false }).limit(500);
  if (error) return bad(error.message.includes('does not exist') ? 'The table is missing: run the migration 20261012090000_article_desk_additions.sql first.' : error.message, 500);
  const rows = (data || []).map((r) => ({ ...r, body: undefined, words: String(r.body || '').split(/\s+/).filter(Boolean).length, preview: plain(String(r.body || '')).slice(0, 400) }));
  return NextResponse.json({ ok: true, pieces: rows });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return bad('Forbidden', 403);
  if (!sameSite(req)) return bad('Use the admin page.', 403);
  auditAdminRequest(req, 'exemplars.create');
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const sb = supabaseAdmin();

  if (b.action === 'from_post') {
    const postId = str(b.postId, 64);
    if (!postId) return bad('Provide postId.');
    const cols = ['category', 'slug', ...LANGS.flatMap((l) => [`title_${l}`, `content_${l}`])].join(', ');
    const { data: post, error } = await sb.from('blog_posts').select(cols).eq('id', postId).maybeSingle();
    if (error || !post) return bad('Article not found.', 404);
    const p = post as unknown as Record<string, unknown>;
    const desk = (DESKS as readonly string[]).includes(str(b.desk, 20)) ? str(b.desk, 20) : (DESKS as readonly string[]).includes(String(p.category)) ? String(p.category) : 'cyprus';
    const rows = LANGS.map((l) => ({ desk, lang: l, title: str(p[`title_${l}`], 300), body: plain(String(p[`content_${l}`] || '')), source_post_id: postId, active: false, created_by: 'admin', note: `From the published article ${String(p.slug)}` }))
      .filter((r) => r.title && r.body.length >= 200);
    if (!rows.length) return bad('The article has no edition long enough to serve as a model piece.');
    const { error: e2 } = await sb.from('style_exemplars').insert(rows);
    if (e2) return bad(e2.message, 500);
    return NextResponse.json({ ok: true, added: rows.length, note: 'Added as inactive pieces. Read them, then switch on the ones that set the standard.' });
  }

  const desk = str(b.desk, 20); const lang = str(b.lang, 4); const title = str(b.title, 300); const body = plain(String(b.body ?? ''));
  if (!(DESKS as readonly string[]).includes(desk)) return bad('Unknown desk.');
  if (!(LANGS as readonly string[]).includes(lang)) return bad('Unknown language.');
  if (!title) return bad('A piece needs a title.');
  if (body.length < 200) return bad('A model piece needs at least 200 characters of text.');
  const { error } = await sb.from('style_exemplars').insert({ desk, lang, title, body, article_type: str(b.articleType, 20) || null, note: str(b.note, 600) || null, active: false, created_by: 'admin' });
  if (error) return bad(error.message, 500);
  return NextResponse.json({ ok: true, added: 1, note: 'Added as an inactive piece.' });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return bad('Forbidden', 403);
  if (!sameSite(req)) return bad('Use the admin page.', 403);
  auditAdminRequest(req, 'exemplars.update');
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = str(b.id, 64);
  if (!id) return bad('Provide id.');
  const patch: Record<string, unknown> = {};
  if (typeof b.active === 'boolean') patch.active = b.active;
  if (b.title !== undefined) { const t = str(b.title, 300); if (!t) return bad('A piece needs a title.'); patch.title = t; }
  if (b.body !== undefined) { const t = plain(String(b.body)); if (t.length < 200) return bad('A model piece needs at least 200 characters of text.'); patch.body = t; }
  if (b.desk !== undefined) { if (!(DESKS as readonly string[]).includes(str(b.desk, 20))) return bad('Unknown desk.'); patch.desk = str(b.desk, 20); }
  if (b.note !== undefined) patch.note = str(b.note, 600) || null;
  if (b.articleType !== undefined) patch.article_type = str(b.articleType, 20) || null;
  if (!Object.keys(patch).length) return bad('Nothing to change.');
  const { error } = await supabaseAdmin().from('style_exemplars').update(patch).eq('id', id);
  if (error) return bad(error.message, 500);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return bad('Forbidden', 403);
  if (!sameSite(req)) return bad('Use the admin page.', 403);
  auditAdminRequest(req, 'exemplars.delete');
  const id = str(req.nextUrl.searchParams.get('id'), 64);
  if (!id) return bad('Provide id.');
  const { error } = await supabaseAdmin().from('style_exemplars').delete().eq('id', id);
  if (error) return bad(error.message, 500);
  return NextResponse.json({ ok: true });
}
