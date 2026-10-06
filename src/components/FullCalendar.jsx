import React, { useState, useEffect } from 'react';
import moment from 'moment';
import './FullCalendar.css';

const FullCalendar = ({ events = [], currentMonth, currentYear, onEventClick, onDateClick, selectedDate }) => {
  const [calendarGrid, setCalendarGrid] = useState([]);

  useEffect(() => {
    generateCalendar(currentMonth, currentYear);
  }, [currentMonth, currentYear, events]);

  const generateCalendar = (month, year) => {
    const firstDay = moment(`${year}-${month + 1}-01`, 'YYYY-MM-DD');
    const daysInMonth = firstDay.daysInMonth();
    const startingDayOfWeek = firstDay.day(); // 0 is Sunday, 1 is Monday...

    let grid = [];
    let currentDay = 1;

    // Create 6 rows (weeks)
    for (let i = 0; i < 6; i++) {
      let week = [];
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < startingDayOfWeek) {
          // Empty days before the 1st
          const prevMonthDays = firstDay.clone().subtract(1, 'month').daysInMonth();
          const dayNum = prevMonthDays - startingDayOfWeek + j + 1;
          week.push({ day: dayNum, isCurrentMonth: false, date: null, events: [] });
        } else if (currentDay > daysInMonth) {
          // Empty days after the end of the month
          const dayNum = currentDay - daysInMonth;
          week.push({ day: dayNum, isCurrentMonth: false, date: null, events: [] });
          currentDay++;
        } else {
          // Valid days of the current month
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
          
          // Find events for this day
          const dayEvents = events.filter(ev => {
             const evStart = ev.start?.dateTime || ev.start?.date;
             if (!evStart) return false;
             return evStart.startsWith(dateStr);
          });

          week.push({ 
             day: currentDay, 
             isCurrentMonth: true, 
             date: dateStr,
             events: dayEvents
          });
          currentDay++;
        }
      }
      grid.push(week);
      if (currentDay > daysInMonth && i >= 4) break; // Don't draw 6th row if unnecessary
    }
    setCalendarGrid(grid);
  };

  const getEventStyle = (event) => {
    if (event.summary?.includes('[Meeting]')) return { background: '#dbeafe', color: '#1e40af', borderLeft: '3px solid #3b82f6' };
    if (event.summary?.includes('[Task]')) return { background: '#fef3c7', color: '#92400e', borderLeft: '3px solid #f59e0b' };
    if (event.summary?.includes('[Event]')) return { background: '#f3e8ff', color: '#6b21a8', borderLeft: '3px solid #a855f7' };
    return { background: '#e0e7ff', color: '#3730a3', borderLeft: '3px solid #6366f1' };
  };

  const cleanSummary = (summary) => {
      if (!summary) return '(No Title)';
      return summary.replace(/\[(Meeting|Task|Event)\]\s*/, '');
  };

  return (
    <div className="full-calendar-container">
      <div className="fc-header">
        <div className="fc-day-name">SUN</div>
        <div className="fc-day-name">MON</div>
        <div className="fc-day-name">TUE</div>
        <div className="fc-day-name">WED</div>
        <div className="fc-day-name">THU</div>
        <div className="fc-day-name">FRI</div>
        <div className="fc-day-name">SAT</div>
      </div>
      <div className="fc-body">
        {calendarGrid.map((week, wIndex) => (
          <div className="fc-week" key={wIndex}>
            {week.map((dayData, dIndex) => {
              const isToday = dayData.isCurrentMonth && dayData.date === moment().format('YYYY-MM-DD');
              return (
                <div 
                  className={`fc-day ${!dayData.isCurrentMonth ? 'fc-day-disabled' : ''} ${isToday ? 'fc-day-today' : ''} ${dayData.date === selectedDate ? 'fc-day-selected' : ''}`} 
                  key={dIndex}
                  onClick={() => dayData.isCurrentMonth && onDateClick && onDateClick(dayData.date)}
                >
                  <div className="fc-day-num">{dayData.day}</div>
                  <div className="fc-day-events">
                    {dayData.events.map((ev, eIdx) => (
                      <div className="fc-event" key={eIdx} style={{...getEventStyle(ev), cursor: 'pointer'}} title={ev.summary} >
                         {moment(ev.start?.dateTime).isValid() ? moment(ev.start?.dateTime).format('HH:mm') + ' ' : ''}
                         {cleanSummary(ev.summary)}
                           {(!ev.summary?.includes('[Meeting]') && !ev.summary?.includes('[Task]') && !ev.summary?.includes('[Event]')) && <span style={{ marginLeft: '4px', background: '#4285f4', color: 'white', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 'bold' }}>G</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FullCalendar;
