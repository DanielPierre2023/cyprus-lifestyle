// Migration conventions — pure checks used by the CI gate.
import { checkMigrations, versionOf } from '../lib/migrations.mjs';
import { eq, ok, report } from './_harness';

const f = (name: string, sql = 'select 1;') => ({ name, sql });
eq('good legacy + timestamp names pass', checkMigrations([f('0001_init.sql'), f('20261005120000_hotfix.sql')]), []);
ok('bad name rejected', checkMigrations([f('Fix Stuff.sql')]).length === 1);
ok('uppercase name rejected', checkMigrations([f('0001_Init.sql')]).length === 1);
ok('duplicate version rejected', checkMigrations([f('0001_a.sql'), f('0001_b.sql')]).some((p) => /already used/.test(p)));
ok('empty (comment-only) migration rejected', checkMigrations([f('0001_a.sql', '-- nothing here\n/* x */')]).some((p) => /no SQL/.test(p)));
eq('versionOf', [versionOf('0042_x.sql'), versionOf('20261005120000_x.sql'), versionOf('x.sql')], ['0042', '20261005120000', null]);

// destructive-change gate applies from 20261005000000
ok('legacy migration may drop (grandfathered)', checkMigrations([f('0010_x.sql', 'drop table old;')]).length === 0);
ok('new migration dropping a table needs the marker', checkMigrations([f('20261005130000_x.sql', 'drop table public.old;')]).some((p) => /allow-destructive/.test(p)));
eq('marker with reason allows it', checkMigrations([f('20261005130000_x.sql', '-- allow-destructive: table unused since 2025\ndrop table public.old;')]), []);
ok('drop table inside a comment is ignored', checkMigrations([f('20261005130000_x.sql', '-- drop table x\nselect 1;')]).length === 0);
ok('truncate needs marker too', checkMigrations([f('20261005130000_x.sql', 'truncate public.t;')]).length === 1);
ok('drop column needs marker too', checkMigrations([f('20261005130000_x.sql', 'alter table t drop column c;')]).length === 1);

// enum values must be alone
eq('enum add alone is fine', checkMigrations([f('20261005130000_x.sql', "alter type public.app_role add value if not exists 'editor';")]), []);
ok('enum add with other statements rejected', checkMigrations([f('20261005130000_x.sql', "alter type public.app_role add value 'editor'; create table t(i int);")]).some((p) => /only statement/.test(p)));
ok('two enum adds together are fine (only adds)', checkMigrations([f('20261005130000_x.sql', "alter type public.app_role add value 'a'; alter type public.app_role add value 'b';")]).length === 0);

report('migrations-check');
