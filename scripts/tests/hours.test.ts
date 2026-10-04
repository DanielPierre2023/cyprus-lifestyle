// "Open now" on the map popup (lib/map/hours.ts): the opening-hours formats owners and
// imports write, in Cyprus time, including late nights and split shifts.
import { parseDay, openState, cyprusClock } from '@/lib/map/hours';
import { eq, ok, report } from './_harness';

eq('simple range', parseDay('09:00–18:00'), [[540, 1080]]);
eq('am/pm', parseDay('9 AM – 5:30 PM'), [[540, 1050]]);
eq('unmarked start takes pm when earlier', parseDay('1 - 5 pm'), [[780, 1020]]);
eq('unmarked start stays am when later', parseDay('9 - 5 pm'), [[540, 1020]]);
eq('split shift', parseDay('10:00-14:00, 17:00-23:00'), [[600, 840], [1020, 1380]]);
eq('past midnight', parseDay('20:00 – 02:00'), [[1200, 1560]]);
eq('dots', parseDay('8.30-13.00'), [[510, 780]]);
eq('closed', parseDay('Closed'), 'closed');
eq('closed in Greek', parseDay('Κλειστό'), 'closed');
eq('24 hours', parseDay('Open 24 hours'), 'allday');
eq('unreadable', parseDay('by appointment'), null);
eq('empty', parseDay(''), null);

// Cyprus is UTC+3 in summer (EEST): 2026-10-07 is a Wednesday.
const wed1000 = new Date('2026-10-07T07:00:00Z');
eq('cyprus clock', cyprusClock(wed1000), { day: 'wed', min: 600 });
eq('open now', openState({ wed: '09:00–18:00' }, wed1000), { state: 'open', today: '09:00–18:00' });
eq('closed now (before opening)', openState({ wed: '11:00–18:00' }, wed1000)?.state, 'closed');
eq('no entry today but other days → closed', openState({ mon: '09:00–18:00' }, wed1000), { state: 'closed', today: null });
eq('unknown text → unknown', openState({ wed: 'by appointment' }, wed1000)?.state, 'unknown');
eq('no hours → null', openState(null, wed1000), null);
const thu0100 = new Date('2026-10-07T22:00:00Z'); // Thu 01:00 in Cyprus
ok('open from yesterday past midnight', openState({ wed: '20:00–02:00', thu: 'Closed' }, thu0100)?.state === 'open');
// Winter time (EET, UTC+2): 2026-12-02 is a Wednesday.
eq('winter clock', cyprusClock(new Date('2026-12-02T08:00:00Z')), { day: 'wed', min: 600 });

report('map.hours');
