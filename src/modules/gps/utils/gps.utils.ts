import { GenericGPS } from '@modules/gps/domain/interfaces/generic-gps.interface';
import { DateTime }   from 'luxon';

export type GpsPoint = { ts: number; lat: number; lng: number };

// ===== Utilidades de tiempo =====
export function parseGpsTimeToUnixSeconds(raw: number | string | undefined | null): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return Math.floor(raw);

  const s = String(raw).trim();
  // epoch en string (10 o 13 dígitos)
  if (/^\d{10,13}$/.test(s)) {
    const n = Number(s);
    return n > 1e12 ? Math.floor(n / 1000) : Math.floor(n);
  }

  // ISO 8601
  let dt = DateTime.fromISO(s, {setZone: true});
  if (dt.isValid) return Math.floor(dt.toUTC().toSeconds());

  // "yyyy-MM-dd HH:mm:ss" en America/Santiago
  dt = DateTime.fromFormat(s, 'yyyy-MM-dd HH:mm:ss', {zone: 'America/Santiago'});
  if (dt.isValid) return Math.floor(dt.toUTC().toSeconds());

  // variantes comunes
  dt = DateTime.fromFormat(s, 'yyyy-MM-dd\'T\'HH:mm:ss.SSSZZ', {setZone: true});
  if (dt.isValid) return Math.floor(dt.toUTC().toSeconds());
  dt = DateTime.fromFormat(s, 'yyyy-MM-dd HH:mm:ssZZ', {setZone: true});
  if (dt.isValid) return Math.floor(dt.toUTC().toSeconds());

  return null;
}

// ===== Geometría =====
const R = 6371000; // m
function toRad(d: number) { return d * Math.PI / 180; }

function makeProject(latRef: number) {
  const cosRef = Math.cos(toRad(latRef));
  return {
    toXY(p: { lat: number; lng: number }) {
      const x = toRad(p.lng) * R * cosRef;
      const y = toRad(p.lat) * R;
      return {x, y};
    },
    toLatLng(xy: { x: number; y: number }) {
      const lat = (xy.y / R) * 180 / Math.PI;
      const lng = (xy.x / (R * cosRef)) * 180 / Math.PI;
      return {lat, lng};
    }
  };
}

function perpendicularDistanceMeters(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const vx = b.x - a.x, vy = b.y - a.y;
  const wx = p.x - a.x, wy = p.y - a.y;
  const c1 = vx * wx + vy * wy;
  const c2 = vx * vx + vy * vy;
  const t = c2 === 0 ? 0 : Math.max(0, Math.min(1, c1 / c2));
  const projX = a.x + t * vx, projY = a.y + t * vy;
  return Math.hypot(p.x - projX, p.y - projY);
}

// ===== Douglas–Peucker en metros =====
export function rdpSimplify(points: GpsPoint[], epsilonMeters: number): GpsPoint[] {
  if (points.length <= 2) return points.slice();
  const proj = makeProject(points[0].lat);
  const xy = points.map(p => ({p, xy: proj.toXY(p)}));

  function simplify(i0: number, i1: number, out: GpsPoint[]) {
    let maxD = -1, idx = -1;
    for (let i = i0 + 1; i < i1; i++) {
      const d = perpendicularDistanceMeters(xy[i].xy, xy[i0].xy, xy[i1].xy);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > epsilonMeters && idx !== -1) {
      simplify(i0, idx, out);
      simplify(idx, i1, out);
    } else {
      out.push(xy[i0].p, xy[i1].p);
    }
  }

  const tmp: GpsPoint[] = [];
  simplify(0, points.length - 1, tmp);
  tmp.sort((a, b) => a.ts - b.ts);

  const result: GpsPoint[] = [];
  for (let i = 0; i < tmp.length; i++) {
    if (i === 0 || tmp[i].ts !== tmp[i - 1].ts) result.push(tmp[i]);
  }
  return result;
}

// ===== Kalman 2D constante-velocidad =====
class Kalman1D {
  x = new Float64Array([ 0, 0 ]);
  P = new Float64Array([ 1, 0, 0, 1 ]);

  constructor(public q = 1, public r = 25) {}

  predict(dt: number) {
    const x0 = this.x[0] + dt * this.x[1];
    const p00 = this.P[0] + dt * (this.P[1] + this.P[2]) + dt * dt * this.P[3];
    const p01 = this.P[1] + dt * this.P[3];
    const p10 = this.P[2] + dt * this.P[3];
    const p11 = this.P[3];
    const dt2 = dt * dt, dt3 = dt2 * dt;
    const q00 = this.q * dt3 / 3, q01 = this.q * dt2 / 2, q11 = this.q * dt;
    this.x[0] = x0;
    this.P[0] = p00 + q00;
    this.P[1] = p01 + q01;
    this.P[2] = p10 + q01;
    this.P[3] = p11 + q11;
  }

  update(zPos: number) {
    const y = zPos - this.x[0];
    const S = this.P[0] + this.r;
    const K0 = this.P[0] / S;
    const K1 = this.P[2] / S;
    this.x[0] += K0 * y;
    this.x[1] += K1 * y;
    const p00 = (1 - K0) * this.P[0];
    const p01 = (1 - K0) * this.P[1];
    const p10 = this.P[2] - K1 * this.P[0];
    const p11 = this.P[3] - K1 * this.P[1];
    this.P[0] = p00;
    this.P[1] = p01;
    this.P[2] = p10;
    this.P[3] = p11;
  }
}

