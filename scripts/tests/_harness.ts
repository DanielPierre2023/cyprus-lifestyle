// Minimal zero-dependency test harness. Each test file is bundled on its own
// (see run.mjs), so this module's counters are isolated per suite.
type State = { pass: number; fail: number; fails: string[] };
const S: State = { pass: 0, fail: 0, fails: [] };

export function eq(name: string, got: unknown, want: unknown): void {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) S.pass++; else { S.fail++; S.fails.push(`  ✗ ${name}: got ${g} want ${w}`); }
}
export function ok(name: string, cond: boolean): void {
  if (cond) S.pass++; else { S.fail++; S.fails.push(`  ✗ ${name}`); }
}
export function approx(name: string, got: number, want: number, tol: number): void {
  if (Math.abs(got - want) <= tol) S.pass++;
  else { S.fail++; S.fails.push(`  ✗ ${name}: got ${got} want ${want}±${tol}`); }
}
// Prints the suite result and throws on any failure, so run.mjs marks the file failed.
export function report(suite: string): void {
  console.log(`${S.fail === 0 ? '✓' : '✗'} ${suite}: ${S.pass} passed, ${S.fail} failed`);
  if (S.fail) { console.log(S.fails.join('\n')); throw new Error(`${suite}: ${S.fail} failed`); }
}
