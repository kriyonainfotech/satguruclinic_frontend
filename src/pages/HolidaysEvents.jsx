import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CalendarPicker, { formatDateToISO } from '../components/CalendarPicker';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon
} from '../components/Icons';
import './HolidaysEvents.css';

const HolidaysEvents = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'superadmin' || user.role === 'admin';

  const todayIso = formatDateToISO(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateObj, setSelectedDateObj] = useState(todayIso);
  const [selectedDateDetails, setSelectedDateDetails] = useState([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customData, setCustomData] = useState({
    title: '',
    startDate: todayIso,
    endDate: todayIso,
    isPaid: false,
    isHalfDay: false
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/holidays`);
      const data = res.data || [];
      setHolidays(data);
      if (selectedDateObj) {
        setSelectedDateDetails(data.filter(h => h.dateStr === selectedDateObj));
      }
    } catch (err) {
      console.error('Error fetching holidays', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteCustomHoliday = async (id) => {
    if (!window.confirm('Are you sure you want to delete this custom holiday?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/holidays/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchHolidays();
      setSelectedDateDetails(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete holiday');
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!customData.title.trim()) {
      alert('Please enter a holiday title.');
      return;
    }
    if (!customData.startDate) {
      alert('Please select a start date.');
      return;
    }
    try {
      const submitData = { ...customData };
      if (submitData.isHalfDay || !submitData.endDate) {
        submitData.endDate = submitData.startDate;
      }
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/holidays/custom`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCustomModal(false);
      setCustomData({
        title: '',
        startDate: selectedDateObj || todayIso,
        endDate: selectedDateObj || todayIso,
        isPaid: false,
        isHalfDay: false
      });
      fetchHolidays();
    } catch (err) {
      console.error(err);
      alert('Failed to save custom holiday');
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateObj(todayIso);
    setSelectedDateDetails(holidays.filter(h => h.dateStr === todayIso));
  };

  const toggleHoliday = async (dateStr, title, isOfficial, isPaid) => {
    if (!isSuperAdmin) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/holidays/toggle`, {
        dateStr,
        title,
        isOfficial,
        isPaid
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updatedHolidays = holidays.map(h => {
        if (h.dateStr === dateStr && h.title === title) {
          return { ...h, isOfficial, isPaid };
        }
        return h;
      });
      setHolidays(updatedHolidays);

      if (selectedDateObj === dateStr) {
        setSelectedDateDetails(updatedHolidays.filter(h => h.dateStr === dateStr));
      }
    } catch (error) {
      console.error('Error toggling holiday', error);
      alert('Error saving holiday settings. Ensure you are logged in as superadmin.');
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
  const currentMonthStr = `${monthName} ${year}`;

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];

  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.unshift({ date: daysInPrevMonth - i, isPrevMonth: true, isNextMonth: false });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ date: i, isPrevMonth: false, isNextMonth: false });
  }

  const remainingCells = 35 - calendarDays.length;
  const totalCells = remainingCells < 0 ? 42 : 35;
  const cellsToAdd = totalCells - calendarDays.length;

  for (let i = 1; i <= cellsToAdd; i++) {
    calendarDays.push({ date: i, isPrevMonth: false, isNextMonth: true });
  }

  const currentMonthHolidays = holidays.filter(h => {
    const d = new Date(h.date);
    return d.getFullYear() === year && d.getMonth() === month && h.isOfficial;
  });

  const getHolidaysForDate = (dayNumber, isPrevMonth, isNextMonth) => {
    let checkYear = year;
    let checkMonth = month + 1;
    if (isPrevMonth) {
      if (month === 0) { checkYear--; checkMonth = 12; }
      else checkMonth--;
    } else if (isNextMonth) {
      if (month === 11) { checkYear++; checkMonth = 1; }
      else checkMonth++;
    }

    const checkDateStr = `${checkYear}-${checkMonth.toString().padStart(2, '0')}-${dayNumber.toString().padStart(2, '0')}`;
    return holidays.filter(h => h.dateStr === checkDateStr);
  };

  const handleCellClick = (dayNumber, isPrevMonth, isNextMonth) => {
    let checkYear = year;
    let checkMonth = month + 1;
    if (isPrevMonth) {
      if (month === 0) { checkYear--; checkMonth = 12; }
      else checkMonth--;
    } else if (isNextMonth) {
      if (month === 11) { checkYear++; checkMonth = 1; }
      else checkMonth++;
    }
    const checkDateStr = `${checkYear}-${checkMonth.toString().padStart(2, '0')}-${dayNumber.toString().padStart(2, '0')}`;
    setSelectedDateObj(checkDateStr);
    setSelectedDateDetails(holidays.filter(h => h.dateStr === checkDateStr));
  };

  const days = [
    { label: 'SUN', isSunday: true },
    { label: 'MON', isSunday: false },
    { label: 'TUE', isSunday: false },
    { label: 'WED', isSunday: false },
    { label: 'THU', isSunday: false },
    { label: 'FRI', isSunday: false },
    { label: 'SAT', isSunday: false }
  ];

  return (
    <div className="holidays-events-container">
      {/* Page Header */}
      <div className="holidays-header">
        <div className="header-left">
          <div className="header-icon-badge">
            <CalendarIcon size={22} />
          </div>
          <div>
            <h1 className="page-title">Holidays & Events</h1>
          </div>
        </div>

        {isSuperAdmin && (
          <button
            type="button"
            className="holiday-primary-btn"
            onClick={() => {
              setCustomData({
                title: '',
                startDate: selectedDateObj || todayIso,
                endDate: selectedDateObj || todayIso,
                isPaid: false,
                isHalfDay: false
              });
              setShowCustomModal(true);
            }}
          >
            <PlusIcon size={16} /> Add Custom Holiday
          </button>
        )}
      </div>

      {/* Main Two Column Layout */}
      <div className="holidays-content-layout">
        {/* Left Column: Calendar Section */}
        <div className="calendar-section">
          <div className="calendar-controls">
            <div className="calendar-title-wrap">
              <h2 className="month-title">{currentMonthStr}</h2>
              <div className="calendar-legend-chips">
                <span className="legend-chip">
                  <span className="legend-dot official"></span> Official Holiday
                </span>
                <span className="legend-chip">
                  <span className="legend-dot festival"></span> Festival / Event
                </span>
              </div>
            </div>

            <div className="month-nav-buttons">
              <button
                type="button"
                className="nav-today-btn"
                onClick={handleJumpToToday}
                title="Jump to current month"
              >
                Today
              </button>
              <button
                type="button"
                className="nav-btn"
                onClick={handlePrevMonth}
                title="Previous month"
              >
                <ChevronLeftIcon size={16} />
              </button>
              <button
                type="button"
                className="nav-btn"
                onClick={handleNextMonth}
                title="Next month"
              >
                <ChevronRightIcon size={16} />
              </button>
            </div>
          </div>

          <div className="calendar-grid">
            {days.map((d) => (
              <div
                key={d.label}
                className={`calendar-day-header ${d.isSunday ? 'sunday' : ''}`}
              >
                {d.label}
              </div>
            ))}

            {calendarDays.map((dayObj, index) => {
              const dayHolidays = getHolidaysForDate(dayObj.date, dayObj.isPrevMonth, dayObj.isNextMonth);
              const hasEvents = dayHolidays.length > 0;
              const hasOfficial = dayHolidays.some(h => h.isOfficial);

              let checkYear = year;
              let checkMonth = month + 1;
              if (dayObj.isPrevMonth) {
                if (month === 0) { checkYear--; checkMonth = 12; }
                else checkMonth--;
              } else if (dayObj.isNextMonth) {
                if (month === 11) { checkYear++; checkMonth = 1; }
                else checkMonth++;
              }
              const cellDateStr = `${checkYear}-${checkMonth.toString().padStart(2, '0')}-${dayObj.date.toString().padStart(2, '0')}`;

              const isSelected = cellDateStr === selectedDateObj;
              const isToday = cellDateStr === todayIso;
              const isSundayCol = index % 7 === 0;

              let cellClasses = 'calendar-cell';
              if (dayObj.isPrevMonth || dayObj.isNextMonth) cellClasses += ' out-of-month';
              if (isSelected) cellClasses += ' selected-date-cell';

              return (
                <div
                  key={index}
                  className={cellClasses}
                  onClick={() => handleCellClick(dayObj.date, dayObj.isPrevMonth, dayObj.isNextMonth)}
                >
                  <div className="cell-top-row">
                    <div
                      className={`date-number ${isToday ? 'today-badge' : (isSelected ? 'selected-num' : '')} ${!isToday && !isSelected && isSundayCol ? 'sunday-num' : ''}`}
                    >
                      {dayObj.date}
                    </div>
                    {hasOfficial && <div className="official-indicator-dot" title="Official Holiday"></div>}
                  </div>

                  {!loading && (
                    <div className="event-indicators">
                      {dayHolidays.slice(0, 2).map((h, i) => (
                        <div
                          key={i}
                          className={`event-pill ${h.isOfficial ? 'official' : 'festival'}`}
                          title={h.title}
                        >
                          <span>•</span>
                          <span style={{ textTransform: 'capitalize' }}>{h.title.toLowerCase()}</span>
                        </div>
                      ))}
                      {dayHolidays.length > 2 && (
                        <div className="event-more-count">
                          +{dayHolidays.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Events Details */}
        <div className="events-section">
          {selectedDateObj && (
            <div className="events-card daily-events-card">
              <div className="daily-card-header">
                <div className="daily-heading-row">
                  <h3 className="daily-date-heading">
                    <CalendarIcon size={18} color="#144b79" />
                    {new Date(selectedDateObj).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h3>
                  <span className="daily-count-chip">
                    {selectedDateDetails.length} {selectedDateDetails.length === 1 ? 'Event' : 'Events'}
                  </span>
                </div>
                <p className="daily-date-sub">
                  {selectedDateDetails.length > 0
                    ? 'Manage holiday declaration and staff compensation for this date.'
                    : 'Regular clinic working day.'}
                </p>
              </div>

              {selectedDateDetails.length === 0 ? (
                <div className="daily-empty-state">
                  <div className="empty-icon-wrap">
                    <CalendarIcon size={24} />
                  </div>
                  <p className="empty-state-title">No official holiday or event on this date.</p>
                  <span className="empty-state-pill">Normal Working Day</span>
                </div>
              ) : (
                <div className="daily-events-body">
                  {selectedDateDetails.map((h, i) => (
                    <div
                      key={i}
                      className={`holiday-item-card ${h.isOfficial ? 'is-official' : 'is-regular'}`}
                    >
                      <div className="holiday-card-top-header">
                        <div className="holiday-title-group">
                          <div className="holiday-title-row">
                            <h4 className="holiday-item-title">{h.title}</h4>
                            {h.isOfficial ? (
                              <span className="status-badge badge-official">Official Holiday</span>
                            ) : (
                              <span className="status-badge badge-regular">Working Day</span>
                            )}
                          </div>
                          <span className="holiday-type-sub">
                            {h.isCustom ? 'Custom Clinic Event' : 'Public Holiday / Festival'}
                          </span>
                        </div>

                        {h.isCustom && isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => deleteCustomHoliday(h.id)}
                            className="btn-delete-holiday"
                            title="Delete Custom Holiday"
                          >
                            <TrashIcon size={14} />
                          </button>
                        )}
                      </div>

                      {isSuperAdmin ? (
                        <div className="holiday-settings-box">
                          {/* Setting 1: Official Holiday Toggle */}
                          <div className="holiday-setting-row">
                            <div className="setting-text-col">
                              <span className="setting-label">Declare as Holiday</span>
                              <span className="setting-hint">
                                {h.isOfficial ? 'Clinic closed for this date' : 'Clinic open (regular operation)'}
                              </span>
                            </div>
                            <label className="modern-switch" title="Declare official holiday">
                              <input
                                type="checkbox"
                                checked={Boolean(h.isOfficial)}
                                onChange={() =>
                                  toggleHoliday(selectedDateObj, h.title, !h.isOfficial, h.isPaid)
                                }
                              />
                              <span className="modern-slider switch-red"></span>
                            </label>
                          </div>

                          {/* Setting 2: Compensation (Segmented: Unpaid / Paid) */}
                          {h.isOfficial && (
                            <div className="holiday-setting-row compensation-row">
                              <div className="setting-text-col">
                                <span className="setting-label">Staff Leave Pay</span>
                                <span className="setting-hint">
                                  {h.isPaid ? 'Paid leave for all team members' : 'Unpaid off day (no salary credit)'}
                                </span>
                              </div>
                              <div className="segmented-toggle">
                                <button
                                  type="button"
                                  className={`segment-btn ${!h.isPaid ? 'active-unpaid' : ''}`}
                                  onClick={() => toggleHoliday(selectedDateObj, h.title, h.isOfficial, false)}
                                >
                                  Unpaid
                                </button>
                                <button
                                  type="button"
                                  className={`segment-btn ${h.isPaid ? 'active-paid' : ''}`}
                                  onClick={() => toggleHoliday(selectedDateObj, h.title, h.isOfficial, true)}
                                >
                                  Paid
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="staff-status-footer">
                          {h.isOfficial ? (
                            <span className="staff-status-pill paid-pill">
                              <CheckCircleIcon size={13} strokeWidth={2.5} /> Official Off Day ({h.isPaid ? 'Paid' : 'Unpaid'})
                            </span>
                          ) : (
                            <span className="staff-status-pill regular-pill">
                              Regular Working Day
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {isSuperAdmin && (
                    <button
                      type="button"
                      className="add-another-holiday-btn"
                      onClick={() => {
                        setCustomData({
                          title: '',
                          startDate: selectedDateObj,
                          endDate: selectedDateObj,
                          isPaid: false,
                          isHalfDay: false
                        });
                        setShowCustomModal(true);
                      }}
                    >
                      <PlusIcon size={14} /> Add Another Event
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Official Holidays in Current Month Summary Card */}
          <div className="events-card upcoming-holidays-card">
            <div className="upcoming-card-header">
              <h3 className="upcoming-card-title">
                <ClockIcon size={16} color="#ef4444" /> Official Holidays in {currentMonthStr}
              </h3>
              <span className="upcoming-count-badge">
                {currentMonthHolidays.length} Days
              </span>
            </div>

            <div className="upcoming-holidays-list">
              {loading ? (
                <p style={{ fontSize: '13px', color: '#64748b', margin: '8px 0' }}>Loading holidays...</p>
              ) : currentMonthHolidays.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b', margin: '8px 0' }}>
                  No official holidays declared this month.
                </p>
              ) : (
                currentMonthHolidays.map((holiday, i) => {
                  const hDate = new Date(holiday.date);
                  const dateStr = hDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short'
                  });
                  return (
                    <div key={i} className="upcoming-holiday-row">
                      <div className="uh-left">
                        <span className="legend-dot official"></span>
                        <span className="uh-title">{holiday.title.toLowerCase()}</span>
                        {isSuperAdmin && (
                          <span className={`uh-paid-tag ${holiday.isPaid ? 'paid' : 'unpaid'}`}>
                            {holiday.isPaid ? 'Paid' : 'Unpaid'}
                          </span>
                        )}
                      </div>
                      <span className="uh-date-badge">{dateStr}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Add Custom Holiday Modal with Custom Calendar Picker */}
      {showCustomModal && (
        <div className="crm-modal-overlay">
          <div className="holiday-modal-card">
            <div className="crm-modal-header">
              <div className="modal-header-left">
                <div className="modal-icon-badge">
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h3 className="crm-modal-title">Add Custom Holiday</h3>
                  <p className="crm-modal-subtitle">Define clinic holidays, vacation leave, or event days</p>
                </div>
              </div>
              <button
                type="button"
                className="crm-modal-close-btn"
                onClick={() => setShowCustomModal(false)}
                title="Close modal"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleCustomSubmit} className="holiday-modal-form">
              <div className="holiday-form-group">
                <label className="holiday-form-label">
                  Holiday / Event Name <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customData.title}
                  onChange={(e) => setCustomData({ ...customData, title: e.target.value })}
                  className="holiday-input"
                  placeholder="e.g. Diwali Vacation, Annual Clinic Day"
                />
              </div>

              {/* Custom Date Pickers replacing native OS datepicker */}
              <div className="holiday-dates-row">
                <div className="holiday-form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="holiday-form-label">
                    Start Date <span className="required-star">*</span>
                  </label>
                  <CalendarPicker
                    className="holiday-cal-picker"
                    selectedDate={customData.startDate}
                    onChange={(val) => {
                      setCustomData(prev => ({
                        ...prev,
                        startDate: val,
                        endDate: prev.endDate && prev.endDate < val ? val : (prev.isHalfDay ? val : prev.endDate || val)
                      }));
                    }}
                    placeholder="Select Start Date"
                    showPresets={false}
                    allowClear={false}
                    enableYearMonthDropdown={true}
                  />
                </div>

                {!customData.isHalfDay && (
                  <div className="holiday-form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="holiday-form-label">
                      End Date <span className="required-star">*</span>
                    </label>
                    <CalendarPicker
                      className="holiday-cal-picker"
                      selectedDate={customData.endDate}
                      onChange={(val) => setCustomData(prev => ({ ...prev, endDate: val }))}
                      placeholder="Select End Date"
                      showPresets={false}
                      allowClear={false}
                      minDate={customData.startDate || undefined}
                      enableYearMonthDropdown={true}
                    />
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="holiday-toggles-card">
                <div className="holiday-toggle-item">
                  <div className="holiday-toggle-info">
                    <span className="holiday-toggle-title">Paid Leave</span>
                    <span className="holiday-toggle-desc">Staff receives regular daily compensation</span>
                  </div>
                  <label className="modern-switch">
                    <input
                      type="checkbox"
                      checked={customData.isPaid}
                      onChange={(e) => setCustomData({ ...customData, isPaid: e.target.checked })}
                    />
                    <span className="modern-slider switch-emerald"></span>
                  </label>
                </div>

                <div className="holiday-toggle-divider"></div>

                <div className="holiday-toggle-item">
                  <div className="holiday-toggle-info">
                    <span className="holiday-toggle-title">Half Day</span>
                    <span className="holiday-toggle-desc">Single-day half-shift clinic operation</span>
                  </div>
                  <label className="modern-switch">
                    <input
                      type="checkbox"
                      checked={customData.isHalfDay}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setCustomData({
                          ...customData,
                          isHalfDay: checked,
                          endDate: checked ? customData.startDate : customData.endDate
                        });
                      }}
                    />
                    <span className="modern-slider switch-blue"></span>
                  </label>
                </div>
              </div>

              <div className="holiday-modal-footer">
                <button
                  type="button"
                  className="holiday-btn-cancel"
                  onClick={() => setShowCustomModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="holiday-btn-submit"
                  disabled={!customData.title.trim() || !customData.startDate}
                >
                  <PlusIcon size={16} /> Save Custom Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidaysEvents;
