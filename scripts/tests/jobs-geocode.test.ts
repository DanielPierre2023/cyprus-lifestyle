// Coordinate-backfill helpers (roadmap item 01 activation). Pure.
import { geocodeQuery, needsGeocode } from '@/lib/jobs.geocode';
import { eq, ok, report } from './_harness';

eq('address + district → Cyprus-scoped query', geocodeQuery({ address: '12 Finikoudes', district: 'Larnaca' }), '12 Finikoudes, Larnaca, Cyprus');
eq('district only', geocodeQuery({ district: 'Paphos' }), 'Paphos, Cyprus');
eq('nothing to geocode → empty', geocodeQuery({}), '');
eq('blank fields → empty', geocodeQuery({ address: '  ', district: '' }), '');

ok('missing coords + a location → needs geocode', needsGeocode({ lat: null, lng: null, district: 'Nicosia' }));
ok('has coords → does not need geocode', !needsGeocode({ lat: 34.9, lng: 33.6, district: 'Larnaca' }));
ok('missing coords but no location → cannot geocode', !needsGeocode({ lat: null, lng: null }));
ok('only lng missing still counts as missing', needsGeocode({ lat: 34.9, lng: null, district: 'Larnaca' }));

report('jobs.geocode');
