// scripts/lib/migrations.mjs — pure checks over supabase/migrations/*.sql (no I/O).
// Shared by scripts/check-migrations.mjs (CI gate) and its unit test.
//
// Conventions enforced:
//   • file name: NNNN_snake_case.sql (legacy, 4 digits) or YYYYMMDDHHMMSS_snake_case.sql
//   • the version prefix is unique (two files can't claim the same version)
//   • files are never empty
//   • from STRICT_FROM onwards a migration that drops/truncates data must say so explicitly with a
//     `-- allow-destructive: <reason>` comment, so it can't slip in unnoticed
//   • from STRICT_FROM onwards `alter type … add value` must live alone in its file: Postgres
//     cannot use a new enum value in the same transaction that added it (the SQL editor and
//     migration runners wrap a file in one transaction)
export const NAME_RE = /^(\d{4}|\d{14})_[a-z0-9_]+\.sql$/;
export const STRICT_FROM = '20261005000000';

const stripComments = (sql) => sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

export function versionOf(name) { const m = /^(\d+)_/.exec(name); return m ? m[1] : null; }

export function checkMigrations(files) {
  // files: [{ name, sql }]
  const problems = [];
  const seen = new Map();
  for (const { name, sql } of files) {
    if (!NAME_RE.test(name)) problems.push(`${name}: file name must be NNNN_snake_case.sql or YYYYMMDDHHMMSS_snake_case.sql`);
    const v = versionOf(name);
    if (v) { if (seen.has(v)) problems.push(`${name}: version ${v} is already used by ${seen.get(v)}`); else seen.set(v, name); }
    if (!stripComments(sql).trim()) problems.push(`${name}: migration has no SQL statements`);
    if (v && v.length === 14 && v >= STRICT_FROM) {
      const code = stripComments(sql);
      if (/\b(drop\s+table|drop\s+column|truncate\b)/i.test(code) && !/--\s*allow-destructive\s*:\s*\S+/i.test(sql)) {
        problems.push(`${name}: drops/truncates data — add a "-- allow-destructive: <reason>" comment to confirm it is intended`);
      }
      const addsEnum = /alter\s+type\s+[\w."]+\s+add\s+value/i.test(code);
      if (addsEnum) {
        const others = code.split(';').map((s) => s.trim()).filter(Boolean).filter((s) => !/^alter\s+type\s+[\w."]+\s+add\s+value/i.test(s));
        if (others.length) problems.push(`${name}: "alter type … add value" must be the only statement in its file (new enum values cannot be used in the same transaction)`);
      }
    }
  }
  return problems;
}
