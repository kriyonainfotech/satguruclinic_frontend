import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  CalendarIcon, 
  DownloadIcon, 
  WalletIcon, 
  XIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  SearchIcon, 
  ClockIcon, 
  CheckCircleIcon 
} from '../components/Icons';
import './Payroll.css';

const Payroll = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [payrollData, setPayrollData] = useState({ summary: {}, details: [] });
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLogsForUser, setSelectedLogsForUser] = useState(null);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const month = currentMonth.format('MM');
      const year = currentMonth.format('YYYY');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/payroll?month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayrollData(res.data);
    } catch (error) {
      console.error('Error fetching payroll', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayroll();
  }, [currentMonth]);

  const handlePrevMonth = () => setCurrentMonth(currentMonth.clone().subtract(1, 'month'));
  const handleNextMonth = () => setCurrentMonth(currentMonth.clone().add(1, 'month'));

  let filteredDetails = payrollData.details || [];
  
  if (activeTab !== 'All') {
    filteredDetails = filteredDetails.filter(d => {
      const r = d.user.role.toLowerCase();
      if (activeTab === 'Superadmins') return r === 'superadmin';
      if (activeTab === 'Admins') return r === 'admin';
      if (activeTab === 'Team') return r === 'team';
      return false;
    });
  }

  if (searchTerm) {
    filteredDetails = filteredDetails.filter(d => 
      d.user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Grouping by Role/Category
  const groupedData = filteredDetails.reduce((acc, curr) => {
    const groupName = curr.user.category ? curr.user.category.toUpperCase() : curr.user.role.toUpperCase();
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(curr);
    return acc;
  }, {});

  const formatTime12HourStr = (time24) => {
    if (!time24) return '';
    if (time24.toUpperCase().includes('AM') || time24.toUpperCase().includes('PM')) {
      return time24;
    }
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const getFullMonthLogs = (records) => {
    if (!currentMonth) return [];
    
    const today = moment();
    let daysToShow = currentMonth.daysInMonth();
    if (today.isSame(currentMonth, 'month')) {
      daysToShow = today.date();
    } else if (today.isBefore(currentMonth, 'month')) {
      daysToShow = 0;
    }

    const fullLogs = [];
    for (let d = 1; d <= daysToShow; d++) {
      const dateStr = currentMonth.clone().date(d).format('YYYY-MM-DD');
      const existingRecord = records.find(r => moment(r.date).format('YYYY-MM-DD') === dateStr);
      
      if (existingRecord) {
        fullLogs.push(existingRecord);
      } else {
        const holiday = (payrollData.officialHolidays || []).find(h => h.date === dateStr);
        if (holiday) {
          fullLogs.push({
            date: dateStr,
            status: 'holiday',
            holidayName: holiday.title,
            isPaid: holiday.isPaid,
            isHalfDay: holiday.isHalfDay,
            isSynthetic: true
          });
        } else {
          fullLogs.push({
            date: dateStr,
            status: 'leave',
            isSynthetic: true
          });
        }
      }
    }
    
    return fullLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  return (
    <div className="payroll-page-container">
      {/* Top Header Card */}
      <div className="payroll-engine-card">
        <div className="payroll-engine-left">
          <div className="payroll-engine-icon-badge">
            <WalletIcon size={22} />
          </div>
          <div>
            <h3 className="payroll-engine-title">Payroll Engine</h3>
          </div>
        </div>

        <div className="payroll-month-navigator">
          <button 
            type="button" 
            onClick={handlePrevMonth} 
            className="payroll-month-nav-btn"
            title="Previous Month"
            aria-label="Previous Month"
          >
            <ChevronLeftIcon size={16} />
          </button>
          <span className="payroll-month-label">{currentMonth.format('MMMM YYYY')}</span>
          <button 
            type="button" 
            onClick={handleNextMonth} 
            className="payroll-month-nav-btn"
            title="Next Month"
            aria-label="Next Month"
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="payroll-stats-grid">
        <div className="payroll-stat-card stat-payroll">
          <div className="payroll-stat-header">
            <span className="payroll-stat-label">Total Payroll</span>
            <div className="payroll-stat-icon">
              <WalletIcon size={16} />
            </div>
          </div>
          <div className="payroll-stat-value">₹{(payrollData.summary.totalPayroll || 0).toLocaleString()}</div>
          <div className="payroll-stat-desc">Fixed monthly commitment</div>
        </div>

        <div className="payroll-stat-card stat-working">
          <div className="payroll-stat-header">
            <span className="payroll-stat-label">Working Days</span>
            <div className="payroll-stat-icon">
              <CalendarIcon size={16} />
            </div>
          </div>
          <div className="payroll-stat-value">
            {payrollData.summary.workingDays || 0} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>Days</span>
          </div>
          <div className="payroll-stat-desc">Excluding Sundays</div>
        </div>

        <div className="payroll-stat-card stat-accrued">
          <div className="payroll-stat-header">
            <span className="payroll-stat-label">Accrued Till Date</span>
            <div className="payroll-stat-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
          </div>
          <div className="payroll-stat-value">₹{(payrollData.summary.accruedTillDate || 0).toLocaleString()}</div>
          <div className="payroll-stat-desc">Live balance earned by team</div>
        </div>

        <div className="payroll-stat-card stat-paid">
          <div className="payroll-stat-header">
            <span className="payroll-stat-label">Total Paid</span>
            <div className="payroll-stat-icon">
              <CheckCircleIcon size={16} />
            </div>
          </div>
          <div className="payroll-stat-value">₹{(payrollData.summary.totalPaid || 0).toLocaleString()}</div>
          <div className="payroll-stat-desc">Salary disbursed via expenses</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="payroll-filter-bar">
        {user.role !== 'admin' ? (
          <div className="payroll-tabs-wrap">
            {['All', 'Superadmins', 'Admins', 'Team'].map(tab => (
              <button 
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`payroll-tab-btn ${activeTab === tab ? 'active' : ''}`}
              >
                {tab}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ flex: 1 }}></div>
        )}

        <div className="payroll-search-box">
          <SearchIcon size={15} className="payroll-search-icon" />
          <input 
            type="text" 
            placeholder="Search employee..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="payroll-search-input"
          />
          {searchTerm && (
            <button 
              type="button" 
              onClick={() => setSearchTerm('')} 
              className="payroll-search-clear"
              title="Clear search"
            >
              <XIcon size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content / Tables */}
      {loading ? (
        <div style={{ background: '#fff', padding: '48px', textAlign: 'center', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 500 }}><div className="global-loader-container"><div className="global-spinner"></div><div>Loading payroll records...</div></div></div>
      ) : (
        <div>
          {Object.keys(groupedData).length === 0 ? (
            <div style={{ background: '#fff', padding: '48px', textAlign: 'center', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
              No payroll records found for this period.
            </div>
          ) : (
            Object.keys(groupedData).map(group => (
              <div key={group} className="payroll-group-section">
                {/* Group Heading */}
                <div className="payroll-group-header">
                  <div className="payroll-group-accent"></div>
                  <h4 className="payroll-group-title">{group}</h4>
                  <span className="payroll-group-count">{groupedData[group].length}</span>
                </div>
                
                {/* Desktop View Table */}
                <div className="desktop-table-view">
                  <div className="payroll-table-container">
                    <table className="payroll-table">
                      <thead>
                        <tr>
                          <th>EMPLOYEE INFO</th>
                          <th>SHIFT & TIME</th>
                          <th>MONTH STATS</th>
                          <th>TOTAL DAYS</th>
                          <th>LIVE BALANCE</th>
                          <th className="text-right">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedData[group].map((record) => (
                          <tr key={record.user._id}>
                            {/* Employee Info */}
                            <td>
                              <div className="emp-info-wrap">
                                <div className="emp-avatar-badge" style={{ border: `3px solid ${record.user.performanceScore !== undefined ? (record.user.performanceScore <= 80 ? '#ef4444' : record.user.performanceScore <= 90 ? '#eab308' : '#22c55e') : 'transparent'}` }}>
                                  {record.user.name.trim().charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="emp-name-text">{record.user.name.trim()}</div>
                                  <div className="emp-meta-text">
                                    <span>{record.user.email}</span>
                                    <span>&bull;</span>
                                    <span className="emp-timing-badge">{record.user.timingType}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Shift & Time */}
                            <td>
                              <div className="shift-time-list">
                                {record.user.timings && record.user.timings.length > 0 ? (
                                  record.user.timings.map((t, i) => (
                                    <div key={i} className="shift-time-item">
                                      <ClockIcon size={12} color="var(--primary-color, #144b79)" />
                                      <span>{formatTime12HourStr(t.startTime)} - {formatTime12HourStr(t.endTime)}</span>
                                    </div>
                                  ))
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>No shift</span>
                                )}
                              </div>
                            </td>

                            {/* Month Stats */}
                            <td>
                              <div className="month-stats-grid">
                                <div className="month-stat-box">
                                  <span className="month-stat-lbl">PRESENT</span>
                                  <span className="month-stat-val stat-val-present">{record.stats.present}</span>
                                </div>
                                <div className="month-stat-box">
                                  <span className="month-stat-lbl">HALF DAY</span>
                                  <span className="month-stat-val stat-val-half">{record.stats.halfDay}</span>
                                </div>
                                <div className="month-stat-box">
                                  <span className="month-stat-lbl">PAID HOL.</span>
                                  <span className="month-stat-val stat-val-holiday">{record.stats.paidHolidays || 0}</span>
                                </div>
                                <div className="month-stat-box">
                                  <span className="month-stat-lbl">LEAVE</span>
                                  <span className="month-stat-val stat-val-leave">{record.stats.leave}</span>
                                </div>
                              </div>
                            </td>

                            {/* Total Days */}
                            <td>
                              <div className="total-days-badge">
                                {typeof record.totalDays === 'number' ? Number(record.totalDays.toFixed(2)) : record.totalDays} <span className="total-days-sub">/ {record.daysInMonth} DAYS</span>
                              </div>
                            </td>

                            {/* Live Balance */}
                            <td>
                              <div className="live-balance-badge">
                                <WalletIcon size={14} color="#10b981" />
                                <span>₹{record.earned.toLocaleString()}</span>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="text-right">
                              <div className="payroll-actions-wrap">
                                <button 
                                  type="button"
                                  onClick={() => setSelectedLogsForUser(record)}
                                  className="payroll-btn-logs"
                                  title="View Attendance Logs"
                                  aria-label="View Attendance Logs"
                                >
                                  <CalendarIcon size={16} />
                                </button>
                                <button 
                                  type="button"
                                  className="payroll-btn-pay"
                                  title="Disburse payment"
                                >
                                  PAY NOW
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Responsive Cards */}
                <div className="mobile-card-view">
                  {groupedData[group].map((record) => (
                    <div key={record.user._id} className="payroll-mobile-card">
                      <div className="payroll-mobile-header">
                        <div className="emp-avatar-badge" style={{ border: `3px solid ${record.user.performanceScore !== undefined ? (record.user.performanceScore <= 80 ? '#ef4444' : record.user.performanceScore <= 90 ? '#eab308' : '#22c55e') : 'transparent'}` }}>
                          {record.user.name.trim().charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="emp-name-text" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {record.user.name.trim()}
                          </div>
                          <div className="emp-meta-text">
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{record.user.email}</span>
                            <span>&bull;</span>
                            <span className="emp-timing-badge">{record.user.timingType}</span>
                          </div>
                        </div>
                      </div>

                      <div className="payroll-mobile-grid">
                        <div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' }}>
                            SHIFT & TIME
                          </div>
                          <div className="shift-time-list">
                            {record.user.timings && record.user.timings.length > 0 ? (
                              record.user.timings.map((t, i) => (
                                <div key={i} className="shift-time-item" style={{ fontSize: '11px', padding: '2px 6px' }}>
                                  <ClockIcon size={10} color="var(--primary-color, #144b79)" />
                                  <span>{formatTime12HourStr(t.startTime)} - {formatTime12HourStr(t.endTime)}</span>
                                </div>
                              ))
                            ) : (
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>-</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' }}>
                            LIVE BALANCE
                          </div>
                          <div className="live-balance-badge" style={{ fontSize: '13px', padding: '3px 8px' }}>
                            <WalletIcon size={13} color="#10b981" />
                            <span>₹{record.earned.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Month Stats Row */}
                      <div className="payroll-mobile-stats-row">
                        <div className="month-stat-box" style={{ flex: 1 }}>
                          <span className="month-stat-lbl">PRESENT</span>
                          <span className="month-stat-val stat-val-present" style={{ fontSize: '12px' }}>{record.stats.present}</span>
                        </div>
                        <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                        <div className="month-stat-box" style={{ flex: 1 }}>
                          <span className="month-stat-lbl">HALF DAY</span>
                          <span className="month-stat-val stat-val-half" style={{ fontSize: '12px' }}>{record.stats.halfDay}</span>
                        </div>
                        <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                        <div className="month-stat-box" style={{ flex: 1 }}>
                          <span className="month-stat-lbl">PAID HOL.</span>
                          <span className="month-stat-val stat-val-holiday" style={{ fontSize: '12px' }}>{record.stats.paidHolidays || 0}</span>
                        </div>
                        <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                        <div className="month-stat-box" style={{ flex: 1 }}>
                          <span className="month-stat-lbl">LEAVE</span>
                          <span className="month-stat-val stat-val-leave" style={{ fontSize: '12px' }}>{record.stats.leave}</span>
                        </div>
                      </div>

                      <div className="payroll-mobile-footer">
                        <div className="total-days-badge">
                          {typeof record.totalDays === 'number' ? Number(record.totalDays.toFixed(2)) : record.totalDays} <span className="total-days-sub">/ {record.daysInMonth} DAYS</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button 
                            type="button"
                            onClick={() => setSelectedLogsForUser(record)}
                            className="payroll-btn-logs"
                            style={{ width: 'auto', padding: '0 10px', gap: '5px', fontSize: '11px', fontWeight: 600 }}
                          >
                            <CalendarIcon size={13} /> Logs
                          </button>
                          <button 
                            type="button"
                            className="payroll-btn-pay"
                            style={{ padding: '6px 12px' }}
                          >
                            PAY NOW
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Attendance Logs Drawer / Sidebar */}
      {selectedLogsForUser && (
        <>
          <div 
            className="payroll-drawer-overlay"
            onClick={() => setSelectedLogsForUser(null)}
          ></div>
          <div className="payroll-drawer">
            <div className="payroll-drawer-header">
              <div className="payroll-drawer-title-wrap">
                <div className="payroll-drawer-icon">
                  <CalendarIcon size={18} />
                </div>
                <h3 className="payroll-drawer-title">Attendance Logs</h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedLogsForUser(null)} 
                className="payroll-drawer-close"
                title="Close"
                aria-label="Close"
              >
                <XIcon size={18} />
              </button>
            </div>
            
            <div className="payroll-drawer-top-banner">
              <button 
                type="button"
                onClick={() => {
                  if (!selectedLogsForUser || !selectedLogsForUser.records) return;
                  
                  const doc = new jsPDF();
                  const shiftStr = (selectedLogsForUser.user.timings || []).map(t => `${formatTime12HourStr(t.startTime)} - ${formatTime12HourStr(t.endTime)}`).join(' | ') || 'No shift assigned';

                  // Pre-calculate late days & rows
                  let totalLateDays = 0;
                  let totalLateMins = 0;
                  
                  const headers = [['Date', 'Status', 'Time In', 'Time Out', 'Hours', 'Late By']];
                  const rows = getFullMonthLogs(selectedLogsForUser.records).map(log => {
                    const logDate = moment(log.date);
                    let statusLabel = log.status === 'half-day' ? 'Half Day' : (log.status === 'short-time' ? 'Short Time' : (log.status === 'leave' ? 'Leave' : (log.status === 'holiday' ? `Holiday` : 'Full Day')));
                    
                    let clockInStr = '-';
                    let clockOutStr = '-';
                    let hoursWorked = '-';
                    let lateMinStr = '-';
                    let isLate = false;
                    
                    if (log.status === 'holiday') {
                      clockInStr = log.isPaid ? 'Paid' : 'Unpaid';
                    } else if (log.clockIn) {
                      clockInStr = moment(log.clockIn).format('hh:mm A');
                      
                      if (selectedLogsForUser.user.timings && selectedLogsForUser.user.timings.length > 0) {
                         const shiftStart = selectedLogsForUser.user.timings[0].startTime;
                         if (shiftStart) {
                           const shiftStartMom = moment(log.date).set({
                              hour: parseInt(shiftStart.split(':')[0], 10),
                              minute: parseInt(shiftStart.split(':')[1], 10),
                              second: 0
                           });
                           const diffMins = moment(log.clockIn).diff(shiftStartMom, 'minutes');
                           if (diffMins > 0) {
                              isLate = true;
                              lateMinStr = `${diffMins} min`;
                              totalLateDays++;
                              totalLateMins += diffMins;
                           }
                         }
                      }
                      
                      if (log.clockOut) {
                        clockOutStr = moment(log.clockOut).format('hh:mm A');
                        hoursWorked = moment(log.clockOut).diff(moment(log.clockIn), 'hours', true).toFixed(2) + ' h';
                      } else {
                        clockOutStr = 'Missed Out';
                      }
                    }
                    
                    return [
                      logDate.format('DD MMM YYYY'), 
                      statusLabel, 
                      clockInStr, 
                      clockOutStr, 
                      hoursWorked, 
                      { content: lateMinStr, styles: { textColor: isLate ? [220, 38, 38] : [100, 116, 139] } }
                    ];
                  });

                  // Header Background
                  doc.setFillColor(30, 41, 59); // Slate-800
                  doc.rect(0, 0, 210, 45, 'F');
                  
                  // Header Text
                  doc.setTextColor(255, 255, 255);
                  doc.setFontSize(18);
                  doc.setFont(undefined, 'bold');
                  doc.text(`Attendance Report - ${selectedLogsForUser.user.name}`, 14, 22);
                  
                  doc.setFontSize(11);
                  doc.setFont(undefined, 'normal');
                  doc.text(`${currentMonth.format('MMMM YYYY')}`, 14, 31);
                  doc.text(`Shift: ${shiftStr}`, 14, 38);

                  // Analytics Summary
                  doc.setTextColor(30, 41, 59);
                  doc.setFontSize(13);
                  doc.setFont(undefined, 'bold');
                  doc.text('Analytics Summary', 14, 58);

                  doc.setFontSize(10);
                  doc.setFont(undefined, 'normal');
                  const presentCount = selectedLogsForUser.stats?.present || 0;
                  const halfCount = selectedLogsForUser.stats?.halfDay || 0;
                  const leaveCount = selectedLogsForUser.stats?.leave || 0;
                  
                  doc.text(`Present: ${presentCount}`, 14, 68);
                  doc.text(`Half Days: ${halfCount}`, 60, 68);
                  doc.text(`Leaves: ${leaveCount}`, 110, 68);
                  doc.text(`Late Days: ${totalLateDays} (${totalLateMins} min total)`, 155, 68);

                  // Financial Summary
                  doc.setFontSize(13);
                  doc.setFont(undefined, 'bold');
                  doc.text('Financial Summary', 14, 85);

                  doc.setFontSize(11);
                  doc.setFont(undefined, 'normal');
                  const bSalary = selectedLogsForUser.salary ? selectedLogsForUser.salary.toLocaleString('en-IN') : '0';
                  const eSalary = selectedLogsForUser.earned ? Math.round(selectedLogsForUser.earned).toLocaleString('en-IN') : '0';
                  
                  doc.text(`Base Salary: Rs. ${bSalary}`, 14, 95);
                  doc.text(`Earned Salary: Rs. ${eSalary}`, 70, 95);

                  // Separator
                  doc.setDrawColor(226, 232, 240);
                  doc.line(14, 105, 196, 105);

                  // Detailed Logs
                  doc.setFontSize(13);
                  doc.setFont(undefined, 'bold');
                  doc.text('Detailed Logs', 14, 120);

                  autoTable(doc, {
                    startY: 126,
                    head: headers,
                    body: rows,
                    theme: 'plain',
                    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', halign: 'center' },
                    bodyStyles: { textColor: [51, 65, 85] },
                    styles: { cellPadding: 5, fontSize: 9 },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    columnStyles: {
                       0: { halign: 'left' },
                       1: { halign: 'center' },
                       2: { halign: 'center' },
                       3: { halign: 'center' },
                       4: { halign: 'center' },
                       5: { halign: 'right' }
                    }
                  });
                  
                  const finalY = doc.lastAutoTable.finalY || 130;
                  doc.setFontSize(8);
                  doc.setTextColor(156, 163, 175);
                  doc.text(`Generated on: ${moment().format('D/M/YYYY, hh:mm:ss a')}`, 14, finalY + 15);

                  doc.save(`${selectedLogsForUser.user.name.replace(/\s+/g, '_')}_Attendance_${currentMonth.format('MMM_YYYY')}.pdf`);
                }}
                className="payroll-btn-download-pdf"
              >
                <DownloadIcon size={16} /> Download Detailed Report (PDF)
              </button>

              <div className="drawer-emp-meta">
                <h4 className="drawer-emp-name">{selectedLogsForUser.user.name}</h4>
                <div className="drawer-emp-shifts">
                  <ClockIcon size={13} color="var(--primary-color, #144b79)" />
                  <span>
                    {(selectedLogsForUser.user.timings || []).map(t => `${formatTime12HourStr(t.startTime)} - ${formatTime12HourStr(t.endTime)}`).join(' & ') || 'No shift assigned'}
                  </span>
                </div>
                <div className="drawer-emp-month">{currentMonth.format('MMMM YYYY')}</div>
              </div>
            </div>

            <div className="payroll-drawer-content">
              {selectedLogsForUser.records && getFullMonthLogs(selectedLogsForUser.records).length > 0 ? (
                getFullMonthLogs(selectedLogsForUser.records).map((log, index) => {
                  const logDate = moment(log.date);
                  let statusColor = '#10b981'; // present
                  let statusLabel = 'Full Day';
                  
                  if (log.status === 'half-day') {
                    statusColor = '#f59e0b';
                    statusLabel = 'Half Day';
                  } else if (log.status === 'leave') {
                    statusColor = '#ef4444';
                    statusLabel = 'Leave';
                  } else if (log.status === 'holiday') {
                    statusColor = '#8b5cf6';
                    statusLabel = `Holiday (${log.holidayName || 'Official'})`;
                  }

                  // calc hours if clockOut is there
                  let hoursWorked = '-';
                  if (log.clockIn && log.clockOut) {
                    const diff = moment(log.clockOut).diff(moment(log.clockIn), 'hours', true);
                    hoursWorked = diff.toFixed(2) + 'h';
                  }
                  
                  let timeRange = 'No time logged';
                  if (log.status === 'holiday') {
                    timeRange = log.isPaid ? 'Paid Holiday' : 'Unpaid Holiday';
                    if (log.isHalfDay) {
                      timeRange += ' (Half Day)';
                    }
                  } else if (log.clockIn) {
                    timeRange = moment(log.clockIn).format('HH:mm');
                    if (log.clockOut) {
                      timeRange += ' - ' + moment(log.clockOut).format('HH:mm');
                    } else {
                      timeRange += ' - Missed Out';
                    }
                  }

                  return (
                    <div key={index} className="log-item-row">
                      <div className="log-date-col">
                        <div className="log-date-day">{logDate.format('ddd')}</div>
                        <div className="log-date-num">{logDate.format('DD')}</div>
                      </div>
                      <div className="log-info-col">
                        <div className="log-status-wrap">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={statusColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            {log.status === 'holiday' ? (
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            ) : (
                              <>
                                <circle cx="12" cy="12" r="10" />
                                {log.status !== 'leave' && <polyline points="9 12 12 15 16 9" />}
                              </>
                            )}
                          </svg>
                          <span className="log-status-text">{statusLabel}</span>
                        </div>
                        <div className="log-timing-text">{timeRange}</div>
                      </div>
                      <div className="log-hours-col">
                        {hoursWorked}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                  No attendance logged this month.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Payroll;
