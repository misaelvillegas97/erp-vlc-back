// gps.utils.ts
// Ajusta las rutas si tu estructura difiere.
import { DateTime }   from 'luxon';
import { GenericGPS } from '@modules/gps/domain/interfaces/generic-gps.interface';

// -------- Tipos públicos --------
export type GpsPoint = { ts: number; lat: number; lng: number };

// -------- Utilidades de tiempo --------
/** Parsea hora en múltiples formatos a epoch seconds UTC. */
export function parseGpsTimeToUnixSeconds(raw: number | string | null | undefined): number | null {
  if (raw == null) return null;

  if (typeof raw === 'number') {
    // Heurística: 13 dígitos = ms, 10 = s
    if (raw > 1e12) return Math.floor(raw / 1000);
    if (raw > 1e9) return Math.floor(raw);
    return null;
  }

  const s = String(raw).trim();
  if (/^\d{10,13}$/.test(s)) {
    const n = Number(s);
    return n > 1e12 ? Math.floor(n / 1000) : Math.floor(n);
  }

  // ISO 8601 con o sin zona
  let dt = DateTime.fromISO(s, {setZone: true});
  if (dt.isValid) return Math.floor(dt.toUTC().toSeconds());

  // Formato histórico local BIOGPS
  dt = DateTime.fromFormat(s, 'yyyy-MM-dd HH:mm:ss', {zone: 'America/Santiago'});
  if (dt.isValid) return Math.floor(dt.toUTC().toSeconds());

  // Variantes comunes
  dt = DateTime.fromFormat(s, 'yyyy-MM-dd\'T\'HH:mm:ss.SSSZZ', {setZone: true});
  if (dt.isValid) return Math.floor(dt.toUTC().toSeconds());
  dt = DateTime.fromFormat(s, 'yyyy-MM-dd HH:mm:ssZZ', {setZone: true});
  if (dt.isValid) return Math.floor(dt.toUTC().toSeconds());

  return null;
}

// -------- Geometría --------
const R = 6371000; // m
const toRad = (d: number) => d * Math.PI / 180;
const toDeg = (r: number) => r * 180 / Math.PI;

function projector(latRef: number) {
  const c = Math.cos(toRad(latRef));
  return {
    toXY(p: { lat: number; lng: number }) {
      return {x: toRad(p.lng) * R * c, y: toRad(p.lat) * R};
    },
    toLatLng(xy: { x: number; y: number }) {
      return {lat: toDeg(xy.y / R), lng: toDeg(xy.x / (R * c))};
    }
  };
}

export function haversineMeters(a: GpsPoint, b: GpsPoint) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function bearingDeg(a: GpsPoint, b: GpsPoint) {
  const φ1 = toRad(a.lat), φ2 = toRad(b.lat), λ1 = toRad(a.lng), λ2 = toRad(b.lng);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function turnDeltaDeg(a: GpsPoint, b: GpsPoint, c: GpsPoint) {
  const h1 = bearingDeg(a, b), h2 = bearingDeg(b, c);
  let d = Math.abs(h2 - h1);
  if (d > 180) d = 360 - d;
  return d;
}

function crossTrackMeters(p: GpsPoint, a: GpsPoint, b: GpsPoint) {
  const pr = projector(a.lat);
  const A = pr.toXY(a), B = pr.toXY(b), P = pr.toXY(p);
  const vx = B.x - A.x, vy = B.y - A.y, wx = P.x - A.x, wy = P.y - A.y;
  const t = (vx * wx + vy * wy) / (vx * vx + vy * vy || 1);
  const u = Math.max(0, Math.min(1, t));
  const px = A.x + u * vx, py = A.y + u * vy;
  return Math.hypot(P.x - px, P.y - py);
}

// -------- Filtros --------
/** Gating de outliers por velocidad, aceleración y error lateral. */
export function gateOutliers(
  pts: GpsPoint[],
  cfg: { vmax?: number; amax?: number; xtMax?: number; turnDeg?: number } = {}
): GpsPoint[] {
  if (pts.length < 2) return pts;
  const vmax = cfg.vmax ?? 40;          // m/s
  const amax = cfg.amax ?? 4.0;         // m/s²
  const xtMax = cfg.xtMax ?? Infinity;    // desactiva por defecto
  const tGate = cfg.turnDeg ?? 18;          // acepta giros pronunciados

  const out: GpsPoint[] = [ pts[0] ];
  for (let i = 1; i < pts.length; i++) {
    const a = out[out.length - 1], b = pts[i];
    const dt = Math.max(1, b.ts - a.ts);
    const v = haversineMeters(a, b) / dt;
    const vp = out.length > 1
      ? haversineMeters(out[out.length - 2], a) / Math.max(1, a.ts - out[out.length - 2].ts)
      : v;
    const acc = Math.abs(v - vp) / dt;

    const turn = out.length > 1 ? turnDeltaDeg(out[out.length - 2], a, b) : 180;
    const xt = out.length > 1 ? crossTrackMeters(b, out[out.length - 2], a) : 0;

    if (v <= vmax && acc <= amax && (xt <= xtMax || turn >= tGate)) {
      out.push(b);
    }
  }
  return out;
}

/** RDP con anclas en cambios de rumbo, evita cortar esquinas. */
export function rdpWithAnchors(pts: GpsPoint[], epsMeters: number, turnDeg = 22): GpsPoint[] {
  if (pts.length <= 2) return pts.slice();
  const keep = new Array(pts.length).fill(false);
  for (let i = 1; i < pts.length - 1; i++) {
    if (turnDeltaDeg(pts[i - 1], pts[i], pts[i + 1]) >= turnDeg) keep[i] = true;
  }
  const pr = projector(pts[0].lat);
  const xy = pts.map(p => pr.toXY(p));

  function rdp(i0: number, i1: number) {
    let maxD = -1, idx = -1;
    const A = xy[i0], B = xy[i1];
    for (let i = i0 + 1; i < i1; i++) {
      if (keep[i]) {
        idx = i;
        maxD = Infinity;
        break;
      }
      const vx = B.x - A.x, vy = B.y - A.y, wx = xy[i].x - A.x, wy = xy[i].y - A.y;
      const t = (vx * wx + vy * wy) / (vx * vx + vy * vy || 1);
      const u = Math.max(0, Math.min(1, t));
      const px = A.x + u * vx, py = A.y + u * vy;
      const d = Math.hypot(xy[i].x - px, xy[i].y - py);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > epsMeters && idx !== -1) {
      keep[idx] = true;
      rdp(i0, idx);
      rdp(idx, i1);
    } else {
      keep[i0] = true;
      keep[i1] = true;
    }
  }

  rdp(0, pts.length - 1);

  const out: GpsPoint[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (keep[i]) out.push(pts[i]);
  }
  return out;
}

// -------- Kalman 2D constante-velocidad --------
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

/** Suavizado Kalman en XY local. */
export function kalmanSmooth(points: GpsPoint[], opts?: { q?: number; r?: number; maxDt?: number }): GpsPoint[] {
  if (points.length === 0) return [];
  const sorted = points.slice().sort((a, b) => a.ts - b.ts);
  const pr = projector(sorted[0].lat);
  const xy = sorted.map(p => ({ts: p.ts, ...pr.toXY(p)}));
  const q = opts?.q ?? 0.6;
  const r = opts?.r ?? 25;
  const maxDt = opts?.maxDt ?? 2;

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
    const {lat, lng} = pr.toLatLng({x: kx.x[0], y: ky.x[0]});
    out.push({ts: xy[i].ts, lat, lng});
  }
  return out;
}

