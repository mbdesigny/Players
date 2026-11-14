const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export function prayerTimeStr(v, off = 0) {
  let m = +v.slice(11, 13) * 60 + +v.slice(14, 16) + (off || 0);
  m = ((m % 1440) + 1440) % 1440;
  return `${String((m / 60) | 0).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
export function nextPrayerTime(timings, offsets, now) {
  const off = (k) => ((offsets && offsets[k]) || 0) * 60000;
  for (const k of PRAYERS) {
    const tt = new Date(timings[k]).getTime() + off(k);
    if (tt > now) return tt;
  }
  return new Date(timings.Fajr).getTime() + off('Fajr') + 86400000;
}
export function countdownStr(timings, offsets, now) {
  const s = Math.max(0, Math.floor((nextPrayerTime(timings, offsets, now) - now) / 1000));
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
