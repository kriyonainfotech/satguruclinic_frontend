import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CalendarPicker, { formatDateToISO } from '../components/CalendarPicker';
import CustomSelect from '../components/CustomSelect';
import CustomTimePicker from '../components/CustomTimePicker';
import { CalendarIcon, PlusIcon, XIcon, TrashIcon, UserIcon, EyeIcon } from '../components/Icons';
import usePermissions from '../permissions/usePermissions';
import {
  formatLeaveRange,
  formatLeaveDuration,
  timeToMinutes,
  getDatesInRange,
  fmtDate,
  leaveDayBreakdown
} from '../utils/leaveFormat';
import './HolidaysEvents.css';
import './Leaves.css';

// Leave apply / approve yahan hota hai. Approved leaves Holidays & Events calendar me dikhti hain.
// Superadmin ki leave seedha approved hoti hai.
const LEAVE_TYPES = ['Casual', 'Sick', 'Emergency', 'Other'];

const ROLE_LABEL = { superadmin: 'Super Admin', admin: 'Admin', team: 'Team' };

// "In dates pe ye log pehle se leave pe hain" note. Har insaan ki sirf chuni hui dates wali leave dikhti hai.
const OverlapNote = ({ leaves, start, end, title }) => {
  if (!leaves || leaves.length === 0) return null;
  const from = start;
  const to = end || start;
  return (
    <div className="leave-overlap-note" role="status">
      <div className="leave-overlap-title">⚠ {title}</div>
      <ul className="leave-overlap-list">
        {leaves.map(l => {
          // Sirf chuni hui dates ke din, aur us din ka time (ya full day)
          const days = leaveDayBreakdown(l).filter(d => d.date >= from && d.date <= to);
          const sameLabel = days.length > 0 && days.every(d => d.label === days[0].label);
          const dateText = days.length === 1
            ? fmtDate(days[0].date, { weekday: 'short' })
            : `${fmtDate(days[0]?.date || from)} – ${fmtDate(days[days.length - 1]?.date || to)}`;
          return (
            <li key={l._id}>
              <div className="leave-overlap-who">
                <strong>{l.user?.name || 'Staff'}</strong>
                {l.user?.role && <span className="leave-role-tag">{ROLE_LABEL[l.user.role] || l.user.role}</span>}
                {l.status === 'Pending' && <span className="leave-status-tag pending">Pending</span>}
              </div>
              <div className="leave-overlap-when">
                {sameLabel
                  ? `${dateText} · ${days[0].label}`
                  : days.map(d => `${fmtDate(d.date, { weekday: 'short' })}: ${d.label}`).join(' · ')}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const Leaves = () => {
  const { can } = usePermissions();
  const perm = (action) => can('leaves:' + action);

  const todayIso = formatDateToISO(new Date());
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperadmin = currentUser.role === 'superadmin';

  const [loading, setLoading] = useState(true);
  const [myLeaves, setMyLeaves] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [canApprove, setCanApprove] = useState(false);
  const [requestFilter, setRequestFilter] = useState('Pending');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [savingLeave, setSavingLeave] = useState(false);
  const [viewLeave, setViewLeave] = useState(null);
  // Chuni hui dates pe aur kaun leave pe hai (apply form) / is request ki dates pe (View popup)
  const [formOverlaps, setFormOverlaps] = useState([]);
  const [viewOverlaps, setViewOverlaps] = useState([]);
  const emptyLeave = () => ({
    leaveType: 'Casual',
    startDate: todayIso,
    endDate: todayIso,
    // date -> { enabled, fromTime, toTime }. Jis din enabled nahi wo pure din ki leave.
    dayTimes: {},
    reason: ''
  });
  const [leaveData, setLeaveData] = useState(emptyLeave());

  const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/leaves`, authHeader());
      setMyLeaves(res.data?.myLeaves || []);
      setLeaveRequests(res.data?.requests || []);
      setCanApprove(!!res.data?.canApprove);
    } catch (err) {
      console.error('Error fetching leaves', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverlaps = async (start, end, exclude) => {
    const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/leaves/overlap`, {
      ...authHeader(),
      params: { start, end, ...(exclude ? { exclude } : {}) }
    });
    return Array.isArray(res.data) ? res.data : [];
  };

  // Form me dates badalte hi check karo (purana jawab baad me aaye to ignore)
  useEffect(() => {
    if (!showLeaveModal || !leaveData.startDate) {
      setFormOverlaps([]);
      return;
    }
    let active = true;
    fetchOverlaps(leaveData.startDate, leaveData.endDate || leaveData.startDate)
      .then(list => { if (active) setFormOverlaps(list); })
      .catch(() => { if (active) setFormOverlaps([]); });
    return () => { active = false; };
  }, [showLeaveModal, leaveData.startDate, leaveData.endDate]);

  useEffect(() => {
    if (!viewLeave) {
      setViewOverlaps([]);
      return;
    }
    let active = true;
    fetchOverlaps(viewLeave.startDate, viewLeave.endDate, viewLeave._id)
      .then(list => { if (active) setViewOverlaps(list); })
      .catch(() => { if (active) setViewOverlaps([]); });
    return () => { active = false; };
  }, [viewLeave]);

  const rangeDates = getDatesInRange(leaveData.startDate, leaveData.endDate);
  const getDayTime = (date) => leaveData.dayTimes[date] || { enabled: false, fromTime: '', toTime: '' };
  const setDayTime = (date, changes) => setLeaveData(prev => ({
    ...prev,
    dayTimes: { ...prev.dayTimes, [date]: { ...(prev.dayTimes[date] || { enabled: false, fromTime: '', toTime: '' }), ...changes } }
  }));
  const dayTimeError = (date) => {
    const t = getDayTime(date);
    if (!t.enabled) return '';
    const from = timeToMinutes(t.fromTime);
    const to = timeToMinutes(t.toTime);
    if (from === null || to === null) return 'Select both From and To time';
    if (to <= from) return 'To time must be after From time';
    return '';
  };
  // Range ke andar wale enabled din, backend ke format me
  const enabledDayTimes = rangeDates
    .filter(date => getDayTime(date).enabled)
    .map(date => ({ date, fromTime: getDayTime(date).fromTime, toTime: getDayTime(date).toTime }));

  // Pehle din ka time saare dino pe laga do
  const applyFirstTimeToAll = () => {
    const first = getDayTime(rangeDates[0]);
    setLeaveData(prev => {
      const dayTimes = { ...prev.dayTimes };
      rangeDates.forEach(date => { dayTimes[date] = { ...first }; });
      return { ...prev, dayTimes };
    });
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!leaveData.startDate) {
      alert('Please select a start date.');
      return;
    }
    const badDate = rangeDates.find(date => dayTimeError(date));
    if (badDate) {
      alert(`${fmtDate(badDate)}: ${dayTimeError(badDate)}.`);
      return;
    }
    try {
      setSavingLeave(true);
      const submitData = {
        leaveType: leaveData.leaveType,
        startDate: leaveData.startDate,
        endDate: leaveData.endDate || leaveData.startDate,
        dayTimes: enabledDayTimes,
        reason: leaveData.reason
      };
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/leaves`, submitData, authHeader());
      setShowLeaveModal(false);
      fetchLeaves();
      if (!isSuperadmin) alert(res.data?.message || 'Leave request sent for approval');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to apply leave');
    } finally {
      setSavingLeave(false);
    }
  };

  const updateLeaveStatus = async (id, status) => {
    let note = '';
    if (status === 'Rejected') {
      const input = window.prompt('Reason for rejection (optional):', '');
      if (input === null) return false;
      note = input;
    }
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/leaves/${id}/status`, { status, note }, authHeader());
      fetchLeaves();
      return true;
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update leave');
      return false;
    }
  };

  const deleteLeave = async (id) => {
    if (!window.confirm('Are you sure you want to delete this leave?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/leaves/${id}`, authHeader());
      fetchLeaves();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete leave');
    }
  };

  const filteredRequests = requestFilter === 'All'
    ? leaveRequests
    : leaveRequests.filter(l => l.status === requestFilter);
  const countBy = (list, status) => list.filter(l => l.status === status).length;
  const statsSource = canApprove ? leaveRequests : myLeaves;

  return (
    <div className="holidays-events-container leaves-page">
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <h2>Leave Management</h2>
        {perm('apply') && (
          <button
            type="button"
            className="crm-btn leave-apply-btn"
            onClick={() => {
              setLeaveData(emptyLeave());
              setShowLeaveModal(true);
            }}
          >
            <PlusIcon size={16} /> {isSuperadmin ? 'Add Leave' : 'Apply Leave'}
          </button>
        )}
      </div>

      <div className="leave-stats-row">
        <div className="leave-stat-card pending">
          <span className="leave-stat-value">{countBy(statsSource, 'Pending')}</span>
          <span className="leave-stat-label">{canApprove ? 'Pending Requests' : 'My Pending'}</span>
        </div>
        <div className="leave-stat-card approved">
          <span className="leave-stat-value">{countBy(statsSource, 'Approved')}</span>
          <span className="leave-stat-label">Approved</span>
        </div>
        <div className="leave-stat-card rejected">
          <span className="leave-stat-value">{countBy(statsSource, 'Rejected')}</span>
          <span className="leave-stat-label">Rejected</span>
        </div>
      </div>

      {loading ? (
        <div className="global-loader-container"><div className="global-spinner"></div><div>Loading leaves...</div></div>
      ) : (
        <div className={`leaves-layout ${canApprove ? 'two-col' : ''}`}>
          {/* Team ki leave requests (jinko approve ki permission hai) */}
          {canApprove && (
            <div className="events-card leave-card">
              <div className="upcoming-card-header">
                <h3 className="upcoming-card-title">
                  <UserIcon size={16} color="#7c3aed" /> Leave Requests
                </h3>
                <span className="leave-count-badge">{countBy(leaveRequests, 'Pending')} Pending</span>
              </div>
              <div className="leave-filter-tabs">
                {['Pending', 'Approved', 'Rejected', 'All'].map(f => (
                  <button
                    key={f}
                    type="button"
                    className={`leave-filter-tab ${requestFilter === f ? 'active' : ''}`}
                    onClick={() => setRequestFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="upcoming-holidays-list">
                {filteredRequests.length === 0 ? (
                  <p className="leave-empty-text">No {requestFilter === 'All' ? '' : requestFilter.toLowerCase()} leave requests.</p>
                ) : (
                  filteredRequests.map(l => (
                    <div key={l._id} className="leave-request-row">
                      <div className="leave-row-text">
                        <div className="leave-row-name-line">
                          <span className="leave-row-name">{l.user?.name || 'Staff'}</span>
                          {l.user?.role && <span className="leave-role-tag">{l.user.role}</span>}
                          <span className={`leave-status-tag ${l.status.toLowerCase()}`}>{l.status}</span>
                        </div>
                        <span className="leave-row-sub">
                          {l.leaveType} Leave · {formatLeaveRange(l, true)} · {formatLeaveDuration(l)}
                        </span>
                        {l.reason && <span className="leave-row-reason">{l.reason}</span>}
                        {l.status !== 'Pending' && l.actionBy?.name && (
                          <span className="leave-row-sub">
                            {l.status} by {l.actionBy.name}{l.actionNote ? ` · ${l.actionNote}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="leave-row-actions">
                        <button type="button" className="leave-action-btn view" onClick={() => setViewLeave(l)} title="View Leave">
                          <EyeIcon size={14} /> View
                        </button>
                        {l.status !== 'Approved' && (
                          <button type="button" className="leave-action-btn approve" onClick={() => updateLeaveStatus(l._id, 'Approved')}>
                            Approve
                          </button>
                        )}
                        {l.status !== 'Rejected' && (
                          <button type="button" className="leave-action-btn reject" onClick={() => updateLeaveStatus(l._id, 'Rejected')}>
                            Reject
                          </button>
                        )}
                        <button type="button" className="btn-delete-holiday leave-delete-btn" onClick={() => deleteLeave(l._id)} title="Delete Leave">
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Meri leaves */}
          <div className="events-card leave-card">
            <div className="upcoming-card-header">
              <h3 className="upcoming-card-title">
                <CalendarIcon size={16} color="#7c3aed" /> My Leaves
              </h3>
              <span className="leave-count-badge">{myLeaves.length}</span>
            </div>
            <div className="upcoming-holidays-list">
              {myLeaves.length === 0 ? (
                <p className="leave-empty-text">You have not applied for any leave yet.</p>
              ) : (
                myLeaves.map(l => (
                  <div key={l._id} className="leave-request-row">
                    <div className="leave-row-text">
                      <div className="leave-row-name-line">
                        <span className="leave-row-name">{l.leaveType} Leave</span>
                        <span className={`leave-status-tag ${l.status.toLowerCase()}`}>{l.status}</span>
                      </div>
                      <span className="leave-row-sub">
                        {formatLeaveRange(l, true)} · {formatLeaveDuration(l)}
                      </span>
                      {l.reason && <span className="leave-row-reason">{l.reason}</span>}
                      {l.status !== 'Pending' && l.actionBy?.name && !isSuperadmin && (
                        <span className="leave-row-sub">
                          {l.status} by {l.actionBy.name}{l.actionNote ? ` · ${l.actionNote}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="leave-row-actions">
                      <button type="button" className="leave-action-btn view" onClick={() => setViewLeave(l)} title="View Leave">
                        <EyeIcon size={14} /> View
                      </button>
                      {(l.status === 'Pending' || isSuperadmin) && (
                        <button type="button" className="btn-delete-holiday leave-delete-btn" onClick={() => deleteLeave(l._id)} title="Delete Leave">
                          <TrashIcon size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Leave Modal: kis din kis time ki leave hai */}
      {viewLeave && (() => {
        const l = viewLeave;
        const isOwn = String(l.user?._id || l.user) === String(currentUser.userId || currentUser._id || currentUser.id);
        const days = leaveDayBreakdown(l);
        return (
          <div className="crm-modal-overlay">
            <div className="holiday-modal-card">
              <div className="crm-modal-header">
                <div className="modal-header-left">
                  <div className="modal-icon-badge leave-icon-badge">
                    <EyeIcon size={20} />
                  </div>
                  <div>
                    <h3 className="crm-modal-title">{l.user?.name || 'Staff'} - {l.leaveType} Leave</h3>
                    <p className="crm-modal-subtitle">{formatLeaveRange(l, true)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="crm-modal-close-btn"
                  onClick={() => setViewLeave(null)}
                  title="Close"
                >
                  <XIcon size={18} />
                </button>
              </div>

              <div className="holiday-modal-form">
                <div className="leave-view-summary">
                  <div className="leave-view-item">
                    <span className="leave-view-label">Status</span>
                    <span className={`leave-status-tag ${l.status.toLowerCase()}`}>{l.status}</span>
                  </div>
                  <div className="leave-view-item">
                    <span className="leave-view-label">Total</span>
                    <span className="leave-view-value">{formatLeaveDuration(l)}</span>
                  </div>
                  {l.user?.role && (
                    <div className="leave-view-item">
                      <span className="leave-view-label">Role</span>
                      <span className="leave-view-value" style={{ textTransform: 'capitalize' }}>{l.user.role}</span>
                    </div>
                  )}
                  <div className="leave-view-item">
                    <span className="leave-view-label">Applied On</span>
                    <span className="leave-view-value">
                      {new Date(l.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <OverlapNote
                  leaves={viewOverlaps}
                  start={l.startDate}
                  end={l.endDate}
                  title={`Also on leave on these dates (${viewOverlaps.length})`}
                />

                <label className="holiday-form-label">Day-wise Leave Time</label>
                <div className="leave-view-days">
                  {days.map(d => (
                    <div key={d.date} className="leave-view-day-row">
                      <span className="leave-view-day-date">{fmtDate(d.date, { weekday: 'short', year: 'numeric' })}</span>
                      <span className={`leave-unavailable-chip ${d.label === 'Full day' ? 'full' : 'partial'}`}>
                        {d.label}
                      </span>
                    </div>
                  ))}
                </div>

                {l.reason && (
                  <div className="leave-view-block">
                    <span className="leave-view-label">Reason</span>
                    <p className="leave-view-text">{l.reason}</p>
                  </div>
                )}

                {l.status !== 'Pending' && l.actionBy?.name && (
                  <div className="leave-view-block">
                    <span className="leave-view-label">{l.status} By</span>
                    <p className="leave-view-text">
                      {l.actionBy.name}
                      {l.actionAt ? ` on ${new Date(l.actionAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                      {l.actionNote ? ` · ${l.actionNote}` : ''}
                    </p>
                  </div>
                )}

                <div className="holiday-modal-footer">
                  <button type="button" className="holiday-btn-cancel" onClick={() => setViewLeave(null)}>
                    Close
                  </button>
                  {canApprove && !isOwn && l.status !== 'Rejected' && (
                    <button
                      type="button"
                      className="leave-action-btn reject leave-view-footer-btn"
                      onClick={async () => { if (await updateLeaveStatus(l._id, 'Rejected')) setViewLeave(null); }}
                    >
                      Reject
                    </button>
                  )}
                  {canApprove && !isOwn && l.status !== 'Approved' && (
                    <button
                      type="button"
                      className="leave-action-btn approve leave-view-footer-btn"
                      onClick={async () => { if (await updateLeaveStatus(l._id, 'Approved')) setViewLeave(null); }}
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Apply Leave Modal */}
      {showLeaveModal && (
        <div className="crm-modal-overlay">
          <div className="holiday-modal-card">
            <div className="crm-modal-header">
              <div className="modal-header-left">
                <div className="modal-icon-badge leave-icon-badge">
                  <UserIcon size={20} />
                </div>
                <div>
                  <h3 className="crm-modal-title">{isSuperadmin ? 'Add Leave' : 'Apply Leave'}</h3>
                  <p className="crm-modal-subtitle">
                    {isSuperadmin ? 'Leave will show on the calendar right away' : 'Leave will show on the calendar once approved'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="crm-modal-close-btn"
                onClick={() => setShowLeaveModal(false)}
                title="Close modal"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="holiday-modal-form">
              <div className="holiday-form-group">
                <label className="holiday-form-label">
                  Leave Type <span className="required-star">*</span>
                </label>
                <CustomSelect
                  value={leaveData.leaveType}
                  onChange={(val) => setLeaveData(prev => ({ ...prev, leaveType: val }))}
                  options={LEAVE_TYPES.map(t => ({ value: t, label: `${t} Leave` }))}
                />
              </div>

              <div className="holiday-dates-row">
                <div className="holiday-form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="holiday-form-label">
                    Start Date <span className="required-star">*</span>
                  </label>
                  <CalendarPicker
                    className="holiday-cal-picker"
                    selectedDate={leaveData.startDate}
                    onChange={(val) => {
                      setLeaveData(prev => ({
                        ...prev,
                        startDate: val,
                        endDate: !prev.endDate || prev.endDate < val ? val : prev.endDate
                      }));
                    }}
                    placeholder="Select Start Date"
                    showPresets={false}
                    allowClear={false}
                    enableYearMonthDropdown={true}
                  />
                </div>

                <div className="holiday-form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="holiday-form-label">
                    End Date <span className="required-star">*</span>
                  </label>
                  <CalendarPicker
                    className="holiday-cal-picker"
                    selectedDate={leaveData.endDate}
                    onChange={(val) => setLeaveData(prev => ({ ...prev, endDate: val }))}
                    placeholder="Select End Date"
                    showPresets={false}
                    allowClear={false}
                    minDate={leaveData.startDate || undefined}
                    enableYearMonthDropdown={true}
                  />
                </div>
              </div>

              <div className="holiday-form-group">
                <div className="leave-days-header">
                  <label className="holiday-form-label" style={{ marginBottom: 0 }}>Time per day (optional)</label>
                  {rangeDates.length > 1 && getDayTime(rangeDates[0]).enabled && !dayTimeError(rangeDates[0]) && (
                    <button type="button" className="leave-apply-all-btn" onClick={applyFirstTimeToAll}>
                      Apply {fmtDate(rangeDates[0])} time to all days
                    </button>
                  )}
                </div>
                <p className="leave-days-hint">Turn on a day to set a specific time. Days left off are full-day leave.</p>
                <div className="leave-days-list">
                  {rangeDates.map(date => {
                    const t = getDayTime(date);
                    const error = dayTimeError(date);
                    return (
                      <div key={date} className={`leave-day-row ${t.enabled ? 'enabled' : ''}`}>
                        <div className="leave-day-top">
                          <div className="leave-day-info">
                            <span className="leave-day-date">{fmtDate(date, { weekday: 'short' })}</span>
                            <span className="leave-day-status">{t.enabled ? 'Specific time' : 'Full day'}</span>
                          </div>
                          <label className="modern-switch">
                            <input
                              type="checkbox"
                              checked={t.enabled}
                              onChange={(e) => setDayTime(date, { enabled: e.target.checked })}
                            />
                            <span className="modern-slider switch-blue"></span>
                          </label>
                        </div>
                        {t.enabled && (
                          <div className="leave-day-times">
                            <CustomTimePicker
                              value={t.fromTime}
                              onChange={(val) => setDayTime(date, { fromTime: val })}
                              placeholder="From"
                            />
                            <span className="leave-day-to">to</span>
                            <CustomTimePicker
                              value={t.toTime}
                              onChange={(val) => setDayTime(date, { toTime: val })}
                              placeholder="To"
                            />
                          </div>
                        )}
                        {t.enabled && error && t.fromTime && t.toTime && (
                          <span className="leave-day-error">{error}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {leaveData.startDate && leaveData.endDate && (
                <p className="leave-duration-summary">
                  Total: {formatLeaveDuration({
                    startDate: leaveData.startDate,
                    endDate: leaveData.endDate,
                    dayTimes: enabledDayTimes.filter(d => !dayTimeError(d.date))
                  })}
                </p>
              )}

              <OverlapNote
                leaves={formOverlaps}
                start={leaveData.startDate}
                end={leaveData.endDate || leaveData.startDate}
                title={`Already on leave on ${leaveData.startDate === (leaveData.endDate || leaveData.startDate) ? 'this date' : 'these dates'} (${formOverlaps.length})`}
              />

              <div className="holiday-form-group">
                <label className="holiday-form-label">Reason</label>
                <textarea
                  value={leaveData.reason}
                  onChange={(e) => setLeaveData(prev => ({ ...prev, reason: e.target.value }))}
                  className="holiday-input leave-reason-input"
                  placeholder="e.g. Family function, not feeling well"
                  rows={3}
                />
              </div>

              <div className="holiday-modal-footer">
                <button
                  type="button"
                  className="holiday-btn-cancel"
                  onClick={() => setShowLeaveModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="holiday-btn-submit"
                  disabled={!leaveData.startDate || savingLeave}
                >
                  <PlusIcon size={16} /> {isSuperadmin ? 'Add Leave' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaves;