export function kalmanSmooth(points: GpsPoint[], opts?: { q?: number; r?: number; maxDt?: number }): GpsPoint[] {
  if (points.length === 0) return [];
  const sorted = points.slice().sort((a, b) => a.ts - b.ts);

  const proj = makeProject(sorted[0].lat);
  const xy = sorted.map(p => ({ts: p.ts, ...proj.toXY(p)}));

  const q = opts?.q ?? 1;
  const r = opts?.r ?? 25;
  const maxDt = opts?.maxDt ?? 5;

  const kx = new Kalman1D(q, r);
  const ky = new Kalman1D(q, r);
  kx.x[0] = xy[0].x;
  ky.x[0] = xy[0].y;

  const out: GpsPoint[] = [];
  for (let i = 0; i < xy.length; i++) {
    const dt = i === 0 ? 0 : Math.min(maxDt, Math.max(0, xy[i].ts - xy[i - 1].ts));
    if (i > 0) {
      kx.predict(dt);
      ky.predict(dt);
    }
    kx.update(xy[i].x);
    ky.update(xy[i].y);
    const {lat, lng} = proj.toLatLng({x: kx.x[0], y: ky.x[0]});
    out.push({ts: xy[i].ts, lat, lng});
  }
  return out;
}

// ===== Adaptador desde GenericGPS =====
/**
 * Convierte una lista de lecturas GenericGPS en puntos {ts,lat,lng}.
 * - Usa currentLocation.timestamp si existe; si no, usa `timestamp` textual.
 * - Expande lastLocations entre la lectura anterior y la actual interpolando ts.
 * - Garantiza orden temporal y elimina duplicados.
 */
export function genericToPoints(readings: GenericGPS[]): GpsPoint[] {
  // Normaliza timestamp por lectura
  const rows = readings.map(r => {
    const ts = Number.isFinite(r.currentLocation?.timestamp)
      ? Math.floor(r.currentLocation.timestamp)
      : parseGpsTimeToUnixSeconds(r.timestamp ?? null);
    return {ts, cl: r.currentLocation, last: r.lastLocations ?? [] as { lat: number; lng: number }[]};
  }).filter(x => Number.isFinite(x.ts) && x.cl && Number.isFinite(x.cl.lat) && Number.isFinite(x.cl.lng)) as Array<{
    ts: number; cl: { lat: number; lng: number }; last: { lat: number; lng: number }[];
  }>;

  // Ordena por ts asc
  rows.sort((a, b) => a.ts - b.ts);

  const out: GpsPoint[] = [];
  let prevTs: number | null = null;
  let prevLatLng: { lat: number; lng: number } | null = null;

  for (const row of rows) {
    const currTs = row.ts;
    const seq: { lat: number; lng: number }[] = (row.last?.length ? row.last : []).slice();
    // asegura que el último punto sea el currentLocation
    const lastIsCL = seq.length > 0 && Math.abs(seq[seq.length - 1].lat - row.cl.lat) < 1e-8 && Math.abs(seq[seq.length - 1].lng - row.cl.lng) < 1e-8;
    if (!lastIsCL) seq.push({lat: row.cl.lat, lng: row.cl.lng});

    // dedupe consecutivos iguales contra el último global
    const coords: { lat: number; lng: number }[] = [];
    for (const p of seq) {
      if (!prevLatLng || p.lat !== prevLatLng.lat || p.lng !== prevLatLng.lng) {
        coords.push(p);
      }
      prevLatLng = p;
    }
    if (coords.length === 0) continue;

    // asignación de ts: reparte entre prevTs y currTs
    if (prevTs == null) {
      // primer paquete: asigna currTs - n + i para preservar orden
      const base = currTs - coords.length;
      for (let i = 0; i < coords.length; i++) {
        out.push({ts: base + i + 1, lat: coords[i].lat, lng: coords[i].lng});
      }
    } else {
      const span = Math.max(1, currTs - prevTs);
      const step = span / coords.length;
      for (let i = 0; i < coords.length; i++) {
        const ts = Math.floor(prevTs + (i + 1) * step); // estrictamente creciente
        out.push({ts, lat: coords[i].lat, lng: coords[i].lng});
      }
    }
    prevTs = currTs;
  }

  // De-dupe por (ts,lat,lng) y orden final
  const seen = new Set<string>();
  const uniq = out
    .sort((a, b) => a.ts - b.ts)
    .filter(p => {
      const k = `${ p.ts }|${ p.lat }|${ p.lng }`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  return uniq;
}

// ===== Pipeline completo =====
export function buildCleanPathFromGeneric(
  readings: GenericGPS[],
  cfg?: { kalman?: { q?: number; r?: number; maxDt?: number }, rdpEpsMeters?: number }
): GpsPoint[] {
  // Sort by referenceId (string field)
  readings.sort((a, b) => a.referenceId.localeCompare(b.referenceId));

  const pts = genericToPoints(readings);
  if (pts.length <= 2) return pts;
  const smoothed = kalmanSmooth(pts, cfg?.kalman);
  const simplified = rdpSimplify(smoothed, cfg?.rdpEpsMeters ?? 8);
  return simplified;
}
