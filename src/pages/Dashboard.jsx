import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { 
  CalendarIcon, 
  ClockIcon, 
  CalendarCheckIcon, 
  PhoneCallIcon, 
  ClipboardListIcon, 
  BookmarkIcon, 
  HeartPulseIcon,
  CheckCircleIcon
} from '../components/Icons';
import './Dashboard.css';

const formatTime12HourStr = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/birthdays/today`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTodayBirthdays(res.data);
      } catch (err) {
        console.error('Birthday fetch error:', err);
      }
    };
    fetchBirthdays();
  }, []);

  // Slide interval for multiple birthdays
  useEffect(() => {
    if (todayBirthdays.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % todayBirthdays.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [todayBirthdays.length]);

  const [attendance, setAttendance] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);

  useEffect(() => {
    fetchTodayAttendance();
    fetchUpcomingHolidays();
    if (user.role === 'team' || user.role === 'admin') {
      fetchWalletData();
    }
  }, []);

  const fetchUpcomingHolidays = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/holidays/upcoming`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUpcomingHolidays(res.data || []);
    } catch (error) {
      console.error('Error fetching upcoming holidays', error);
    }
  };

  const fetchWalletData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/payroll/my-wallet`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletData(res.data);
    } catch (error) {
      console.error('Error fetching wallet data', error);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/attendance/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendance(res.data);
    } catch (error) {
      console.error('Error fetching today attendance', error);
    }
  };

  const handleClockIn = async (shiftIndex = 0) => {
    setLoadingAction(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/attendance/clock-in`, { shiftIndex }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTodayAttendance();
    } catch (error) {
      alert(error.response?.data?.message || 'Error clocking in');
    }
    setLoadingAction(false);
  };

  const handleClockOut = async (shiftIndex = 0) => {
    if (!window.confirm('Are you sure you want to clock out?')) return;
    setLoadingAction(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/attendance/clock-out`, { shiftIndex }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTodayAttendance();
    } catch (error) {
      alert(error.response?.data?.message || 'Error clocking out');
    }
    setLoadingAction(false);
  };

  const timingType = attendance?.timingType || user?.timingType || 'normal';
  let userShifts = (attendance?.timings && attendance.timings.length > 0)
    ? attendance.timings
    : (user.timings && user.timings.length > 0 ? user.timings : []);

  if (userShifts.length === 0) {
    userShifts = [{ startTime: '09:00', endTime: '18:00' }];
  }

  const isMultiShift = timingType === 'shift' && userShifts.length > 1;

  const upcomingHolidayAlerts = React.useMemo(() => {
    if (!upcomingHolidays || upcomingHolidays.length === 0) return [];
    
    const grouped = {};
    upcomingHolidays.forEach(h => {
      if (!grouped[h.title]) {
        grouped[h.title] = { title: h.title, days: [], isHalfDay: h.isHalfDay };
      }
      if (!grouped[h.title].days.includes(h.date)) {
        grouped[h.title].days.push(h.date);
      }
    });

    const todayDate = new Date();
    const todayYyyy = todayDate.getFullYear();
    const todayMm = String(todayDate.getMonth() + 1).padStart(2, '0');
    const todayDd = String(todayDate.getDate()).padStart(2, '0');
    const todayStr = `${todayYyyy}-${todayMm}-${todayDd}`;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = `${yyyy}-${mm}-${dd}`;

    let alerts = [];

    Object.values(grouped).forEach(group => {
      group.days.sort();
      
      if (group.days.length > 1) {
        const startDate = new Date(group.days[0] + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase();
        const endDate = new Date(group.days[group.days.length - 1] + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase();
        
        if (group.days.includes(todayStr) || group.days.includes(tomorrowStr)) {
          alerts.push({
            title: 'Vacation Time! 🌴',
            subtitle: 'Enjoy your extended break!',
            eventName: group.title,
            timing: `${startDate} - ${endDate}`
          });
        }
      } else {
        if (group.days.includes(todayStr)) {
          alerts.push({
            title: group.isHalfDay ? 'Half Day Today! ⏱️' : 'Holiday Today! 🎉',
            subtitle: group.isHalfDay ? 'Finish up early and enjoy your day!' : 'Clinic is closed today. Enjoy your holiday!',
            eventName: group.title,
            timing: 'TODAY'
          });
        } else if (group.days.includes(tomorrowStr)) {
          alerts.push({
            title: group.isHalfDay ? 'Upcoming Half Day! ✨' : 'Upcoming Holiday! ✨',
            subtitle: group.isHalfDay ? 'Tomorrow is a short day!' : 'Clinic will be closed tomorrow. Get ready to celebrate!',
            eventName: group.title,
            timing: 'TOMORROW'
          });
        }
      }
    });

    return alerts;
  }, [upcomingHolidays]);

  const userInitial = (user.name || 'U').charAt(0).toUpperCase();

  return (
    <div className="dashboard-page-container">
    

      {/* Upcoming Holiday Alert Banner */}
      {upcomingHolidayAlerts.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          {upcomingHolidayAlerts.map((alert, idx) => (
            <div key={idx} className="dashboard-holiday-card">
              <div className="holiday-left">
                <div className="holiday-icon-box">
                  <CalendarIcon size={24} />
                </div>
                <div>
                  <h3 className="holiday-title">{alert.title}</h3>
                  <p className="holiday-subtitle">{alert.subtitle}</p>
                </div>
              </div>

              <div className="holiday-badge-box">
                <span className="holiday-event-name">{alert.eventName}</span>
                <span className="holiday-timing-tag">{alert.timing}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Grid: Duty Schedule + Monthly Wallet (For Admin & Team Members, Hidden for Superadmin) */}
      {user.role !== 'superadmin' && (
        <div className="dashboard-main-grid">
          {/* Left Column: Today's Duty & Shifts */}
          <div className="dashboard-duty-section">
            <div className="section-title-wrap">
              <h2 className="section-heading">
                <ClockIcon size={18} color="var(--primary-color, #144b79)" />
                <span>Today's Duty Schedule</span>
              </h2>
            </div>

            <div className="shift-cards-wrap">
              {userShifts.map((shift, idx) => {
                const shiftRecord = attendance?.shifts?.find(s => s.shiftIndex === idx) || 
                  (idx === 0 && (!attendance?.shifts || attendance?.shifts?.length === 0) && attendance?.clockIn 
                    ? { clockIn: attendance.clockIn, clockOut: attendance.clockOut } 
                    : null);
                
                const isShiftClockedIn = shiftRecord && shiftRecord.clockIn && !shiftRecord.clockOut;
                const hasShiftClockedOut = shiftRecord && shiftRecord.clockOut;

                let hasShiftEnded = false;
                let endNotice = '';
                if (shift.endTime) {
                  const now = new Date();
                  const [eHour, eMin] = shift.endTime.split(':').map(Number);
                  const shiftEnd = new Date();
                  shiftEnd.setHours(eHour, eMin, 0, 0);
                  if (shift.startTime) {
                    const [sHour, sMin] = shift.startTime.split(':').map(Number);
                    const shiftStart = new Date();
                    shiftStart.setHours(sHour, sMin, 0, 0);
                    if (shiftEnd < shiftStart) {
                      shiftEnd.setDate(shiftEnd.getDate() + 1);
                    }
                  }
                  if (now > shiftEnd) {
                    hasShiftEnded = true;
                    endNotice = `Shift ended at ${formatTime12HourStr(shift.endTime)}`;
                  }
                }

                let canClockIn = true;
                let lockNotice = '';
                if (hasShiftEnded) {
                  canClockIn = false;
                  lockNotice = endNotice;
                } else if (idx > 0 && shift.startTime) {
                  const now = new Date();
                  const [sHour, sMin] = shift.startTime.split(':').map(Number);
                  const shiftStart = new Date();
                  shiftStart.setHours(sHour, sMin, 0, 0);
                  const allowedTime = new Date(shiftStart.getTime() - 5 * 60000);
                  if (now < allowedTime) {
                    canClockIn = false;
                    lockNotice = `Clock In opens 5 mins before shift (from ${allowedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
                  }
                }

                const shiftLabel = isMultiShift ? `Shift ${idx + 1}` : 'General Duty';
                const timingText = (shift.startTime && shift.endTime) 
                  ? `${formatTime12HourStr(shift.startTime)} - ${formatTime12HourStr(shift.endTime)}`
                  : '';

                return (
                  <div 
                    key={idx} 
                    className={`shift-card ${isShiftClockedIn ? 'active-duty' : (hasShiftClockedOut ? 'duty-completed' : '')}`}
                  >
                    <div className="shift-left-info">
                      <div className={`shift-status-icon-wrap ${isShiftClockedIn ? 'active' : (hasShiftClockedOut ? 'completed' : (hasShiftEnded ? 'ended' : 'pending'))}`}>
                        <ClockIcon size={22} />
                      </div>

                      <div>
                        <div className="shift-title-row">
                          <span className="shift-name-text">{shiftLabel}</span>
                          {timingText && <span className="shift-time-badge">{timingText}</span>}
                          
                          {isShiftClockedIn && (
                            <span className="shift-duty-pill active">
                              &bull; On Duty
                            </span>
                          )}
                          {hasShiftClockedOut && (
                            <span className="shift-duty-pill completed">
                              &bull; Completed
                            </span>
                          )}
                          {!isShiftClockedIn && !hasShiftClockedOut && hasShiftEnded && (
                            <span className="shift-duty-pill ended">
                              Shift Ended
                            </span>
                          )}
                          {!isShiftClockedIn && !hasShiftClockedOut && !hasShiftEnded && (
                            <span className="shift-duty-pill pending">
                              Not on Duty
                            </span>
                          )}
                        </div>

                        {isShiftClockedIn && (
                          <p className="shift-subtext in-time">
                            Clocked in at {new Date(shiftRecord.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {hasShiftClockedOut && (
                          <p className="shift-subtext out-time">
                            Clocked out at {new Date(shiftRecord.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {!isShiftClockedIn && !hasShiftClockedOut && lockNotice && (
                          <p className={`shift-subtext ${hasShiftEnded ? 'ended-msg' : 'lock-msg'}`}>
                            {lockNotice}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shift-action-btn-wrap">
                      {!isShiftClockedIn && !hasShiftClockedOut && (
                        <button 
                          type="button"
                          onClick={() => handleClockIn(idx)} 
                          disabled={loadingAction || !canClockIn} 
                          className="btn-clock-in"
                          title={hasShiftEnded ? endNotice : (!canClockIn ? lockNotice : 'Clock In for this shift')}
                        >
                          <ClockIcon size={14} />
                          <span>{hasShiftEnded ? 'Shift Ended' : (canClockIn ? 'Clock In' : 'Opens 5m before')}</span>
                        </button>
                      )}
                      
                      {isShiftClockedIn && (
                        <button 
                          type="button"
                          onClick={() => handleClockOut(idx)} 
                          disabled={loadingAction} 
                          className="btn-clock-out"
                        >
                          <span>Clock Out</span>
                        </button>
                      )}

                      {hasShiftClockedOut && (
                        <div className="btn-completed-badge">
                          <CheckCircleIcon size={14} />
                          <span>Marked</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
        </div>

        {/* Right Column: Monthly Wallet + Quick Shortcuts */}
        <div className="dashboard-right-column">
          {/* Monthly Wallet Widget */}
          {(user.role === 'team' || user.role === 'admin') && walletData && (
            <div className="dashboard-wallet-card">
              <div className="wallet-card-header">
                <div className="wallet-header-left">
                  <div className="wallet-icon-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path>
                      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path>
                      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path>
                    </svg>
                  </div>
                  <h3 className="wallet-heading">Monthly Wallet</h3>
                </div>
                <span className="wallet-badge-type">DAILY SALARY</span>
              </div>

              <div className="wallet-amount-block">
                <div className="wallet-amount-row">
                  <span className="wallet-amount-val">₹{walletData.earned?.toLocaleString()}</span>
                  <span className="wallet-amount-tag">EARNED</span>
                </div>
                {walletData.target > 0 && (
                  <div className="wallet-target-text">
                    Target: <strong>₹{walletData.target?.toLocaleString()}</strong> this month
                  </div>
                )}
              </div>

              <div className="wallet-progress-wrap">
                <div className="wallet-progress-labels">
                  <span className="progress-label-left">MONTH PROGRESS</span>
                  <span className="progress-label-right">{walletData.progress}%</span>
                </div>
                <div className="wallet-progress-track">
                  <div 
                    className="wallet-progress-fill" 
                    style={{ width: `${Math.min(walletData.progress, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="wallet-metrics-grid">
                <div className="wallet-metric-item">
                  <span className="metric-val">{walletData.stats?.present || 0}</span>
                  <span className="metric-label">FULL</span>
                </div>
                <div className="wallet-metric-item">
                  <span className="metric-val">{walletData.stats?.halfDay || 0}</span>
                  <span className="metric-label">HALF</span>
                </div>
                <div className="wallet-metric-item">
                  <span className="metric-val">{walletData.stats?.paidHolidays || 0}</span>
                  <span className="metric-label">HOLIDAY</span>
                </div>
                <div className="wallet-metric-item">
                  <span className="metric-val">{walletData.stats?.leave || 0}</span>
                  <span className="metric-label">LEAVE</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Shortcuts Card */}
          <div className="dashboard-shortcuts-card">
            <h4 className="shortcuts-title">Quick Actions & Shortcuts</h4>
            <div className="shortcuts-list">
              <Link to="/appointments" className="shortcut-chip">
                <CalendarCheckIcon size={16} className="shortcut-icon" />
                <span>Appointments</span>
              </Link>
              <Link to="/calls" className="shortcut-chip">
                <PhoneCallIcon size={16} className="shortcut-icon" />
                <span>Followup Calls</span>
              </Link>
              <Link to="/tasks" className="shortcut-chip">
                <ClipboardListIcon size={16} className="shortcut-icon" />
                <span>My Tasks</span>
              </Link>
              <Link to="/my-sop" className="shortcut-chip">
                <BookmarkIcon size={16} className="shortcut-icon" />
                <span>My SOP</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

export default Dashboard;
