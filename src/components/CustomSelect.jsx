import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './CustomSelect.css';

const CustomSelect = ({ value, onChange, options = [], placeholder = "Select...", disabled = false, style = {} }) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const current = options.find(o => o.value === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on scroll outside menu
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      // Don't close if scrolling inside the dropdown menu itself
      if (menuRef.current && (menuRef.current === e.target || menuRef.current.contains(e.target))) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [open]);

  const handleToggle = () => {
    if (disabled) return;
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
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
      ref={menuRef}
      className="custom-select-menu"
      style={{
        position: 'absolute',
        top: menuPos.top,
        left: menuPos.left,
        width: menuPos.width,
      }}
      role="listbox"
    >
      {options.map(opt => (
        <div
          key={opt.value}
          role="option"
          aria-selected={opt.value === value}
          className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
        >
          <span className="custom-select-label">{opt.label}</span>
          {opt.value === value && (
            <svg className="custom-select-check" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      ))}
      {options.length === 0 && (
        <div className="custom-select-empty">No options available</div>
      )}
    </div>
  ) : null;

  return (
    <div className="custom-select-wrapper" style={style}>
      <button
        type="button"
        ref={triggerRef}
        className={`custom-select-trigger ${open ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`custom-select-trigger-label ${!current ? 'placeholder' : ''}`}>
          {current ? current.label : placeholder}
        </span>
        <svg className={`custom-select-chevron ${open ? 'up' : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {createPortal(menu, document.body)}
    </div>
  );
};

export default CustomSelect;
