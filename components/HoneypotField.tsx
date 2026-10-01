'use client';
// The hidden spam-trap input shared by every public form. People never see or reach it
// (clipped to 1px, aria-hidden, tabindex -1, autocomplete off, and opted out of the
// common password-manager autofills); a naive form-filling bot populates every text
// input, fills it, and the API drops the submission via isHoneypot() (lib/ratelimit.ts).
//
// The field NAME comes from lib/honeypot.ts so the form and the server check cannot
// drift. Forms keep the value in their own state and send it under that name:
//   body: JSON.stringify({ ...fields, [HONEYPOT_FIELD]: hp })
//
// Clip-style hiding (not `left: -9999px`) so it cannot add a horizontal scrollbar on
// right-to-left (Arabic) pages.
import { HONEYPOT_FIELD } from '@/lib/honeypot';

export default function HoneypotField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}
    >
      <label>
        Leave this field empty
        <input
          type="text"
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore="true"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
