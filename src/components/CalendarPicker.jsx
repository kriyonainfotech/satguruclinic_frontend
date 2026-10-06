import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import './CalendarPicker.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Format helper: Date -> 'YYYY-MM-DD'
export const formatDateToISO = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format helper for display: 'YYYY-MM-DD' -> '22 Sep 2026'
export const formatDisplayDate = (isoString) => {
  if (!isoString) return '';
  const [year, month, day] = isoString.split('-');
  if (!year || !month || !day) return isoString;
  const shortYear = year.slice(-2);
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${shortYear}`;
};

const CalendarPicker = ({
  selectedDate = '', // 'YYYY-MM-DD'
  onChange,
  placeholder = 'Filter by Date',
  showPresets = true,
  allowClear = true,
  openUp = false,
  disablePastDates = false,
  minDate = null,
  maxDate = null,
  enableYearMonthDropdown = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  const todayIso = formatDateToISO(new Date());
  const effectiveMinDate = minDate || (disablePastDates ? todayIso : null);

  const minYear = effectiveMinDate ? parseInt(effectiveMinDate.substring(0, 4), 10) : null;
  const minMonth = effectiveMinDate ? parseInt(effectiveMinDate.substring(5, 7), 10) - 1 : null;

  // Parse active viewing month/year
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Sync viewing month when selectedDate changes or picker opens
  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [selectedDate, isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        !e.target.closest('.calendar-popover')
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on scroll or window resize
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => setIsOpen(false);
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupHeight = 320; // Approx height of calendar
      const popupWidth = 260; // Popover width
      const spaceBelow = window.innerHeight - rect.bottom;
      
      const shouldOpenUp = openUp || (spaceBelow < popupHeight && rect.top > spaceBelow);

      // Smart horizontal positioning to prevent cutting off at screen edges
      let calcLeft = rect.left;
      // If expanding to the right goes off-screen, align to the trigger button's right edge
      if (calcLeft + popupWidth > window.innerWidth - 12) {
        calcLeft = rect.right - popupWidth;
      }
      // Ensure it stays cleanly within the viewport
      if (calcLeft + popupWidth > window.innerWidth - 8) {
        calcLeft = window.innerWidth - popupWidth - 8;
      }
      if (calcLeft < 8) {
        calcLeft = 8;
      }

      setMenuPos({
        top: shouldOpenUp ? 'auto' : rect.bottom + 6,
        bottom: shouldOpenUp ? window.innerHeight - rect.top + 6 : 'auto',
        left: calcLeft,
        isUp: shouldOpenUp
      });
    }
    setIsOpen(!isOpen);
  };

  const isPrevDisabled = Boolean(
    effectiveMinDate &&
    (viewYear < minYear || (viewYear === minYear && viewMonth <= minMonth))
  );

  // Navigate months
  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (isPrevDisabled) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Calendar cells generation
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const handleSelectDay = (day) => {
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const iso = `${viewYear}-${monthStr}-${dayStr}`;

    if (effectiveMinDate && iso < effectiveMinDate) {
      return; // Cannot select past date
    }
    if (maxDate && iso > maxDate) {
      return; // Cannot select future date
    }

    onChange(iso);
    setIsOpen(false);
  };

  const handlePreset = (type) => {
    const today = new Date();
    if (type === 'today') {
      const iso = formatDateToISO(today);
      onChange(iso);
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    } else if (type === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const iso = formatDateToISO(tomorrow);
      onChange(iso);
      setViewYear(tomorrow.getFullYear());
      setViewMonth(tomorrow.getMonth());
    } else if (type === 'all') {
      onChange('');
    }
    setIsOpen(false);
  };

  const popover = isOpen ? (
    <div
      className={`calendar-popover ${menuPos.isUp ? 'open-up' : ''}`}
      style={{
        position: 'fixed',
        top: menuPos.top,
        bottom: menuPos.bottom,
        left: menuPos.left,
        width: '260px',
        maxWidth: 'calc(100vw - 16px)',
        boxSizing: 'border-box',
        zIndex: 10000 // High z-index to stay above modals
      }}
    >
      {showPresets && (
        <div className="calendar-quick-presets">
          {!disablePastDates && allowClear && (
            <button
              type="button"
              className={`calendar-preset-btn ${!selectedDate ? 'active' : ''}`}
              onClick={() => handlePreset('all')}
            >
              All Dates
            </button>
          )}
          <button
            type="button"
            className={`calendar-preset-btn ${selectedDate === todayIso ? 'active' : ''}`}
            onClick={() => handlePreset('today')}
          >
            Today
          </button>
          <button
            type="button"
            className="calendar-preset-btn"
            onClick={() => handlePreset('tomorrow')}
          >
            Tomorrow
          </button>
        </div>
      )}

      <div className="calendar-header">
        <button
          type="button"
          className="calendar-nav-btn"
          onClick={handlePrevMonth}
          disabled={isPrevDisabled}
          title={isPrevDisabled ? 'Past months cannot be selected' : 'Previous month'}
        >
          <ChevronLeftIcon size={16} />
        </button>
        <div className="calendar-title" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {enableYearMonthDropdown ? (
            <>
              <select 
                value={viewMonth} 
                onChange={(e) => setViewMonth(parseInt(e.target.value))}
                style={{ border: 'none', background: 'transparent', fontWeight: 700, color: '#0369a1', cursor: 'pointer', padding: '0 4px', outline: 'none' }}
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i}>{m.substring(0,3)}</option>
                ))}
              </select>
              
              <div 
                style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#f0fdfa', borderRadius: '4px', padding: '2px 6px', border: '1px solid #bae6fd' }}
                title="Click to type year"
              >
                <input 
                  type="number"
                  value={viewYear}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length <= 4) setViewYear(val);
                  }}
                  onBlur={() => {
                    if (!viewYear || viewYear < 1900 || viewYear > 2100) {
                      setViewYear(new Date().getFullYear());
                    } else {
                      setViewYear(parseInt(viewYear));
                    }
                  }}
                  style={{ width: '40px', border: 'none', background: 'transparent', outline: 'none', color: '#0369a1', fontWeight: 700, fontSize: '14px', textAlign: 'center', padding: 0 }}
                />
              </div>
            </>
          ) : (
            <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
          )}
        </div>
        <button type="button" className="calendar-nav-btn" onClick={handleNextMonth} title="Next month">
          <ChevronRightIcon size={16} />
        </button>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="calendar-days-grid">
        {/* Empty slots before day 1 */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-day-cell empty" />
        ))}

        {/* Days of current month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const mStr = String(viewMonth + 1).padStart(2, '0');
          const dStr = String(dayNum).padStart(2, '0');
          const cellIso = `${viewYear}-${mStr}-${dStr}`;

          const isSelected = selectedDate === cellIso;
          const isToday = todayIso === cellIso;
          const isPast = Boolean(effectiveMinDate && cellIso < effectiveMinDate);

          return (
            <button
              type="button"
              key={dayNum}
              disabled={isPast}
              onClick={() => !isPast && handleSelectDay(dayNum)}
              className={`calendar-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isPast ? 'disabled' : ''}`}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {allowClear && selectedDate && (
        <div className="calendar-footer">
          <button
            type="button"
            className="calendar-clear-btn"
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
          >
            Clear Date
          </button>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className={`calendar-picker-wrapper ${className}`} ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`calendar-trigger-btn ${selectedDate ? 'active' : ''}`} style={{ backgroundColor: "#ffffff", color: "#334155" }}
        onClick={handleToggle}
      >
        <CalendarIcon size={16} />
        <span>{selectedDate ? formatDisplayDate(selectedDate) : placeholder}</span>
      </button>

      {createPortal(popover, document.body)}
    </div>
  );
};

export default CalendarPicker;
