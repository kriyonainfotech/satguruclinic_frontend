// Leave ki date/time ka text (Leave Management page aur Holidays calendar dono yahi use karte hain)

// "02:30 PM" -> minutes (galat ho to null)
export const timeToMinutes = (val) => {
  const m = String(val || '').trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  if (m[3] === 'PM') h += 12;
  return h * 60 + parseInt(m[2], 10);
};

const toDate = (iso) => new Date(iso + 'T00:00:00');
const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const fmtDate = (iso, opts = {}) => toDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...opts });

// startDate se endDate tak saari dates (YYYY-MM-DD)
export const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  if (!startDate) return dates;
  const end = endDate && endDate >= startDate ? endDate : startDate;
  for (let d = toDate(startDate); toIso(d) <= end; d.setDate(d.getDate() + 1)) dates.push(toIso(d));
  return dates;
};

// Kisi date pe leave ka time (null = pura din). Purane records me ek hi fromTime/toTime saare dino pe tha.
export const getTimeForDate = (l, date) => {
  const t = (l.dayTimes || []).find(d => d.date === date);
  if (t) return t;
  if (l.fromTime && l.toTime) return { fromTime: l.fromTime, toTime: l.toTime };
  return null;
};

const timeLabel = (t) => (t ? `${t.fromTime} - ${t.toTime}` : 'Full day');

const minutesText = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ') || '0m';
};

const hasAnyTime = (l) => (l.dayTimes && l.dayTimes.length > 0) || !!(l.fromTime && l.toTime);

// Har din ka label, jaise [{ date, label: 'Full day' }, { date, label: '02:00 PM - 04:00 PM' }]
export const leaveDayBreakdown = (l) => getDatesInRange(l.startDate, l.endDate)
  .map(date => ({ date, label: timeLabel(getTimeForDate(l, date)) }));

// "Oct 29 - Oct 31" / "Oct 29 (02:00 PM - 04:00 PM)" / sab din same time ho to range ke saath time
export const formatLeaveRange = (l, withYear = false) => {
  const opts = withYear ? { year: 'numeric' } : {};
  const start = fmtDate(l.startDate, opts);
  const dates = !l.endDate || l.startDate === l.endDate ? start : `${start} - ${fmtDate(l.endDate, opts)}`;
  if (!hasAnyTime(l)) return dates;
  const labels = new Set(leaveDayBreakdown(l).map(d => d.label));
  return labels.size === 1 ? `${dates} (${[...labels][0]})` : dates;
};

// "3 days" / "1h 30m" / "3 days · 1 full, 2 with specific time"
export const formatLeaveDuration = (l) => {
  const days = getDatesInRange(l.startDate, l.endDate);
  const timed = days.map(d => getTimeForDate(l, d)).filter(Boolean);
  if (days.length === 1 && timed.length === 1) {
    return minutesText(timeToMinutes(timed[0].toTime) - timeToMinutes(timed[0].fromTime));
  }
  const dayText = `${days.length} ${days.length === 1 ? 'day' : 'days'}`;
  if (timed.length === 0) return dayText;
  const full = days.length - timed.length;
  return `${dayText} · ${full ? `${full} full, ` : ''}${timed.length} with specific time`;
};

// Calendar pill ke liye us date ka chhota label
export const leavePillLabel = (l, date) => {
  const t = getTimeForDate(l, date);
  return t ? `${t.fromTime} - ${t.toTime}` : 'Leave';
};
