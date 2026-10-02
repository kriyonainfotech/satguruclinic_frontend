import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './StatusDropdown.css';

const DEFAULT_OPTIONS = [
  { value: 'Pending',     label: 'Pending',     color: '#f59e0b' },
  { value: 'Overdue',     label: 'Overdue',     color: '#ef4444' },
  { value: 'Done',        label: 'Done',        color: '#10b981' },
];

const StatusDropdown = ({ value, onChange, disabled = false, options = DEFAULT_OPTIONS }) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);

  const current = options.find(o => o.value === value) || options[0];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        !e.target.closest('.sdd-menu')
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on scroll
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [open]);

  const handleToggle = () => {
    if (disabled) return;
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 148),
      });
    }
    setOpen(v => !v);
  };

  const handleSelect = (opt) => {
    setOpen(false);
    if (opt.value !== value) onChange(opt.value);
  };

  const menu = open ? (
    <div
      className="sdd-menu"
      style={{
        position: 'absolute',
        top: menuPos.top,
        left: menuPos.left,
        minWidth: menuPos.width,
      }}
      role="listbox"
    >
      {options.map(opt => (
        <div
          key={opt.value}
          role="option"
          aria-selected={opt.value === value}
          className={`sdd-option ${opt.value === value ? 'sdd-selected' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
        >
          {opt.color && <span className="sdd-opt-dot" style={{ background: opt.color }} />}
          <span className="sdd-opt-label">{opt.label}</span>
          {opt.value === value && (
            <svg className="sdd-check" width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7L5.5 10L11.5 4" stroke={opt.color || 'var(--primary-color)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div className="sdd-wrapper">
      {/* Trigger */}
      <button
        type="button"
        ref={triggerRef}
        className={`sdd-trigger ${open ? 'sdd-open' : ''}`}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current?.color && <span className="sdd-dot" style={{ background: current.color }} />}
        <span className="sdd-label">{current?.label || value}</span>
        <svg className={`sdd-chevron ${open ? 'sdd-chevron-up' : ''}`} width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Menu rendered in body via portal - avoids overflow:hidden clipping */}
      {createPortal(menu, document.body)}
    </div>
  );
};

export default StatusDropdown;


