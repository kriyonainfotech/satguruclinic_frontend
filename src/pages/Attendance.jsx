import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import CalendarPicker from '../components/CalendarPicker';
import CustomSelect from '../components/CustomSelect';
import {
  EditIcon,
  CheckCircleIcon,
  XIcon,
  CalendarIcon,
  ClockIcon,
  CalendarCheckIcon,
  InfoIcon
} from '../components/Icons';
import './Attendance.css';

const formatTime12HourStr = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

const formatScheduleText = (timings) => {
  if (!timings || timings.length === 0) return '';
  const valid = timings.filter(t => t.startTime && t.endTime);
  if (valid.length === 0) return '';
  return valid.map(t => `${formatTime12HourStr(t.startTime)} - ${formatTime12HourStr(t.endTime)}`).join(', ');
};

const STATUS_SELECT_OPTIONS = [
  { value: 'present', label: 'Full Day (Present)' },
  { value: 'half-day', label: 'Half Day' },
  { value: 'leave', label: 'Leave' },
  { value: 'holiday', label: 'Paid Holiday' },
  { value: 'unpaid-holiday', label: 'Unpaid Holiday' }
];

const Attendance = () => {
  const [activeTab, setActiveTab] = useState('team');
  const [selectMode, setSelectMode] = useState('single'); // 'single' or 'range'
  const [currentDate, setCurrentDate] = useState(moment().format('YYYY-MM-DD'));
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Dashboard states
  const [stats, setStats] = useState({ present: 0, full: 0, half: 0, leaves: 0 });

  const [currentMonth, setCurrentMonth] = useState(moment().startOf('month'));
  const [monthlyData, setMonthlyData] = useState([]);

  const handleDateClick = (dateStr) => {
    if (selectMode === 'single') {
      setCurrentDate(dateStr);
    } else {
      // Range mode
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(dateStr);
        setRangeEnd(null);
      } else if (rangeStart && !rangeEnd) {
        if (moment(dateStr).isBefore(moment(rangeStart))) {
          setRangeEnd(rangeStart);
          setRangeStart(dateStr);
        } else {
          setRangeEnd(dateStr);
        }
      }
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      let url = '';
      if (selectMode === 'single') {
        url = `${import.meta.env.VITE_API_BASE_URL}/attendance?date=${currentDate}`;
      } else {
        const sDate = rangeStart || currentDate;
        const eDate = rangeEnd || sDate;
        url = `${import.meta.env.VITE_API_BASE_URL}/attendance?startDate=${sDate}&endDate=${eDate}`;
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let filtered = res.data;
      if (activeTab === 'superadmins') filtered = filtered.filter(d => d.user.role === 'superadmin');
      if (activeTab === 'admins') filtered = filtered.filter(d => d.user.role === 'admin');
      if (activeTab === 'team') filtered = filtered.filter(d => d.user.role === 'team');
      if (activeTab === 'leaves') filtered = filtered.filter(d => d.status === 'leave');
      setAttendanceData(filtered);
      
      // Calculate stats
      let full = 0, half = 0, leaves = 0, present = 0;
      filtered.forEach(d => {
        if (d.status === 'present') { full++; present++; }
        else if (d.status === 'half-day') { half++; present++; }
        else if (d.status === 'leave') leaves++;
      });
      setStats({ present, full, half, leaves });

      // Fetch Monthly Data for calendar view badges
      const start = currentMonth.clone().startOf('month').format('YYYY-MM-DD');
      const end = currentMonth.clone().endOf('month').format('YYYY-MM-DD');
      const monthRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/attendance?startDate=${start}&endDate=${end}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let monthlyFiltered = monthRes.data;
      if (activeTab === 'superadmins') monthlyFiltered = monthlyFiltered.filter(d => d.user.role === 'superadmin');
      if (activeTab === 'admins') monthlyFiltered = monthlyFiltered.filter(d => d.user.role === 'admin');
      if (activeTab === 'team') monthlyFiltered = monthlyFiltered.filter(d => d.user.role === 'team');
      if (activeTab === 'leaves') monthlyFiltered = monthlyFiltered.filter(d => d.status === 'leave');
      setMonthlyData(monthlyFiltered);
    } catch (error) {
      console.error('Error fetching attendance', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAttendance();
  }, [currentDate, activeTab, selectMode, rangeStart, rangeEnd, currentMonth.format('YYYY-MM')]);

  // Edit modal states
  const [editingRecord, setEditingRecord] = useState(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editStatus, setEditStatus] = useState('present');
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditModal = (record) => {
    setEditingRecord(record);
    setEditClockIn(record.clockIn ? moment(record.clockIn).format('HH:mm') : '');
    setEditClockOut(record.clockOut ? moment(record.clockOut).format('HH:mm') : '');
    setEditStatus(record.status === 'none' ? 'present' : record.status);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setSavingEdit(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/attendance/status`, {
        userId: editingRecord.userId,
        date: editingRecord.date || currentDate,
        clockIn: editClockIn || null,
        clockOut: editClockOut || null,
        status: editStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingRecord(null);
      fetchAttendance();
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating attendance');
    }
    setSavingEdit(false);
  };

  const updateStatus = async (userId, newStatus, recordDate) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/attendance/status`, {
        userId, date: recordDate || currentDate, status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAttendance();
    } catch (error) {
      alert('Error updating status');
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'present') return <span className="att-status-badge present">FULL DAY</span>;
    if (status === 'half-day') return <span className="att-status-badge half">HALF DAY</span>;
    if (status === 'leave') return <span className="att-status-badge leave">LEAVE</span>;
    if (status === 'holiday') return <span className="att-status-badge" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #4ade80' }}>PAID HOLIDAY</span>;
    if (status === 'unpaid-holiday') return <span className="att-status-badge" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' }}>UNPAID HOLIDAY</span>;
    return <span className="att-status-badge none">NONE</span>;
  };

  return (
    <div className="attendance-page-container">
      {/* Top Page Header */}
      <div className="attendance-page-header">
        <div className="attendance-header-left">
          <div className="attendance-header-icon-badge">
            <ClockIcon size={24} />
          </div>
          <div>
            <h1 className="attendance-page-title">Attendance Management</h1>
          </div>
        </div>

        <button 
          type="button"
          onClick={fetchAttendance}
          disabled={loading}
          className="attendance-sync-btn"
          title="Sync latest attendance data from database"
        >
          <svg 
            width="15" 
            height="15" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          <span>{loading ? 'Syncing...' : 'Sync'}</span>
        </button>
      </div>

      {/* Role Tabs */}
      <div className="attendance-tabs-wrap">
        {['superadmins', 'admins', 'team', 'leaves'].map(tab => (
          <button 
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`attendance-tab-btn ${activeTab === tab ? 'active' : ''}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Month Calendar Card */}
      <div className="attendance-calendar-card">
        <div className="calendar-top-bar">
          <div className="calendar-month-controls">
            <h2 className="calendar-month-heading">{currentMonth.format('MMMM YYYY')}</h2>
            
            <div className="calendar-mode-toggle">
              <button 
                type="button"
                onClick={() => {
                  setSelectMode('single');
                  setRangeStart(null);
                  setRangeEnd(null);
                }}
                className={`calendar-mode-btn ${selectMode === 'single' ? 'active' : ''}`}
              >
                SINGLE
              </button>
              <button 
                type="button"
                onClick={() => {
                  setSelectMode('range');
                  if (!rangeStart) {
                    setRangeStart(currentDate);
                    setRangeEnd(currentDate);
                  }
                }}
                className={`calendar-mode-btn ${selectMode === 'range' ? 'active' : ''}`}
              >
                RANGE
              </button>
            </div>
          </div>

          <div className="calendar-nav-arrows">
            <button 
              type="button"
              onClick={() => setCurrentMonth(currentMonth.clone().subtract(1, 'month'))} 
              className="cal-nav-arrow-btn"
              title="Previous Month"
              aria-label="Previous Month"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button 
              type="button"
              onClick={() => setCurrentMonth(currentMonth.clone().add(1, 'month'))} 
              className="cal-nav-arrow-btn"
              title="Next Month"
              aria-label="Next Month"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
        
        <div className="attendance-grid-scroll">
          <div className="attendance-grid-wrap">
            <div className="attendance-weekdays-row">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                <div key={d}>{d}</div>
              ))}
            </div>
            
            <div className="attendance-days-grid">
              {Array.from({ length: currentMonth.startOf('month').day() }).map((_, i) => (
                <div key={`empty-${i}`} className="cal-empty-slot" />
              ))}
          
              {Array.from({ length: currentMonth.daysInMonth() }).map((_, i) => {
                const dateStr = currentMonth.clone().date(i + 1).format('YYYY-MM-DD');
                let isSelected = false;
                let isKeyDay = false;
                if (selectMode === 'single') {
                  isSelected = dateStr === currentDate;
                  isKeyDay = isSelected;
                } else {
                  const start = rangeStart || currentDate;
                  const end = rangeEnd || start;
                  isSelected = moment(dateStr).isBetween(moment(start), moment(end), null, '[]');
                  isKeyDay = dateStr === start || dateStr === end;
                }

                const dayData = monthlyData.filter(d => d.date === dateStr);
                let present = 0, half = 0, leave = 0;
                dayData.forEach(d => {
                  if (d.status === 'present') present++;
                  else if (d.status === 'half-day') half++;
                  else if (d.status === 'leave') leave++;
                });

                return (
                  <div 
                    key={i} 
                    onClick={() => handleDateClick(dateStr)}
                    className={`cal-day-cell ${isSelected ? 'selected' : ''}`}
                  >
                    <div className={`day-num-badge ${isKeyDay ? 'key-day' : 'normal'}`}>
                      {i + 1}
                    </div>

                    <div className="day-attendance-badges">
                      {present > 0 && (
                        <span className="att-chip present" title={`${present} Full`}>
                          <span className="chip-text-full">{present} Full</span>
                          <span className="chip-text-mini">F</span>
                        </span>
                      )}
                      {half > 0 && (
                        <span className="att-chip half" title={`${half} Half`}>
                          <span className="chip-text-full">{half} Half</span>
                          <span className="chip-text-mini">H</span>
                        </span>
                      )}
                      {leave > 0 && (
                        <span className="att-chip leave" title={`${leave} Leave`}>
                          <span className="chip-text-full">{leave} Leave</span>
                          <span className="chip-text-mini">L</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="attendance-stats-grid">
        <div className="att-stat-card present">
          <div className="att-stat-icon-wrap">
            <CheckCircleIcon size={20} />
          </div>
          <div className="att-stat-info">
            <span className="att-stat-label">TOTAL PRESENT</span>
            <strong className="att-stat-val">{stats.present}</strong>
          </div>
        </div>

        <div className="att-stat-card full">
          <div className="att-stat-icon-wrap">
            <CalendarCheckIcon size={20} />
          </div>
          <div className="att-stat-info">
            <span className="att-stat-label">FULL DAYS</span>
            <strong className="att-stat-val">{stats.full}</strong>
          </div>
        </div>

        <div className="att-stat-card half">
          <div className="att-stat-icon-wrap">
            <ClockIcon size={20} />
          </div>
          <div className="att-stat-info">
            <span className="att-stat-label">HALF DAYS</span>
            <strong className="att-stat-val">{stats.half}</strong>
          </div>
        </div>

        <div className="att-stat-card leaves">
          <div className="att-stat-icon-wrap">
            <CalendarIcon size={20} />
          </div>
          <div className="att-stat-info">
            <span className="att-stat-label">LEAVES</span>
            <strong className="att-stat-val">{stats.leaves}</strong>
          </div>
        </div>
      </div>

      {/* Marking Details Table Card */}
      <div className="attendance-table-card">
        <div className="att-table-header-bar">
          <h3 className="att-marking-title">
            <CalendarIcon size={18} />
            {selectMode === 'single'
              ? `Marking for ${moment(currentDate).format('MMM DD, YYYY')}`
              : `Marking for ${moment(rangeStart || currentDate).format('MMM DD, YYYY')} - ${moment(rangeEnd || rangeStart || currentDate).format('MMM DD, YYYY')}`
            }
          </h3>

          {selectMode === 'single' && (
            <div className="att-marking-date-picker">
              <CalendarPicker
                selectedDate={currentDate}
                onChange={d => d && setCurrentDate(d)}
                allowClear={false}
              />
            </div>
          )}
        </div>
        
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            Loading attendance records...
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="att-desktop-table-wrap">
              <table className="att-table">
                <thead>
                  <tr>
                    {selectMode === 'range' && <th>DATE</th>}
                    <th>USER DETAILS</th>
                    <th>TIMING INFO</th>
                    <th>DAILY STATUS</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.length === 0 ? (
                    <tr>
                      <td colSpan={selectMode === 'range' ? 5 : 4} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                        No attendance records found for this selection.
                      </td>
                    </tr>
                  ) : attendanceData.map(record => (
                    <tr key={record._id}>
                      {selectMode === 'range' && (
                        <td style={{ fontWeight: '600', fontSize: '12px', color: '#1e293b' }}>
                          {moment(record.date).format('MMM DD, YYYY')}
                        </td>
                      )}
                      <td>
                        <div className="att-user-cell">
                          <div className="att-user-avatar">
                            {record.user.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="att-user-info">
                            <span className="att-user-name">{record.user.name}</span>
                            <span className="att-user-sub">
                              <span className="att-role-badge">{record.user.role.toUpperCase()}</span> &bull; {record.user.email}
                            </span>
                            {formatScheduleText(record.user?.timings) && (
                              <span className="att-user-timing">
                                Timing: {formatScheduleText(record.user?.timings)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        {record.user?.timings && record.user.timings.length > 1 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {record.user.timings.map((t, idx) => {
                              const shiftRec = record.shifts?.find(s => s.shiftIndex === idx) || 
                                (idx === 0 && (!record.shifts || record.shifts.length === 0) && record.clockIn 
                                  ? { clockIn: record.clockIn, clockOut: record.clockOut } 
                                  : null);
                              return (
                                <div key={idx} style={{ fontSize: '11px', borderBottom: idx < record.user.timings.length - 1 ? '1px dashed #e2e8f0' : 'none', paddingBottom: '4px' }}>
                                  <div style={{ fontWeight: '700', color: '#64748b', marginBottom: '2px', fontSize: '10.5px' }}>
                                    Shift {idx + 1} ({formatTime12HourStr(t.startTime)} - {formatTime12HourStr(t.endTime)}):
                                  </div>
                                  <div className="timing-row">
                                    <div>
                                      <span className="timing-tag in">IN: </span>
                                      <span className="timing-val">
                                        {shiftRec?.clockIn ? moment(shiftRec.clockIn).format('hh:mm A') : '--:--'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="timing-tag out">OUT: </span>
                                      <span className="timing-val">
                                        {shiftRec?.clockOut ? moment(shiftRec.clockOut).format('hh:mm A') : '--:--'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="att-timing-block">
                            <div className="timing-row">
                              <div>
                                <span className="timing-tag in">IN: </span>
                                <span className="timing-val">{record.clockIn ? moment(record.clockIn).format('hh:mm A') : '--:--'}</span>
                              </div>
                              <div>
                                <span className="timing-tag out">OUT: </span>
                                <span className="timing-val">{record.clockOut ? moment(record.clockOut).format('hh:mm A') : '--:--'}</span>
                              </div>
                            </div>
                            {formatScheduleText(record.user?.timings) && (
                              <div className="timing-expected">
                                Expected: {formatScheduleText(record.user?.timings)}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        {getStatusBadge(record.status)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <div className="att-action-group">
                            <button 
                              type="button"
                              onClick={() => updateStatus(record.userId, 'present', record.date)} 
                              className={`att-act-btn ${record.status === 'present' ? 'active full' : ''}`}
                            >
                              FULL
                            </button>
                            <button 
                              type="button"
                              onClick={() => updateStatus(record.userId, 'half-day', record.date)} 
                              className={`att-act-btn ${record.status === 'half-day' ? 'active half' : ''}`}
                            >
                              HALF
                            </button>
                            <button 
                              type="button"
                              onClick={() => updateStatus(record.userId, 'leave', record.date)} 
                              className={`att-act-btn ${record.status === 'leave' ? 'active leave' : ''}`}
                            >
                              LEAVE
                            </button>
                          </div>

                          <button 
                            type="button"
                            onClick={() => openEditModal(record)} 
                            className="att-edit-icon-btn"
                            title="Edit Timings & Status"
                            aria-label="Edit Timings & Status"
                          >
                            <EditIcon size={16} strokeWidth={2.2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Responsive Card View for Mobile & Tablet (sm: 1 card, md: 2 cards) */}
            <div className="att-mobile-cards-wrap">
              {attendanceData.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '10px' }}>
                  No attendance records found for this selection.
                </div>
              ) : attendanceData.map(record => (
                <div className="att-card" key={record._id}>
                  {/* Card Header: Avatar + User Info + Status Badge */}
                  <div className="att-card-top">
                    <div className="att-card-user">
                      <div className="att-user-avatar">
                        {record.user.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="att-card-user-info">
                        <span className="att-card-user-name" title={record.user.name}>
                          {record.user.name}
                        </span>
                        <div className="att-card-user-meta">
                          <span className="att-role-badge">{record.user.role.toUpperCase()}</span>
                          <span className="att-card-email" title={record.user.email}>
                            {record.user.email}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="att-card-status">
                      {getStatusBadge(record.status)}
                    </div>
                  </div>

                  {/* Range date if applicable */}
                  {selectMode === 'range' && (
                    <div className="att-card-range-date">
                      <CalendarIcon size={12} color="#64748b" />
                      <span>{moment(record.date).format('MMM DD, YYYY')}</span>
                    </div>
                  )}

                  {/* Expected Timing Pill if available */}
                  {formatScheduleText(record.user?.timings) && (
                    <div className="att-card-schedule-pill">
                      <ClockIcon size={12} color="#0284c7" />
                      <span>Shift: {formatScheduleText(record.user?.timings)}</span>
                    </div>
                  )}

                  {/* In/Out Timing Block */}
                  <div className="att-card-timing-box">
                    {record.user?.timings && record.user.timings.length > 1 ? (
                      <div className="att-card-shifts-list">
                        {record.user.timings.map((t, idx) => {
                          const shiftRec = record.shifts?.find(s => s.shiftIndex === idx) || 
                            (idx === 0 && (!record.shifts || record.shifts.length === 0) && record.clockIn 
                              ? { clockIn: record.clockIn, clockOut: record.clockOut } 
                              : null);
                          return (
                            <div key={idx} className="att-card-shift-row">
                              <span className="att-card-shift-title">
                                Shift {idx + 1} ({formatTime12HourStr(t.startTime)} - {formatTime12HourStr(t.endTime)}):
                              </span>
                              <div className="timing-row">
                                <div>
                                  <span className="timing-tag in">IN: </span>
                                  <span className="timing-val">
                                    {shiftRec?.clockIn ? moment(shiftRec.clockIn).format('hh:mm A') : '--:--'}
                                  </span>
                                </div>
                                <div>
                                  <span className="timing-tag out">OUT: </span>
                                  <span className="timing-val">
                                    {shiftRec?.clockOut ? moment(shiftRec.clockOut).format('hh:mm A') : '--:--'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="timing-row">
                        <div>
                          <span className="timing-tag in">IN: </span>
                          <span className="timing-val">{record.clockIn ? moment(record.clockIn).format('hh:mm A') : '--:--'}</span>
                        </div>
                        <div>
                          <span className="timing-tag out">OUT: </span>
                          <span className="timing-val">{record.clockOut ? moment(record.clockOut).format('hh:mm A') : '--:--'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Quick Status Buttons + Edit Modal */}
                  <div className="att-card-footer">
                    <div className="att-card-action-group att-action-group">
                      <button 
                        type="button"
                        onClick={() => updateStatus(record.userId, 'present', record.date)} 
                        className={`att-act-btn ${record.status === 'present' ? 'active full' : ''}`}
                      >
                        FULL
                      </button>
                      <button 
                        type="button"
                        onClick={() => updateStatus(record.userId, 'half-day', record.date)} 
                        className={`att-act-btn ${record.status === 'half-day' ? 'active half' : ''}`}
                      >
                        HALF
                      </button>
                      <button 
                        type="button"
                        onClick={() => updateStatus(record.userId, 'leave', record.date)} 
                        className={`att-act-btn ${record.status === 'leave' ? 'active leave' : ''}`}
                      >
                        LEAVE
                      </button>
                    </div>

                    <button 
                      type="button"
                      onClick={() => openEditModal(record)} 
                      className="att-edit-icon-btn"
                      title="Edit Timings & Status"
                      aria-label="Edit Timings & Status"
                    >
                      <EditIcon size={16} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Edit Attendance Modal */}
      {editingRecord && (
        <div className="modal-overlay" onClick={() => setEditingRecord(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  Edit Attendance
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  {editingRecord.user.name} &bull; {moment(currentDate).format('MMM DD, YYYY')}
                </p>
              </div>
              <button 
                type="button"
                className="modal-close"
                onClick={() => setEditingRecord(null)}
                title="Close modal"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="compact-field-label">
                  Clock In Time
                </label>
                <input 
                  type="time" 
                  value={editClockIn} 
                  onChange={(e) => setEditClockIn(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    color: '#1e293b',
                    background: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label className="compact-field-label">
                  Clock Out Time
                </label>
                <input 
                  type="time" 
                  value={editClockOut} 
                  onChange={(e) => setEditClockOut(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    color: '#1e293b',
                    background: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label className="compact-field-label">
                  Daily Status
                </label>
                <CustomSelect
                  value={editStatus}
                  onChange={setEditStatus}
                  options={STATUS_SELECT_OPTIONS}
                  placeholder="Select Status"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="crm-btn crm-btn-secondary"
                onClick={() => setEditingRecord(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="crm-btn crm-btn-primary"
                onClick={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
