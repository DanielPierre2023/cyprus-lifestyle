// lib/journalism/assessService.ts — the style check as a service, server side. Pure (no I/O): the route in app/api/desk/assess wraps it
// with the key gate. It runs the same judge as everywhere else (lib/journalism/assess.ts), so an article cannot pass here and fail in the
// voice worker. The client side is lib/journalism/assessClient.ts, which the Supabase edge function uses.
import { assessEdition } from './assess';
import { LANGS } from './languages';
import { ARTICLE_TYPES, type ArticleType } from './prompts';
import type { Assessment } from './pipeline';

/** Characters of HTML accepted per request (an article of 3,000 words is about 25,000). */
export const ASSESS_MAX_HTML = 250_000;

export type AssessReply = { status: 200; json: Assessment } | { status: 400; json: { ok: false; error: string } };
const bad = (error: string): AssessReply => ({ status: 400, json: { ok: false, error } });

export function runAssess(body: unknown): AssessReply {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const html = typeof b.html === 'string' ? b.html : '';
  const lang = String(b.lang ?? '');
  if (!html.trim()) return bad('html is empty');
  if (html.length > ASSESS_MAX_HTML) return bad(`html is longer than ${ASSESS_MAX_HTML} characters`);
  if (!(LANGS as string[]).includes(lang)) return bad(`unknown language "${lang.slice(0, 12)}"`);
  const articleType: ArticleType = (ARTICLE_TYPES as string[]).includes(String(b.articleType)) ? (b.articleType as ArticleType) : 'news';
  const title = String(b.title ?? '').slice(0, 400);
  const category = String(b.category ?? 'cyprus').slice(0, 40);
  return { status: 200, json: assessEdition(html, lang, { title, category, articleType }) };
}
