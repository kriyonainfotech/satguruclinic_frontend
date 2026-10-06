import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';
import './SidebarCalendar.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Helper to format Date -> 'YYYY-MM-DD'
const toIso = (year, month, day) => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

const SidebarCalendar = ({
  selectedDate,
  onSelectDate,
  tasks = []
}) => {
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Map tasks to dates for dot indicators
  // key: 'YYYY-MM-DD' -> { hasPending: bool, hasCompleted: bool }
  const dateTaskMap = {};
  const todayIsoForCheck = toIso(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  tasks.forEach((t) => {
    if (!t.dueDate) return;
    const d = new Date(t.dueDate);
    const key = toIso(d.getFullYear(), d.getMonth(), d.getDate());
    
    if (!dateTaskMap[key]) {
      dateTaskMap[key] = { hasPending: false, hasCompleted: false, hasOverdue: false };
    }
    
    const isCompleted = (t.status === 'Completed' || t.status === 'Approved' || t.status === 'Done');
    
    if (isCompleted) {
      dateTaskMap[key].hasCompleted = true;
    } else if (t.status === 'Overdue' || key < todayIsoForCheck) {
      dateTaskMap[key].hasOverdue = true;
    } else {
      dateTaskMap[key].hasPending = true;
    }
  });

  const handlePrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Days calculations
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Grid items: 42 cells (6 rows x 7 cols) or 35 cells
  const cells = [];

  // Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthIdx = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({
      day: dayNum,
      iso: toIso(prevYear, prevMonthIdx, dayNum),
      isOtherMonth: true
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    cells.push({
      day: d,
      iso: toIso(viewYear, viewMonth, d),
      isOtherMonth: false
    });
  }

  // Next month leading days to complete row/grid
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextMonthIdx = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({
      day: d,
      iso: toIso(nextYear, nextMonthIdx, d),
      isOtherMonth: true
    });
  }

  const todayIso = toIso(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const handleDayClick = (iso) => {
    onSelectDate(iso);
  };

  return (
    <div className="sidebar-calendar-card">
      <div className="sidebar-calendar-title">CALENDAR</div>

      <div className="sidebar-calendar-header">
        <button type="button" className="cal-arrow-btn" onClick={handlePrev} aria-label="Previous month">
          <ChevronLeftIcon size={14} />
        </button>
        <span className="cal-header-month">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button type="button" className="cal-arrow-btn" onClick={handleNext} aria-label="Next month">
          <ChevronRightIcon size={14} />
        </button>
      </div>

      <div className="sidebar-calendar-weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="sidebar-calendar-grid">
        {cells.map((cell, idx) => {
          const isSelected = selectedDate === cell.iso;
          const isToday = todayIso === cell.iso;
          const taskInfo = dateTaskMap[cell.iso];

          return (
            <button
              type="button"
              key={idx}
              className={`sidebar-cal-cell ${cell.isOtherMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isToday && !isSelected ? 'today' : ''}`}
              onClick={() => handleDayClick(cell.iso)}
            >
              <span className="cal-day-num">{cell.day}</span>

              {/* Task status dot indicator */}
              {taskInfo && (
                <span className="cal-dots-container">
                  {taskInfo.hasOverdue && <span className="cal-dot overdue" />}
                  {taskInfo.hasPending && <span className="cal-dot pending" />}
                  {taskInfo.hasCompleted && <span className="cal-dot completed" />}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SidebarCalendar;
