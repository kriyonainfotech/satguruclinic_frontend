export const formatDate = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date)) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

export const formatDisplayTime = (timeStr, dateInput = null) => {
  if (timeStr && typeof timeStr === 'string' && timeStr.trim()) {
    const trimmed = timeStr.trim();
    // 1) Matches "10:00 AM" or "03:00 PM" or "10:00am" or "10:00:00 AM"
    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])(?:.*)$/i);
    if (ampmMatch) {
      let hh = parseInt(ampmMatch[1], 10);
      hh = hh % 12 || 12;
      const mm = ampmMatch[2];
      const ampm = ampmMatch[3].toUpperCase();
      return `${String(hh).padStart(2, '0')}:${mm} ${ampm}`;
    }

    // 2) Matches plain "15:05" or "03:00" or "09:30"
    const plainMatch = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (plainMatch) {
      let hours = parseInt(plainMatch[1], 10);
      const minutes = plainMatch[2];
      let ampm = 'AM';
      if (hours >= 12) {
        ampm = 'PM';
      } else if (hours >= 1 && hours < 8) {
        // Clinic afternoon: 1:00 to 7:59 without AM/PM is PM
        ampm = 'PM';
      } else {
        ampm = 'AM';
      }
      hours = hours % 12 || 12;
      return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }
  }

  // 3) If no timeStr, check if dateInput has time info
  if (dateInput) {
    const d = new Date(dateInput);
    if (!isNaN(d) && (d.getHours() !== 0 || d.getMinutes() !== 0)) {
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }
  }

  return '10:00 AM';
};

