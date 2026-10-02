import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ClockIcon } from './Icons';
import './CustomTimePicker.css';

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const parseTime = (val) => {
  if (!val) {
    return { hour: '10', minute: '00', period: 'AM' };
  }
  const str = String(val).trim().toUpperCase();
  const isPM = str.includes('PM');
  const isAM = str.includes('AM');
  const clean = str.replace(/AM|PM/g, '').trim();
  const parts = clean.split(':');
  let h = parseInt(parts[0], 10);
  let m = parseInt(parts[1] || '0', 10);

  if (isNaN(h)) h = 10;
  if (isNaN(m)) m = 0;

  let period = 'AM';
  if (isPM) {
    period = 'PM';
  } else if (isAM) {
    period = 'AM';
  } else {
    // 24-hr format
    if (h >= 12) {
      period = 'PM';
      if (h > 12) h -= 12;
    } else {
      period = 'AM';
      if (h === 0) h = 12;
    }
  }

  // Format to 2-digit strings
  const hourStr = String(h > 12 ? h - 12 : (h === 0 ? 12 : h)).padStart(2, '0');
  // Round minute to nearest 5 for grid, or format
  const minuteStr = String(m).padStart(2, '0');

  return { hour: hourStr, minute: minuteStr, period };
};

const CustomTimePicker = ({ value, onChange, placeholder = "Select Time", disabled = false, style = {} }) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);

  const initial = parseTime(value);
  const [selectedHour, setSelectedHour] = useState(initial.hour);
  const [selectedMinute, setSelectedMinute] = useState(initial.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(initial.period);

  useEffect(() => {
    if (value) {
      const parsed = parseTime(value);
      setSelectedHour(parsed.hour);
      setSelectedMinute(parsed.minute);
      setSelectedPeriod(parsed.period);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        !e.target.closest('.custom-time-dropdown')
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = () => {
    if (disabled) return;
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupWidth = 240;
      let left = rect.left + window.scrollX;
      if (left + popupWidth > window.innerWidth - 10) {
        left = window.innerWidth - popupWidth - 10;
      }
      setMenuPos({
        top: rect.bottom + window.scrollY + 4,
        left: Math.max(10, left),
        width: rect.width,
      });
    }
    setOpen(v => !v);
  };

  const emitChange = (h, m, p) => {
    const formatted = `${h}:${m} ${p}`;
    if (onChange) onChange(formatted);
  };

  const handleHourSelect = (h) => {
    setSelectedHour(h);
    emitChange(h, selectedMinute, selectedPeriod);
  };

  const handleMinuteSelect = (m) => {
    setSelectedMinute(m);
    emitChange(selectedHour, m, selectedPeriod);
  };

  const handlePeriodToggle = (p) => {
    setSelectedPeriod(p);
    emitChange(selectedHour, selectedMinute, p);
  };

  const handleNow = () => {
    const now = new Date();
    let h = now.getHours();
    let m = Math.round(now.getMinutes() / 5) * 5;
    if (m === 60) {
      m = 0;
      h += 1;
    }
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    const hourStr = String(displayHour).padStart(2, '0');
    const minuteStr = String(m).padStart(2, '0');
    setSelectedHour(hourStr);
    setSelectedMinute(minuteStr);
    setSelectedPeriod(period);
    emitChange(hourStr, minuteStr, period);
  };

  const displayString = value ? `${selectedHour}:${selectedMinute} ${selectedPeriod}` : '';

  const dropdown = open ? (
    <div
      className="custom-time-dropdown"
      style={{
        position: 'absolute',
        top: menuPos.top,
        left: menuPos.left,
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="custom-time-header">
        <div className="custom-time-display">
          <span>{selectedHour}</span>
          <span>:</span>
          <span>{selectedMinute}</span>
          <span style={{ fontSize: '11px', marginLeft: '3px' }}>{selectedPeriod}</span>
        </div>
        <div className="custom-time-ampm-toggle">
          <button
            type="button"
            className={`custom-time-ampm-btn ${selectedPeriod === 'AM' ? 'active' : ''}`}
            onClick={() => handlePeriodToggle('AM')}
          >
            AM
          </button>
          <button
            type="button"
            className={`custom-time-ampm-btn ${selectedPeriod === 'PM' ? 'active' : ''}`}
            onClick={() => handlePeriodToggle('PM')}
          >
            PM
          </button>
        </div>
      </div>

      <div className="custom-time-columns">
        <div>
          <div className="custom-time-col-header">Hour</div>
          <div className="custom-time-col-scroll">
            {HOURS.map(h => (
              <div
                key={h}
                className={`custom-time-item ${selectedHour === h ? 'selected' : ''}`}
                onClick={() => handleHourSelect(h)}
              >
                {h}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="custom-time-col-header">Minute</div>
          <div className="custom-time-col-scroll">
            {MINUTES.map(m => (
              <div
                key={m}
                className={`custom-time-item ${selectedMinute === m ? 'selected' : ''}`}
                onClick={() => handleMinuteSelect(m)}
              >
                {m}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="custom-time-footer">
        <button type="button" className="custom-time-now-btn" onClick={handleNow}>
          Current Time
        </button>
        <button type="button" className="custom-time-done-btn" onClick={() => setOpen(false)}>
          Done
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="custom-time-picker-wrapper" style={style}>
      <button
        type="button"
        ref={triggerRef}
        className={`custom-time-trigger ${open ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={handleToggle}
        disabled={disabled}
      >
        <span className={`custom-time-value ${!value ? 'placeholder' : ''}`}>
          {displayString || placeholder}
        </span>
        <span className="custom-time-icon">
          <ClockIcon size={14} />
        </span>
      </button>

      {createPortal(dropdown, document.body)}
    </div>
  );
};

export default CustomTimePicker;
