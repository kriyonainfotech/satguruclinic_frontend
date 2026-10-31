import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './CustomSelect.css';

// Type karke dhoondo; list me na mile to "+ Add" se naya bana lo (onCreate me naam aata hai)
const CreatableSelect = ({ options = [], onChange, onCreate, placeholder = 'Type to search...', createLabel = 'Add', disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target) && menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const openMenu = () => {
    if (disabled) return;
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
    }
    setOpen(true);
  };

  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter(o => (o.name || o.label || '').toLowerCase().includes(q)) : options;
  const exactMatch = q && options.some(o => (o.name || o.label || '').trim().toLowerCase() === q);

  const pick = (opt) => {
    setOpen(false);
    setQuery('');
    onChange(opt.value);
  };

  const create = async () => {
    const name = query.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await onCreate(name);
      setQuery('');
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (exactMatch) pick(options.find(o => (o.name || o.label || '').trim().toLowerCase() === q));
      else if (filtered.length === 1 && !onCreate) pick(filtered[0]);
      else if (q && onCreate) create();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const menu = open ? (
    <div
      ref={menuRef}
      className="custom-select-menu"
      style={{ position: 'absolute', top: menuPos.top, left: menuPos.left, width: menuPos.width }}
      role="listbox"
    >
      {filtered.map(opt => (
        <div
          key={opt.value}
          role="option"
          aria-selected={false}
          className="custom-select-option"
          onMouseDown={(e) => { e.preventDefault(); pick(opt); }}
        >
          <span className="custom-select-label">{opt.label}</span>
        </div>
      ))}
      {q && !exactMatch && onCreate && (
        <div
          role="option"
          aria-selected={false}
          className="custom-select-option custom-select-create"
          onMouseDown={(e) => { e.preventDefault(); create(); }}
        >
          <span className="custom-select-label">{busy ? 'Adding...' : `+ ${createLabel} "${query.trim()}"`}</span>
        </div>
      )}
      {filtered.length === 0 && !q && (
        <div className="custom-select-empty">No options available</div>
      )}
    </div>
  ) : null;

  return (
    <div className="custom-select-wrapper">
      <input
        ref={inputRef}
        type="text"
        className="modal-text-input"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={openMenu}
        onClick={openMenu}
        onChange={(e) => { setQuery(e.target.value); if (!open) openMenu(); }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {createPortal(menu, document.body)}
    </div>
  );
};

export default CreatableSelect;
