import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SearchIcon, XIcon } from './Icons';
import './CustomMultiSelect.css';

const CustomMultiSelect = ({
  options = [], // [{ value, label, price, category }]
  values = [], // array of selected values
  onChange, // (newValues) => void
  placeholder = 'Select items...',
  searchPlaceholder = 'Search...',
  disabled = false,
  className = '',
  style = {}
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0, openUp: false });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close when clicking outside
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

  // Close when scrolling outside menu
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && (menuRef.current === e.target || menuRef.current.contains(e.target))) {
        return; // Don't close if scrolling inside menu
      }
      setOpen(false);
    };
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [open]);

  // Focus search input on open
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [open]);

  const handleToggle = () => {
    if (disabled) return;
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupHeight = 280;
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldOpenUp = spaceBelow < popupHeight && rect.top > spaceBelow;

      setMenuPos({
        top: shouldOpenUp ? rect.top + window.scrollY - 6 : rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 280),
        openUp: shouldOpenUp
      });
    }
    setOpen(prev => !prev);
  };

  const handleItemToggle = (itemValue) => {
    const isSelected = values.includes(itemValue);
    const newValues = isSelected
      ? values.filter(v => v !== itemValue)
      : [...values, itemValue];
    onChange(newValues);
  };

  const handleSelectAll = (e) => {
    e.stopPropagation();
    const filteredValues = filteredOptions.map(o => o.value);
    const combined = Array.from(new Set([...values, ...filteredValues]));
    onChange(combined);
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    if (searchTerm) {
      const filteredValueMap = new Set(filteredOptions.map(o => o.value));
      onChange(values.filter(v => !filteredValueMap.has(v)));
    } else {
      onChange([]);
    }
  };

  const filteredOptions = options.filter(opt => {
    const matchLabel = opt.label?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = opt.category?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchLabel || matchCat;
  });

  const selectedCount = values.length;

  const menu = open ? (
    <div
      ref={menuRef}
      className={`custom-multi-select-menu ${menuPos.openUp ? 'open-up' : ''}`}
      style={{
        position: 'absolute',
        top: menuPos.openUp ? 'auto' : menuPos.top,
        bottom: menuPos.openUp ? window.innerHeight - menuPos.top : 'auto',
        left: menuPos.left,
        width: menuPos.width,
        zIndex: 10005
      }}
      role="listbox"
    >
      {/* Search Header */}
      <div className="multi-select-search-wrap">
        <SearchIcon size={14} className="multi-select-search-icon" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={searchPlaceholder}
          className="multi-select-search-input"
          onKeyDown={(e) => e.stopPropagation()}
        />
        {searchTerm && (
          <button
            type="button"
            className="multi-select-search-clear"
            onClick={() => setSearchTerm('')}
          >
            <XIcon size={12} />
          </button>
        )}
      </div>

      {/* Quick Action Bar */}
      <div className="multi-select-actions-bar">
        <span className="multi-select-count-text">
          {selectedCount} of {options.length} selected
        </span>
        <div className="multi-select-actions-btns">
          <button type="button" onClick={handleSelectAll} className="multi-select-action-btn">
            Select All
          </button>
          {selectedCount > 0 && (
            <button type="button" onClick={handleClearAll} className="multi-select-action-btn clear">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Options List */}
      <div className="multi-select-options-list">
        {filteredOptions.length === 0 ? (
          <div className="multi-select-empty">No matching items found</div>
        ) : (
          filteredOptions.map((opt) => {
            const isSelected = values.includes(opt.value);
            return (
              <div
                key={opt.value}
                className={`multi-select-option ${isSelected ? 'selected' : ''}`}
                onClick={() => handleItemToggle(opt.value)}
              >
                <div className={`multi-select-checkbox ${isSelected ? 'checked' : ''}`}>
                  {isSelected && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.8 7L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="multi-select-opt-content">
                  <div className="multi-select-opt-main">
                    <span className="multi-select-opt-label">{opt.label}</span>
                    {opt.category && (
                      <span className="multi-select-opt-category">{opt.category}</span>
                    )}
                  </div>
                  {opt.price !== undefined && opt.price !== null && (
                    <span className="multi-select-opt-price">₹{opt.price}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className={`custom-multi-select-wrapper ${className}`} style={style}>
      <button
        type="button"
        ref={triggerRef}
        className={`custom-multi-select-trigger ${open ? 'open' : ''} ${disabled ? 'disabled' : ''} ${selectedCount > 0 ? 'has-value' : ''}`}
        onClick={handleToggle}
        disabled={disabled}
      >
        <div className="multi-select-trigger-content">
          {selectedCount === 0 ? (
            <span className="multi-select-placeholder">{placeholder}</span>
          ) : (
            <div className="multi-select-selected-preview">
              <span className="multi-select-count-badge">{selectedCount}</span>
              <span className="multi-select-summary-text">
                {selectedCount === 1
                  ? options.find(o => o.value === values[0])?.label || '1 item'
                  : `${selectedCount} items selected`}
              </span>
            </div>
          )}
        </div>

        <div className="multi-select-trigger-icons">
          {selectedCount > 0 && (
            <span
              className="multi-select-clear-trigger"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              title="Clear selection"
            >
              <XIcon size={12} />
            </span>
          )}
          <svg
            className={`multi-select-chevron ${open ? 'up' : ''}`}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M2.5 4.5L6 8L9.5 4.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {createPortal(menu, document.body)}
    </div>
  );
};

export default CustomMultiSelect;
