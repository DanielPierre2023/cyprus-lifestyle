// lib/events/robots.ts — a robots.txt evaluator that follows RFC 9309: pick the group for our crawler token (else "*"), longest
// matching rule wins, Allow beats Disallow on a tie, "*" and "$" wildcards work. Pure; tested against real robots.txt files.
export const BOT_TOKEN = 'cypruslifestylebot';

interface Group { agents: string[]; rules: { allow: boolean; pattern: string }[] }

export function parseRobots(txt: string): Group[] {
  const groups: Group[] = [];
  let cur: Group | null = null, lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === 'user-agent') {
      if (!cur || !lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase()); lastWasAgent = true;
    } else if ((key === 'allow' || key === 'disallow') && cur) {
      lastWasAgent = false;
      if (val) cur.rules.push({ allow: key === 'allow', pattern: val });
    } else lastWasAgent = false;
  }
  return groups;
}

const toRe = (p: string) => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));

/** May our bot fetch `pathWithQuery` (e.g. "/events/?ical=1")? An unreadable/absent robots.txt means yes. */
export function robotsAllows(robotsTxt: string | null | undefined, pathWithQuery: string): boolean {
  if (!robotsTxt) return true;
  const groups = parseRobots(robotsTxt);
  const mine = groups.filter((g) => g.agents.some((a) => a !== '*' && (BOT_TOKEN.includes(a.replace(/[^a-z]/g, '')) || a.includes('cyprus'))));
  const use = mine.length ? mine : groups.filter((g) => g.agents.includes('*'));
  let best: { allow: boolean; len: number } | null = null;
  for (const g of use) for (const r of g.rules) {
    if (!toRe(r.pattern).test(pathWithQuery)) continue;
    const len = r.pattern.length;
    if (!best || len > best.len || (len === best.len && r.allow)) best = { allow: r.allow, len };
  }
  return best ? best.allow : true;
}
