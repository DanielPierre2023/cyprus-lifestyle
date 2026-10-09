// The CRM duplicate merge is pasted into the Supabase SQL editor and may be run in one go or in pieces, through a pooled connection.
// The first version created a helper table inside BEGIN … COMMIT and used it in later statements; run in pieces it failed with
// `relation "public._crm_merge_members" does not exist`. It is now ONE statement (a DO block) with a session-local helper table.
// The behaviour itself was checked against PostgreSQL 16 (same result as the old file; in pieces; with a missing table; with an extra table
// that points at crm_orgs; with a composite key; with a failure half way); here the shape that makes it robust is pinned.
import { readFileSync } from 'node:fs';
import { checkMigrations } from '../lib/migrations.mjs';
import { eq, ok, report } from './_harness';

const NAME = '20261008120000_crm_merge_duplicate_orgs.sql';
const sql = readFileSync(`supabase/migrations/${NAME}`, 'utf8');
const code = sql.replace(/--.*$/gm, '');                                   // without comments
const doStart = code.indexOf('do $merge$');
const doEnd = code.indexOf('$merge$;', doStart + 10) + '$merge$;'.length;
const outside = doStart === -1 ? code : code.slice(0, doStart) + code.slice(doEnd);

ok('the merge is one DO block', doStart > -1 && doEnd > doStart && (code.match(/\bdo\s+\$merge\$/gi) || []).length === 1);
ok('no transaction control at the top level (nothing has to stay open between runs)', !/^\s*(begin|commit|rollback|start\s+transaction)\s*;/im.test(outside) && !/^\s*(commit|rollback)\s*;/im.test(code));
ok('outside the DO block there are only read-only statements (preview and verification)', !/\b(insert|update|delete|create|drop|alter|truncate|grant)\b/i.test(outside) && (outside.match(/;/g) || []).length === 2);
ok('the helper table is session-local and dropped by the statement itself', /create\s+temp(?:orary)?\s+table\s+_crm_merge_members\s+on\s+commit\s+drop\s+as/i.test(code));
ok('no statement depends on a helper table in the public schema', !/public\._crm_merge_members/.test(code));
ok('the references are re-pointed from the database\'s own foreign keys, not from a fixed list of tables', /pg_constraint/.test(code) && /confrelid\s*=\s*'public\.crm_orgs'::regclass/.test(code) && !/^\s*update\s+public\.(crm_contacts|crm_deals|crm_activities|crm_enrollments|editorial_pieces|ad_leads|ad_orders|blog_posts|sponsor_banners|newsletter_sponsors|fulfillment_tasks|section_sponsors)\b/im.test(code));
ok('a composite key stops the merge before anything is touched', /array_length\(c\.conkey,\s*1\)\s*>\s*1/.test(code) && code.indexOf('raise exception') < code.indexOf('create temp table'));
ok('the duplicates are deleted only after every reference has been re-pointed', code.indexOf("execute format('update") > -1 && code.indexOf("execute format('update") < code.indexOf('delete from public.crm_orgs'));
ok('nothing is dropped or truncated (no marker needed)', !/\b(drop\s+table|truncate|drop\s+column)\b/i.test(code));
eq('the migration check accepts the file', checkMigrations([{ name: NAME, sql }]), []);
ok('the contacts are not deleted (the exact-duplicate pass stays commented out)', !/^\s*delete\s+from\s+public\.crm_contacts/im.test(code));

report('crm-merge-sql');
