import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  CalendarIcon, 
  ClockIcon, 
  CalendarCheckIcon, 
  PhoneCallIcon, 
  ClipboardListIcon, 
  BookmarkIcon, 
  HeartPulseIcon, 
  CheckCircleIcon, 
  BanknoteIcon, 
  WalletIcon, 
  CreditCardIcon, 
  PackageIcon, 
  UsersIcon, 
  UserCheckIcon, 
  ShieldCheckIcon,
  CameraIcon
} from '../components/Icons';
import ClockInCameraModal from '../components/ClockInCameraModal';
import StatusDropdown from '../components/StatusDropdown';
import './Dashboard.css';

const isTaskDone = (status) => status === 'Done' || status === 'Completed';

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

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saData, setSaData] = useState(null);

  // Camera modal state for live photo verification during clock-in
  const [cameraModal, setCameraModal] = useState({ isOpen: false, shiftIndex: 0, shiftName: '' });
  const [isSubmittingClockIn, setIsSubmittingClockIn] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  useEffect(() => {
    if (user.role === 'superadmin') {
      const fetchSaData = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/dashboard/superadmin`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSaData(res.data);
        } catch (err) {
          console.error('Superadmin dashboard data fetch error:', err);
        }
      };
      fetchSaData();
    }
  }, [user.role]);

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
  const [teamPerfData, setTeamPerfData] = useState([]);
  const [todayTasks, setTodayTasks] = useState(null);
  const [juniorPendingCount, setJuniorPendingCount] = useState(0);

  useEffect(() => {
    fetchTodayAttendance();
    fetchUpcomingHolidays();
    if (user.role === 'team') {
      fetchWalletData();
      fetchTodayTasks();

        const localToken = localStorage.getItem('token');
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/dashboard/team-performance`, { headers: { Authorization: `Bearer ${localToken}` } })
          .then(res => setTeamPerfData(res.data.performanceGraph))
          .catch(err => console.log(err));

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

  // Aaj ke mere tasks + (senior ho to) juniors ke pending tasks ka count
  const fetchTodayTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const today = moment().format('YYYY-MM-DD');
      const headers = { Authorization: `Bearer ${token}` };
      const [myRes, juniorRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/tasks?tab=my&date=${today}`, { headers }),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/tasks?tab=team&date=${today}`, { headers }).catch(() => ({ data: [] }))
      ]);
      setTodayTasks(myRes.data || []);
      setJuniorPendingCount((juniorRes.data || []).filter(t => !isTaskDone(t.status)).length);
    } catch (error) {
      console.error('Error fetching today tasks', error);
      setTodayTasks([]);
    }
  };

  const handleTaskStatusChange = async (task, newStatus) => {
    if (isTaskDone(newStatus) && task.checklistItems?.some(item => !item.isCompleted)) {
      alert('You must complete all checklist items before marking this task as ' + newStatus);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/tasks/${task._id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTodayTasks(prev => prev.map(t => t._id === task._id ? { ...t, status: newStatus } : t));
    } catch (error) {
      alert('Error updating status: ' + (error.response?.data?.message || error.message));
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

  // Helper to detect if user is on mobile
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  };

  // Clock in handler - opens camera modal on mobile, or clocks in directly on computer/desktop
  const handleClockInClick = async (shiftIndex = 0, shiftLabel = 'Duty') => {
    if (isMobileDevice()) {
      // On mobile devices, require live photo capture
      setCameraModal({
        isOpen: true,
        shiftIndex,
        shiftName: shiftLabel
      });
    } else {
      // On computer / desktop, clock in directly without photo
      setLoadingAction(true);
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/attendance/clock-in`, {
          shiftIndex,
          isMobile: false
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchTodayAttendance();
      } catch (error) {
        alert(error.response?.data?.message || 'Error clocking in');
      } finally {
        setLoadingAction(false);
      }
    }
  };

  // Submits clock-in with live captured photo (for mobile)
  const handleClockInWithPhoto = async (photo) => {
    setIsSubmittingClockIn(true);
    setLoadingAction(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/attendance/clock-in`, {
        shiftIndex: cameraModal.shiftIndex,
        photo,
        isMobile: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCameraModal({ isOpen: false, shiftIndex: 0, shiftName: '' });
      fetchTodayAttendance();
    } catch (error) {
      alert(error.response?.data?.message || 'Error clocking in');
    } finally {
      setIsSubmittingClockIn(false);
      setLoadingAction(false);
    }
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

      
        


        {/* Superadmin Dashboard */}
      {user.role === 'superadmin' && (
        <div className="superadmin-dashboard-container">
          <div className="superadmin-top-row">
            <div className="sa-main-content">
              
                <div className="sa-financials-grid">
                  <div className="sa-fin-card">
                    <div className="fin-card-icon fin-icon-blue"><BanknoteIcon size={22} /></div>
                    <div className="fin-card-content">
                      <h3>Total Available Fund</h3>
                      <p>₹ {saData?.financials?.totalAvailableFund?.toLocaleString('en-IN') || '0'}</p>
                    </div>
                  </div>
                  <div className="sa-fin-card">
                    <div className="fin-card-icon fin-icon-orange"><CreditCardIcon size={22} /></div>
                    <div className="fin-card-content">
                      <h3>Total Outstanding</h3>
                      <p>₹ {saData?.financials?.totalOutstanding?.toLocaleString('en-IN') || '0'}</p>
                    </div>
                  </div>
                  <div className="sa-fin-card">
                    <div className="fin-card-icon fin-icon-green"><WalletIcon size={22} /></div>
                    <div className="fin-card-content">
                      <h3>Current Month Sale</h3>
                      <p>₹ {saData?.financials?.currentMonthSale?.toLocaleString('en-IN') || '0'}</p>
                    </div>
                  </div>
                  <div className="sa-fin-card">
                    <div className="fin-card-icon fin-icon-purple"><BanknoteIcon size={22} /></div>
                    <div className="fin-card-content">
                      <h3>Collection (This Month)</h3>
                      <p>₹ {saData?.financials?.currentMonthCollection?.toLocaleString('en-IN') || '0'}</p>
                    </div>
                  </div>
                </div>
  
                <div className="sa-stats-grid">
                  <div className="sa-stat-card">
                    <div className="stat-icon-wrapper"><HeartPulseIcon size={18} color="#3b82f6" /></div>
                    <span className="sa-stat-val">{saData?.counts?.services || 0}</span>
                    <span className="sa-stat-label">Services</span>
                  </div>
                  <div className="sa-stat-card">
                    <div className="stat-icon-wrapper"><PackageIcon size={18} color="#8b5cf6" /></div>
                    <span className="sa-stat-val">{saData?.counts?.packages || 0}</span>
                    <span className="sa-stat-label">Packages</span>
                  </div>
                  <div className="sa-stat-card">
                    <div className="stat-icon-wrapper"><UsersIcon size={18} color="#10b981" /></div>
                    <span className="sa-stat-val">{saData?.counts?.patients || 0}</span>
                    <span className="sa-stat-label">Total Patients</span>
                  </div>
                  <div className="sa-stat-card">
                    <div className="stat-icon-wrapper"><CalendarCheckIcon size={18} color="#f59e0b" /></div>
                    <span className="sa-stat-val">{saData?.counts?.appointmentsToday || 0}</span>
                    <span className="sa-stat-label">Today's Appts</span>
                  </div>
                  <div className="sa-stat-card">
                    <div className="stat-icon-wrapper"><UserCheckIcon size={18} color="#06b6d4" /></div>
                    <span className="sa-stat-val">{saData?.counts?.teamMembers || 0}</span>
                    <span className="sa-stat-label">Team Members</span>
                  </div>
                  <div className="sa-stat-card">
                    <div className="stat-icon-wrapper"><ShieldCheckIcon size={18} color="#f43f5e" /></div>
                    <span className="sa-stat-val">{saData?.counts?.admins || 0}</span>
                    <span className="sa-stat-label">Admins</span>
                  </div>
                </div>
              </div>
  
              <div className="sa-sidebar">
                <div className="sa-rituals-card">
                <h3>User Daily Work (Rituals)</h3>
                {saData?.rituals?.length > 0 ? (
                  <ul className="sa-rituals-list">
                    {saData.rituals.map((r, i) => (
                      <li key={i} className={r.status}>
                        <span className="ritual-name">{r.name}</span>
                        <span className="ritual-time">{r.time}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', marginTop: '20px' }}>No rituals for today</p>
                )}
              </div>
            </div>
          </div>

          <div className="sa-graph-card full-width-graph">
            <h3>Team Performance</h3>
            <div className="sa-graph-wrapper">
              {saData?.teamGraph && saData.teamGraph.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={saData.teamGraph} barSize={10} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="attendance" name="Attendance (%)" fill="#4285F4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="punctuality" name="Punctuality (%)" fill="#9b59b6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="tasks" name="Tasks Completed (%)" fill="#0f9d58" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
                  No team members found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Duty Schedule + Monthly Wallet (For Admin & Team Members, Hidden for Superadmin) */}
      {user.role !== 'superadmin' && (
        <div className={`dashboard-main-grid ${user.role === 'admin' ? 'admin-only-grid' : ''}`}>
          {/* Left Column: Today's Duty & Shifts (Only for Team) */}
          {user.role === 'team' && (
            <div className="dashboard-duty-section">
              <div className="section-title-wrap">
                <h2 className="section-heading">
                  <ClockIcon size={18} color="var(--primary-color, #144b79)" />
                  <span>Today's Duty Schedule</span>
                </h2>
              </div>

              <div className="shift-cards-wrap">
                {attendance === null ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem', padding: '10px' }}><div className="global-loader-container"><div className="global-spinner"></div><div>Loading duty schedule...</div></div></div>
                ) : userShifts.map((shift, idx) => {
                  const shiftRecord = attendance?.shifts?.find(s => s.shiftIndex === idx) || 
                    (idx === 0 && (!attendance?.shifts || attendance?.shifts?.length === 0) && attendance?.clockIn 
                      ? { clockIn: attendance.clockIn, clockOut: attendance.clockOut, photo: attendance.photo } 
                      : null);
                  
                  const isShiftClockedIn = shiftRecord && shiftRecord.clockIn && !shiftRecord.clockOut;
                  const hasShiftClockedOut = shiftRecord && shiftRecord.clockOut;

                  let hasShiftEnded = false;
                  let endNotice = '';
                  if (shift.endTime) {
                    const now = moment();
                    const timeFormats = ['HH:mm', 'hh:mm A', 'h:mm A', 'hh:mm a', 'h:mm a'];
                    const shiftEnd = moment(shift.endTime, timeFormats);
                    if (shift.startTime) {
                      const shiftStart = moment(shift.startTime, timeFormats);
                      if (shiftEnd.isBefore(shiftStart)) {
                        shiftEnd.add(1, 'days');
                      }
                    }
                    if (now.isAfter(shiftEnd)) {
                      hasShiftEnded = true;
                      endNotice = `Shift ended at ${formatTime12HourStr(shift.endTime)}`;
                    }
                  }

                  // Clock In kabhi bhi ho sakta hai - jaldi aane / late jaane ka time salary me judta hai
                  const canClockIn = true;
                  const lockNotice = hasShiftEnded ? endNotice : '';

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

                        {/* Verified Live Clock-in Photo badge */}
                        {shiftRecord?.photo && (
                          <div 
                            onClick={() => setPreviewPhoto(shiftRecord.photo)}
                            title="Click to view verified clock-in selfie"
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              cursor: 'pointer', 
                              marginTop: '6px',
                              background: '#ecfdf5',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              border: '1px solid #a7f3d0'
                            }}
                          >
                            <img 
                              src={shiftRecord.photo} 
                              alt="Selfie" 
                              style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} 
                            />
                            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>Verified Photo</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shift-action-btn-wrap">
                      {!isShiftClockedIn && !hasShiftClockedOut && (
                        <button 
                          type="button"
                          onClick={() => handleClockInClick(idx, shiftLabel)} 
                          disabled={loadingAction || !canClockIn} 
                          className="btn-clock-in"
                          title="Click to take live photo and Clock In"
                        >
                          <CameraIcon size={14} />
                          <span>Clock In</span>
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

            {/* Today's Tasks */}
            <div className="dash-tasks-card">
              <div className="dash-tasks-header">
                <h2 className="section-heading">
                  <ClipboardListIcon size={18} color="var(--primary-color, #144b79)" />
                  <span>Today's Tasks</span>
                </h2>
                {todayTasks && todayTasks.length > 0 && (
                  <span className="dash-tasks-count">
                    {todayTasks.filter(t => isTaskDone(t.status)).length}/{todayTasks.length} Done
                  </span>
                )}
              </div>

              {todayTasks === null ? (
                <div className="dash-tasks-empty">Loading tasks...</div>
              ) : todayTasks.length === 0 ? (
                <div className="dash-tasks-empty">
                  <CheckCircleIcon size={18} color="#10b981" />
                  <span>No tasks for today</span>
                </div>
              ) : (
                <div className="dash-tasks-list">
                  {todayTasks.map(task => (
                    <div key={task._id} className={`dash-task-row ${isTaskDone(task.status) ? 'done' : ''}`}>
                      <div className="dash-task-info">
                        <span className="dash-task-title">{task.title}</span>
                        <div className="dash-task-meta">
                          {task.category && <span className="dash-task-tag">#{task.category}</span>}
                          {task.priority && <span className={`dash-task-tag priority-${task.priority.toLowerCase()}`}>{task.priority}</span>}
                          {task.checklistItems?.length > 0 && (
                            <span className="dash-task-tag">
                              ✓ {task.checklistItems.filter(i => i.isCompleted).length}/{task.checklistItems.length}
                            </span>
                          )}
                        </div>
                      </div>
                      <StatusDropdown value={task.status} onChange={(newStatus) => handleTaskStatusChange(task, newStatus)} />
                    </div>
                  ))}
                </div>
              )}

              {juniorPendingCount > 0 && (
                <Link to="/tasks" className="dash-tasks-junior-note">
                  <UsersIcon size={14} />
                  <span>{juniorPendingCount} {juniorPendingCount === 1 ? 'task is' : 'tasks are'} pending for your juniors today</span>
                </Link>
              )}

              <Link to="/my-tasks" className="dash-tasks-view-all">View All Tasks →</Link>
            </div>
          </div>
          )}

        {/* Right Column: Monthly Wallet + Quick Shortcuts */}
        <div className="dashboard-right-column">
          {/* Monthly Wallet Widget */}
          {user.role === 'team' && walletData && (
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
                  <span className="metric-val">{walletData.stats?.officialHolidaysPassed || walletData.stats?.paidHolidays || 0}</span>
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

    {/* My 6 Month Performance Graph */}
    {user.role === 'team' && (
      <div className="dashboard-section" style={{ marginTop: '20px' }}>
        <div className="section-title-wrap">
          <h2 className="section-heading">My 6-Month Performance</h2>
        </div>
        <div className="sa-graph-wrapper" style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
          {teamPerfData && teamPerfData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamPerfData} barSize={10} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="attendance" name="Attendance (%)" fill="#4285F4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="punctuality" name="Punctuality (%)" fill="#9b59b6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tasks" name="Tasks Completed (%)" fill="#0f9d58" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
              Loading graph...
            </div>
          )}
        </div>
      </div>
    )}

    {/* Live Photo Verification Camera Modal */}
    <ClockInCameraModal 
      isOpen={cameraModal.isOpen}
      shiftName={cameraModal.shiftName}
      isSubmitting={isSubmittingClockIn}
      onClose={() => setCameraModal({ isOpen: false, shiftIndex: 0, shiftName: '' })}
      onConfirm={handleClockInWithPhoto}
    />

    {/* Verified Photo Preview Modal */}
    {previewPhoto && (
      <div 
        style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(15, 23, 42, 0.75)', 
          backdropFilter: 'blur(4px)',
          zIndex: 99999, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '16px' 
        }}
        onClick={() => setPreviewPhoto(null)}
      >
        <div 
          style={{ 
            background: '#fff', 
            borderRadius: '16px', 
            overflow: 'hidden', 
            maxWidth: '440px', 
            width: '100%', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)' 
          }} 
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Verified Clock-In Selfie</h4>
            <button 
              onClick={() => setPreviewPhoto(null)} 
              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
            >
              ✕
            </button>
          </div>
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', background: '#0f172a' }}>
            <img 
              src={previewPhoto} 
              alt="Clock-In Selfie" 
              style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: '10px', objectFit: 'contain' }} 
            />
          </div>
          <div style={{ padding: '14px 20px', textAlign: 'right', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <button 
              onClick={() => setPreviewPhoto(null)} 
              style={{ padding: '9px 20px', background: '#144b79', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}

  </div>
  );
};

export default Dashboard;