// -------- Adaptador desde GenericGPS --------
/**
 * Convierte lecturas GenericGPS en puntos ordenados.
 * Expande lastLocations y asigna timestamps estrictamente crecientes.
 */
export function genericToPoints(readings: GenericGPS[]): GpsPoint[] {
  const rows = (readings ?? [])
    .map(r => {
      const ts = Number.isFinite(r.currentLocation?.timestamp)
        ? Math.floor(r.currentLocation.timestamp)
        : parseGpsTimeToUnixSeconds(r.timestamp ?? null);
      const cl = r.currentLocation;
      const last = Array.isArray(r.lastLocations) ? r.lastLocations : [];
      return {ts, cl, last};
    })
    .filter(x =>
      Number.isFinite(x.ts) &&
      x.cl && Number.isFinite(x.cl.lat) && Number.isFinite(x.cl.lng)
    ) as Array<{ ts: number; cl: { lat: number; lng: number }; last: { lat: number; lng: number }[] }>;

  rows.sort((a, b) => a.ts - b.ts);

  const out: GpsPoint[] = [];
  let prevTs: number | null = null;
  let prevLL: { lat: number; lng: number } | null = null;

  for (const row of rows) {
    const seq = (row.last?.length ? row.last.slice() : []);
    const isLastCL = seq.length > 0 &&
      Math.abs(seq[seq.length - 1].lat - row.cl.lat) < 1e-8 &&
      Math.abs(seq[seq.length - 1].lng - row.cl.lng) < 1e-8;
    if (!isLastCL) seq.push({lat: row.cl.lat, lng: row.cl.lng});

    const coords: { lat: number; lng: number }[] = [];
    for (const p of seq) {
      if (!prevLL || p.lat !== prevLL.lat || p.lng !== prevLL.lng) coords.push(p);
      prevLL = p;
    }
    if (!coords.length) continue;

    if (prevTs == null) {
      const base = row.ts - coords.length;
      for (let i = 0; i < coords.length; i++) {
        out.push({ts: base + i + 1, lat: coords[i].lat, lng: coords[i].lng});
      }
    } else {
      const span = Math.max(1, row.ts - prevTs);
      const step = span / coords.length;
      for (let i = 0; i < coords.length; i++) {
        out.push({ts: Math.floor(prevTs + (i + 1) * step), lat: coords[i].lat, lng: coords[i].lng});
      }
    }
    prevTs = row.ts;
  }

  // De-dupe por (ts,lat,lng) y orden final
  const seen = new Set<string>();
  return out
    .sort((a, b) => a.ts - b.ts)
    .filter(p => {
      const k = `${ p.ts }|${ p.lat }|${ p.lng }`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

// -------- Pipeline principal --------
/**
 * Limpia y suaviza una ruta a partir de GenericGPS.
 * Orden: ordenar → gateOutliers → RDP con anclas → Kalman.
 */
export function buildCleanPathFromGeneric(
  readings: GenericGPS[],
  cfg?: {
    gate?: { vmax?: number; amax?: number; xtMax?: number };
    rdp?: { eps?: number; turnDeg?: number };
    kalman?: { q?: number; r?: number; maxDt?: number };
  }
): GpsPoint[] {
  const pts = genericToPoints(readings);
  if (pts.length <= 2) return pts;

  const ordered = pts.slice().sort((a, b) => a.ts - b.ts);
  const gated = gateOutliers(ordered, cfg?.gate);
  const simplified = rdpWithAnchors(gated, cfg?.rdp?.eps ?? 10, cfg?.rdp?.turnDeg ?? 22);
  const smoothed = kalmanSmooth(simplified, {
    q: cfg?.kalman?.q ?? 0.6,
    r: cfg?.kalman?.r ?? 25,
    maxDt: cfg?.kalman?.maxDt ?? 2
  });

  return smoothed;
}
