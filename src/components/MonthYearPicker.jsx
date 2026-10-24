import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, CalendarIcon } from './Icons';
import './MonthYearPicker.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// mode="month": value 'YYYY-MM' (upar ‹ saal ›, niche 12 mahine)
// mode="year":  value 'YYYY'    (‹ › se 12 saal ka page)
const MonthYearPicker = ({ mode = 'month', value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const year = Number((value || '').slice(0, 4)) || new Date().getFullYear();
  const month = mode === 'month' ? Number((value || '').slice(5, 7)) || 1 : null;
  const [viewYear, setViewYear] = useState(year);

  // Bahar click ya page scroll par band
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!triggerRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) setOpen(false);
    };
    const onScroll = (e) => { if (!menuRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const toggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 248) });
      setViewYear(year);
    }
    setOpen(o => !o);
  };

  const pageStart = viewYear - (((viewYear % 12) + 12) % 12); // year mode me 12 saal ka block
  const label = mode === 'month' ? `${MONTHS_FULL[month - 1]} ${year}` : String(year);

  return (
    <>
      <button type="button" ref={triggerRef} className="myp-trigger" onClick={toggle}>
        <CalendarIcon size={14} />
        <span className="myp-label">{label}</span>
        <ChevronDownIcon size={14} />
      </button>

      {open && createPortal(
        <div ref={menuRef} className="myp-menu" style={{ top: pos.top, left: pos.left }}>
          <div className="myp-head">
            <button type="button" className="myp-nav" onClick={() => setViewYear(v => v - (mode === 'month' ? 1 : 12))} aria-label="Previous">
              <ChevronLeftIcon size={16} />
            </button>
            <strong>{mode === 'month' ? viewYear : `${pageStart} – ${pageStart + 11}`}</strong>
            <button type="button" className="myp-nav" onClick={() => setViewYear(v => v + (mode === 'month' ? 1 : 12))} aria-label="Next">
              <ChevronRightIcon size={16} />
            </button>
          </div>

          <div className="myp-grid">
            {mode === 'month'
              ? MONTHS.map((m, i) => {
                  const active = viewYear === year && i + 1 === month;
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`myp-cell${active ? ' active' : ''}`}
                      onClick={() => { onChange(`${viewYear}-${String(i + 1).padStart(2, '0')}`); setOpen(false); }}
                    >{m}</button>
                  );
                })
              : Array.from({ length: 12 }, (_, i) => pageStart + i).map(y => (
                  <button
                    key={y}
                    type="button"
                    className={`myp-cell${y === year ? ' active' : ''}`}
                    onClick={() => { onChange(String(y)); setOpen(false); }}
                  >{y}</button>
                ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default MonthYearPicker;
