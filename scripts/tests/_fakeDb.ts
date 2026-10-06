// A tiny in-memory PostgREST for unit tests: tables of plain rows, the filters the member code uses, and optional unique indexes
// (a violating insert answers { error: { code: '23505' } } like Postgres). Not a general emulator: only what the tests need.
export type Row = Record<string, unknown>;

export function fakeDb(seed: Record<string, Row[]>, unique: Record<string, string[][]> = {}) {
  const tables: Record<string, Row[]> = { ...seed };
  let idc = 0;
  const from = (name: string) => {
    const rows = (tables[name] = tables[name] || []);
    const preds: ((r: Row) => boolean)[] = [];
    let mode: 'select' | 'update' | 'insert' | 'delete' = 'select';
    let patch: Row = {}; let limit = Infinity; let ins: Row | null = null;
    const run = (): { data: Row[]; error: { code: string; message: string } | null } => {
      if (mode === 'insert') {
        const row: Row = { id: `row${++idc}`, ...ins! };
        for (const cols of unique[name] || []) {
          if (rows.some((r) => cols.every((c) => r[c] !== undefined && r[c] === row[c]))) return { data: [], error: { code: '23505', message: `duplicate key (${cols.join(',')})` } };
        }
        rows.push(row); return { data: [row], error: null };
      }
      const hit = rows.filter((r) => preds.every((p) => p(r)));
      if (mode === 'update') {
        for (const r of hit) {
          const next = { ...r, ...patch };
          for (const cols of unique[name] || []) if (rows.some((o) => o !== r && cols.every((c) => next[c] !== undefined && o[c] === next[c]))) return { data: [], error: { code: '23505', message: 'duplicate key' } };
        }
        for (const r of hit) Object.assign(r, patch);
      }
      if (mode === 'delete') for (const r of hit) rows.splice(rows.indexOf(r), 1);
      return { data: hit.slice(0, limit), error: null };
    };
    const b: Record<string, unknown> = {
      select: () => b,
      update: (p: Row) => { mode = 'update'; patch = p; return b; },
      insert: (r: Row) => { mode = 'insert'; ins = r; return b; },
      delete: () => { mode = 'delete'; return b; },
      eq: (c: string, v: unknown) => { preds.push((r) => r[c] === v); return b; },
      neq: (c: string, v: unknown) => { preds.push((r) => r[c] !== v); return b; },
      is: (c: string, v: unknown) => { preds.push((r) => (r[c] ?? null) === v); return b; },
      not: (c: string, op: string, v: unknown) => { preds.push((r) => (op === 'is' && v === null ? r[c] != null : true)); return b; },
      in: (c: string, vs: unknown[]) => { preds.push((r) => vs.includes(r[c])); return b; },
      gt: (c: string, v: string) => { preds.push((r) => String(r[c]) > v); return b; },
      gte: (c: string, v: string) => { preds.push((r) => String(r[c]) >= v); return b; },
      lt: (c: string, v: string) => { preds.push((r) => r[c] != null && String(r[c]) < v); return b; },
      filter: () => b,
      ilike: (c: string, v: string) => { preds.push((r) => String(r[c] || '').toLowerCase() === v.replace(/\\(.)/g, '$1').toLowerCase()); return b; },
      order: () => b,
      limit: (n: number) => { limit = n; return b; },
      maybeSingle: async () => { const r = run(); return { data: r.data[0] ?? null, error: r.error }; },
      single: async () => { const r = run(); return { data: r.data[0] ?? null, error: r.error }; },
      then: (res: (v: unknown) => unknown) => res(run()),
    };
    return b;
  };
  return { sb: { from } as never, tables };
}
