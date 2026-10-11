import { supabaseServer } from '@/lib/supabase/server';
import { ARTICLE_TYPES } from '@/lib/journalism/prompts';
import { EXEMPLAR_DESKS } from '@/lib/journalism/exemplars';
import { LANGS } from '@/lib/journalism/languages';
import ExemplarManager, { type PostOption } from '@/components/admin/ExemplarManager';

export const dynamic = 'force-dynamic';

// Model pieces — the standard of each desk, chosen by the editor-in-chief. The article desk (edge function process-scraped-article) shows
// the SWITCHED-ON pieces of a story's desk to the writers as a standard of sound, never as material. A piece is off until a human switches
// it on, so nothing here changes what the desk writes until you decide. The list, the forms and the switches are in ExemplarManager;
// this page only brings the published articles that can be taken as pieces.
const POST_LIMIT = 120;

export default async function ExemplarsTab() {
  const sb = await supabaseServer();
  const { data } = await sb
    .from('blog_posts')
    .select('id, slug, title_en, category')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(POST_LIMIT);
  const posts: PostOption[] = ((data as { id: string; slug: string; title_en: string | null; category: string | null }[] | null) || [])
    .map((p) => ({ id: p.id, slug: p.slug, title: p.title_en || p.slug, category: p.category || '' }));

  return (
    <>
      <h1>Model pieces</h1>
      <p className="sub">
        Finished pieces that <strong>you</strong> approve as the standard of a desk. The article desk shows the pieces that are switched on to the writers of a story from
        the same desk: they teach register, density of facts, rhythm and how a lead is built far better than a list of rules. They are a standard, never material: the
        writers are told not to use their facts, names, figures or wording, and the fact check would catch it if they did.
      </p>
      <p className="sub">
        Nothing reaches the writers until you switch a piece on. Choose pieces you would sign: the lead is the news plus the number; every figure stands with its
        comparison; the length of a paragraph follows its content; the piece ends on a hard fact, not on a forecast or a moral.
      </p>
      <ExemplarManager desks={EXEMPLAR_DESKS} langs={LANGS} types={ARTICLE_TYPES} posts={posts} />
    </>
  );
}
