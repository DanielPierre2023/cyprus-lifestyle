'use client';
import { useEffect, useRef, useState } from 'react';

// A dependency-free rich-text editor for article bodies. Writers format with the
// toolbar (or keyboard) and never touch HTML; it emits clean, semantic HTML
// (only the tags the reader + translator understand). A "HTML" toggle stays
// available as a power-user fallback.

const ALLOWED = new Set(['P', 'H2', 'H3', 'H4', 'STRONG', 'B', 'EM', 'I', 'U', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'A', 'BR', 'IMG', 'FIGURE', 'FIGCAPTION']);

function cleanInto(root: HTMLElement) {
  for (const c of Array.from(root.childNodes)) {
    if (c.nodeType === 1) {
      const el = c as HTMLElement;
      cleanInto(el);
      if (!ALLOWED.has(el.tagName)) {
        const parent = el.parentNode as Node;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      } else {
        for (const attr of Array.from(el.attributes)) {
          const keep = (el.tagName === 'A' && attr.name === 'href')
            || (el.tagName === 'IMG' && (attr.name === 'src' || attr.name === 'alt'));
          if (!keep) el.removeAttribute(attr.name);
        }
        if (el.tagName === 'A') { el.setAttribute('rel', 'noopener'); el.setAttribute('target', '_blank'); }
      }
    } else if (c.nodeType === 8) {
      c.parentNode?.removeChild(c);
    }
  }
}

function cleanHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  cleanInto(tmp);
  return tmp.innerHTML.replace(/<p>\s*<\/p>/g, '').trim();
}

const BTN: React.CSSProperties = { background: 'transparent', border: '1px solid var(--line, #d9cfb8)', borderRadius: 4, padding: '4px 9px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--ink,#26221b)' };

export default function RichEditor({ value, onChange, dir = 'ltr' }: { value: string; onChange: (html: string) => void; dir?: 'ltr' | 'rtl' }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'rich' | 'html'>('rich');

  // Initialise once, and re-sync when the value changes from outside (auto-translate,
  // AI clean, tab switch) but only while the field isn't focused, to avoid cursor jumps.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement !== el && el.innerHTML !== (value || '')) {
      el.innerHTML = value || '';
    }
  }, [value]);

  useEffect(() => {
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { /* ignore */ }
  }, []);

  function emit() { if (ref.current) onChange(cleanHtml(ref.current.innerHTML)); }
  function exec(cmd: string, arg?: string) { ref.current?.focus(); try { document.execCommand(cmd, false, arg); } catch { /* ignore */ } emit(); }
  function block(tag: string) { exec('formatBlock', `<${tag}>`); }
  function addLink() { const url = window.prompt('Link URL (https://…)'); if (url) exec('createLink', url); }
  function addImage() { const url = window.prompt('Image URL (https://…)'); if (!url) return; exec('insertHTML', `<img src="${url.replace(/"/g, '&quot;')}" alt="">`); }

  function onPaste(e: React.ClipboardEvent) {
    // Paste as plain text so pasted Word/web markup can't pollute the article.
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const html = text.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>').replace(/</g, '&lt;')}</p>`).join('');
    exec('insertHTML', html);
  }

  return (
    <div style={{ border: '1px solid var(--line, #d9cfb8)', borderRadius: 6, overflow: 'hidden' }}>
      <div className="row" style={{ gap: 5, padding: 8, borderBottom: '1px solid var(--line, #eadfc7)', flexWrap: 'wrap', background: 'var(--cream,#faf6ec)' }}>
        <button type="button" style={BTN} title="Paragraph" onClick={() => block('p')}>¶</button>
        <button type="button" style={BTN} title="Heading" onClick={() => block('h2')}>H2</button>
        <button type="button" style={BTN} title="Subheading" onClick={() => block('h3')}>H3</button>
        <button type="button" style={{ ...BTN, fontWeight: 800 }} title="Bold (Ctrl/Cmd+B)" onClick={() => exec('bold')}>B</button>
        <button type="button" style={{ ...BTN, fontStyle: 'italic' }} title="Italic (Ctrl/Cmd+I)" onClick={() => exec('italic')}>I</button>
        <button type="button" style={BTN} title="Quote" onClick={() => block('blockquote')}>❝</button>
        <button type="button" style={BTN} title="Bullet list" onClick={() => exec('insertUnorderedList')}>• List</button>
        <button type="button" style={BTN} title="Numbered list" onClick={() => exec('insertOrderedList')}>1. List</button>
        <button type="button" style={BTN} title="Link" onClick={addLink}>🔗</button>
        <button type="button" style={BTN} title="Image" onClick={addImage}>🖼</button>
        <button type="button" style={BTN} title="Clear formatting" onClick={() => { exec('removeFormat'); block('p'); }}>⨯</button>
        <button type="button" style={{ ...BTN, marginInlineStart: 'auto', color: mode === 'html' ? '#8a5b12' : 'var(--ink,#26221b)' }}
          title="Toggle HTML source" onClick={() => setMode((m) => (m === 'rich' ? 'html' : 'rich'))}>{'</>'}</button>
      </div>

      {mode === 'rich' ? (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          dir={dir}
          onInput={emit}
          onBlur={emit}
          onPaste={onPaste}
          className="rich-body"
          style={{ minHeight: 320, padding: '14px 16px', outline: 'none', fontSize: 15, lineHeight: 1.6, background: 'var(--paper,#fff)' }}
        />
      ) : (
        <textarea
          dir={dir}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%', minHeight: 320, border: 'none', outline: 'none', padding: '14px 16px', fontFamily: 'ui-monospace, monospace', fontSize: 13, background: 'var(--paper,#fff)' }}
        />
      )}
    </div>
  );
}
