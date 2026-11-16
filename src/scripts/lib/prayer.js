const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

/* Well-formed ISO timing strings only ("YYYY-MM-DDTHH:MM" prefix). Anything
   else — null, undefined, numbers, garbage from a failing API shape — must
   degrade to a safe placeholder instead of crashing or leaking "NaN" (F-12). */
const ISO_PREFIX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const epoch = v => {
  if (typeof v !== 'string' || !ISO_PREFIX.test(v)) return NaN;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : NaN;
};

export function prayerTimeStr(v, off = 0) {
  if (typeof v !== 'string' || !ISO_PREFIX.test(v)) return '--:--';
  const delta = +off;
  let m = +v.slice(11, 13) * 60 + +v.slice(14, 16) + (Number.isFinite(delta) ? delta : 0);
  m = ((m % 1440) + 1440) % 1440;
  return `${String((m / 60) | 0).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
export function nextPrayerTime(timings, offsets, now) {
  if (!timings || typeof timings !== 'object' || !Number.isFinite(now)) return null;
  const off = k => {
    const o = offsets && offsets[k];
    return Number.isFinite(+o) ? +o * 60000 : 0;
  };
  for (const k of PRAYERS) {
    const t = epoch(timings[k]);
    if (!Number.isFinite(t)) continue;
    const tt = t + off(k);
    if (tt > now) return tt;
  }
  const fajr = epoch(timings.Fajr);
  return Number.isFinite(fajr) ? fajr + off('Fajr') + 86400000 : null;
}
export function countdownStr(timings, offsets, now) {
  const target = nextPrayerTime(timings, offsets, now);
  if (target == null || !Number.isFinite(target) || !Number.isFinite(now)) return '--:--:--';
  const s = Math.max(0, Math.floor((target - now) / 1000));
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
