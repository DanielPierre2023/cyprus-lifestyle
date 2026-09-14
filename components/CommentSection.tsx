'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface C { id: string; author_name: string; content: string; created_at: string }

export default function CommentSection({ postId }: { postId: string }) {
  const t = useTranslations('comments');
  const [list, setList] = useState<C[]>([]);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [company, setCompany] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');

  useEffect(() => {
    fetch(`/api/comments?post_id=${postId}`).then((r) => r.json()).then((d) => setList(d.comments || [])).catch(() => {});
  }, [postId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    const res = await fetch('/api/comments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, author_name: name, content, company }),
    });
    if (res.ok) { setState('done'); setContent(''); }
    else setState('idle');
  }

  return (
    <section className="comments wrap">
      <h2 className="display">{t('title')}</h2>
      {list.map((c) => (
        <div className="comment" key={c.id}>
          <div className="who">{c.author_name}</div>
          <p style={{ margin: '6px 0 0' }}>{c.content}</p>
        </div>
      ))}
      {state === 'done' ? (
        <p className="gold" style={{ marginTop: 16 }}>{t('pending')}</p>
      ) : (
        <form onSubmit={submit} style={{ marginTop: 20 }}>
          <div aria-hidden="true" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}>
            <label>Company<input type="text" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} /></label>
          </div>
          <input placeholder={t('name')} required value={name} onChange={(e) => setName(e.target.value)} />
          <textarea placeholder={t('placeholder')} required rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
          <button className="btn" type="submit" disabled={state === 'sending'}>{t('submit')}</button>
        </form>
      )}
    </section>
  );
}
