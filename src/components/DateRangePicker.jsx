import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import './CalendarPicker.css';
import { formatDateToISO, formatDisplayDate } from './CalendarPicker';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const DateRangePicker = ({
  startDate = '',
  endDate = '',
  onChange, // ({ start, end }) => void
  placeholder = 'Select Date or Range',
  className = '',
  openUp = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, bottom: 'auto', isUp: false });

  // Range selection logic
  const [clickStep, setClickStep] = useState(0); // 0 = waiting for start, 1 = waiting for end
  const [hoverDate, setHoverDate] = useState(null);

  const todayIso = formatDateToISO(new Date());
  
  const currentStart = startDate || todayIso;
  const initialDate = new Date(currentStart);
  
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [startDate, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(e.target) &&
        !e.target.closest('.calendar-popover')
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      let shouldOpenUp = openUp;
      if (!openUp && spaceBelow < 350 && spaceAbove > spaceBelow) {
        shouldOpenUp = true;
      }
      setMenuPos({
        top: shouldOpenUp ? 'auto' : rect.bottom + 6,
        bottom: shouldOpenUp ? window.innerHeight - rect.top + 6 : 'auto',
        left: rect.left,
        isUp: shouldOpenUp
      });
      if (false) {
        setClickStep(1); // Assume they want to pick the end date for the current start date
      } else {
        setClickStep(0);
      }
    }
    setIsOpen(!isOpen);
  };

  const handlePrevMonth = (e) => {
    e.stopPropagation();
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

  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const handleSelectDay = (day) => {
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const iso = `${viewYear}-${monthStr}-${dayStr}`;

    if (clickStep === 0) {
      // First click sets start and end to the same date
      onChange({ start: iso, end: iso });
      setClickStep(1);
    } else {
      // Second click
      if (iso < startDate) {
        // If clicked date is before start, restart the range
        onChange({ start: iso, end: iso });
        setClickStep(1);
      } else {
        // Valid end date
        onChange({ start: startDate, end: iso });
        setIsOpen(false); // Close after selecting full range
        setClickStep(0);
      }
    }
  };

  const isInRange = (iso) => {
    if (clickStep === 1 && hoverDate) {
       const start = startDate;
       const end = hoverDate;
       if (iso >= start && iso <= end) return true;
       if (iso >= end && iso <= start) return true;
    }
    return startDate && endDate && iso >= startDate && iso <= endDate;
  };

  const popover = isOpen ? (
    <div
      className={`calendar-popover ${menuPos.isUp ? 'open-up' : ''}`}
      style={{
        position: 'fixed',
        top: menuPos.top,
        bottom: menuPos.bottom,
        left: menuPos.left,
        width: '280px',
        maxWidth: 'calc(100vw - 16px)',
        boxSizing: 'border-box',
        zIndex: 10000
      }}
      onMouseLeave={() => setHoverDate(null)}
    >
      <div style={{ padding: '8px 12px', fontSize: '12px', color: '#64748b', textAlign: 'center', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', borderRadius: '8px 8px 0 0' }}>
        {clickStep === 0 ? 'Click to select start date' : 'Click to select end date (or same date)'}
      </div>
      <div className="calendar-header" style={{ paddingTop: '10px' }}>
        <button type="button" className="calendar-nav-btn" onClick={handlePrevMonth}>
          <ChevronLeftIcon size={16} />
        </button>
        <div className="calendar-title">
          <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
        </div>
        <button type="button" className="calendar-nav-btn" onClick={handleNextMonth}>
          <ChevronRightIcon size={16} />
        </button>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="calendar-days-grid" onMouseLeave={() => setHoverDate(null)}>
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-day-cell empty" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const mStr = String(viewMonth + 1).padStart(2, '0');
          const dStr = String(dayNum).padStart(2, '0');
          const cellIso = `${viewYear}-${mStr}-${dStr}`;

          let isStart = startDate === cellIso;
          let isEnd = endDate === cellIso;
          let isRange = isInRange(cellIso);
          const isToday = todayIso === cellIso;
          
          if (clickStep === 1 && hoverDate) {
              isStart = startDate === cellIso;
              isEnd = hoverDate === cellIso;
              if (startDate > hoverDate) {
                 isStart = hoverDate === cellIso;
                 isEnd = startDate === cellIso;
              }
          }

          // Highlight logic
          let className = 'calendar-day-cell ';
          if (isStart || isEnd) {
             className += 'selected ';
             if (isStart && !isEnd) className += 'start-date ';
             if (isEnd && !isStart) className += 'end-date ';
          } else if (isRange) {
             className += 'in-range ';
          }
          if (isToday) className += 'today ';

          return (
            <button
              type="button"
              key={dayNum}
              onClick={() => handleSelectDay(dayNum)}
              onMouseEnter={() => {
                if (clickStep === 1) setHoverDate(cellIso);
              }}
              className={className}
            >
              {dayNum}
            </button>
          );
        })}
      </div>
      
      <div className="calendar-footer" style={{ padding: '8px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
         <button type="button" className="crm-btn crm-btn-primary" style={{ width: '100%', fontSize: '13px', padding: '6px' }} onClick={() => setIsOpen(false)}>Done</button>
      </div>
    </div>
  ) : null;

  let displayText = placeholder;
  if (startDate && endDate) {
    if (startDate === endDate) {
      displayText = formatDisplayDate(startDate);
    } else {
      displayText = `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
    }
  }

  return (
    <div className={`calendar-picker-wrapper ${className}`} ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`calendar-trigger-btn ${(startDate || endDate) ? 'active' : ''}`} 
        style={{ backgroundColor: "#ffffff", color: "#334155" }}
        onClick={handleToggle}
      >
        <CalendarIcon size={16} />
        <span>{displayText}</span>
      </button>

      {createPortal(popover, document.body)}
    </div>
  );
};

export default DateRangePicker;
