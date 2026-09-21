// Neighbourhood geo maths — haversine distance + bounding box (roadmap item:
// neighbourhood radius). Pure; no geocoding call.
import { haversineMeters, bbox } from '@/lib/geo';
import { approx, ok, report } from './_harness';

// Larnaca (Finikoudes ≈ 34.9182, 33.6390) → Limassol centre (≈ 34.7071, 33.0226):
// great-circle distance is ≈ 60 km. Allow generous tolerance.
approx('Larnaca→Limassol ≈ 60km', haversineMeters(34.9182, 33.6390, 34.7071, 33.0226), 60000, 3000);

// Zero distance for identical points.
approx('same point → 0m', haversineMeters(34.9, 33.6, 34.9, 33.6), 0, 1);

// A ~450m step in latitude (~0.004°) is roughly 445m.
approx('~0.004° lat ≈ 445m', haversineMeters(34.90, 33.60, 34.904, 33.60), 445, 40);

// bbox around a point contains the point and widens with radius.
const box = bbox(34.9182, 33.6390, 1000);
ok('bbox brackets the latitude', box.minLat < 34.9182 && box.maxLat > 34.9182);
ok('bbox brackets the longitude', box.minLng < 33.6390 && box.maxLng > 33.6390);
const wide = bbox(34.9182, 33.6390, 5000);
ok('larger radius → wider box', (wide.maxLat - wide.minLat) > (box.maxLat - box.minLat));

report('geo.math');
