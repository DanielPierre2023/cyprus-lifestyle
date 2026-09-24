import { supabaseServer } from '@/lib/supabase/server';
import FieldNoteForm from '@/components/admin/FieldNoteForm';

export const dynamic = 'force-dynamic';

// Field notes — the human half of the engine. An editor logs a visit, interview or
// story (what they saw, tasted, heard); the AI editor redacts a house-voice piece
// from it, which flows into the pipeline and elevates the subject's listing.

type Note = {
  id: string; kind: string; subject_name: string | null; place: string | null; rating: number | null;
  status: string; blog_post_id: string | null; created_at: string; author: string | null;
};

export default async function FieldNotesTab() {
  const sb = await supabaseServer();
  const { data } = await sb.from('editorial_field_notes')
    .select('id, kind, subject_name, place, rating, status, blog_post_id, created_at, author')
    .order('created_at', { ascending: false }).limit(60);
  const notes = (data as Note[] | null) || [];

  return (
    <>
      <h1>Field notes</h1>
      <p className="sub">Back from a restaurant, bar, hotel, boutique — or a meeting with someone worth writing about? Log what you saw, tasted and heard. The AI editor turns it into a high-level piece, in seven languages, and elevates the subject in the directory.</p>

      <FieldNoteForm />

      <h1 style={{ fontSize: 18, marginTop: 20 }}>Recent field notes</h1>
      <table className="adm-t">
        <thead><tr><th>Subject</th><th>Kind</th><th>Place</th><th>Rating</th><th>Status</th><th>By</th><th>When</th></tr></thead>
        <tbody>
          {notes.map((n) => (
            <tr key={n.id}>
              <td style={{ fontWeight: 600 }}>{n.subject_name || <span className="sub" style={{ margin: 0 }}>—</span>}</td>
              <td style={{ textTransform: 'capitalize' }}>{n.kind}</td>
              <td className="sub" style={{ margin: 0 }}>{n.place || '—'}</td>
              <td>{n.rating ? '★'.repeat(n.rating) : '—'}</td>
              <td><span style={{ color: n.status === 'drafted' || n.status === 'published' ? '#1f7a3f' : '#C9A24C', textTransform: 'capitalize', fontWeight: 600 }}>{n.status}</span></td>
              <td className="sub" style={{ margin: 0 }}>{n.author || '—'}</td>
              <td className="sub" style={{ margin: 0 }}>{new Date(n.created_at).toLocaleDateString('en-GB')}</td>
            </tr>
          ))}
          {notes.length === 0 ? <tr><td colSpan={7}>No field notes yet — log your first visit above.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
