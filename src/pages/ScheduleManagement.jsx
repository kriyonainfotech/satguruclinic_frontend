import React, { useState, useEffect } from 'react';
import FullCalendar from '../components/FullCalendar';
import CustomSelect from '../components/CustomSelect';
import { CalendarIcon, UsersIcon, ClipboardListIcon, VideoIcon, PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
import axios from 'axios';
import './ScheduleManagement.css';

const ScheduleManagement = () => {
  
  const [activeTab, setActiveTab] = useState('all');
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isSynced, setIsSynced] = useState(false);
  const [events, setEvents] = useState([]);
    const filteredEvents = events.filter(ev => { 
    if(activeTab === 'all') return true;
    if(activeTab === 'meetings') return ev.summary?.includes('[Meeting]') || (!ev.summary?.includes('[Task]') && !ev.summary?.includes('[Event]')); 
    if(activeTab === 'tasks') return ev.summary?.includes('[Task]'); 
    if(activeTab === 'events') return ev.summary?.includes('[Event]'); 
    return true; 
});
  const [loading, setLoading] = useState(true);
    const [selectedDateView, setSelectedDateView] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
    const detailsRef = React.useRef(null);
    const [editEventId, setEditEventId] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  const fetchSyncStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/calendar/sync-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsSynced(res.data.isSynced);
      if (res.data.isSynced) {
        fetchEvents();
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/calendar/events?_t=${new Date().getTime()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    
    // Check if we just returned from OAuth success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('sync') === 'success') {
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchSyncStatus();
    }
  }, []);

  
  const handleDisconnectClick = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Calendar?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/calendar/disconnect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsSynced(false);
      setEvents([]);
    } catch (err) {
      alert('Error disconnecting Google Calendar');
    }
  };

  const handleSyncClick = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/calendar/auth/google`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.href = res.data.url;
    } catch (err) {
      alert('Error initiating Google Sync');
    }
  };

  
    const handleDeleteEvent = async (id) => {
        if (!window.confirm('Are you sure you want to delete this event?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/calendar/events/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            fetchEvents();
        } catch(err) {
            alert('Error deleting event');
        }
    };
    
    const handleEditEvent = (ev) => {
        setEditEventId(ev.id);
        setTitle(ev.summary ? ev.summary.replace(/\[(Meeting|Task|Event)\]\s*/, '') : '');
        setEventDate(selectedDateView);
        if(ev.start?.dateTime) {
            setStartTime(new Date(ev.start.dateTime).toTimeString().substring(0, 5));
            setEndTime(ev.end?.dateTime ? new Date(ev.end.dateTime).toTimeString().substring(0, 5) : '10:00');
        } else {
            setStartTime('09:00');
            setEndTime('10:00');
        }
        
        let tab = 'meetings';
        if(ev.summary?.includes('[Task]')) tab = 'tasks';
        if(ev.summary?.includes('[Event]')) tab = 'events';
        setActiveTab(tab);
        
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !eventDate || (activeTab !== 'tasks' && (!startTime || !endTime))) {
        alert('Please fill required fields');
        return;
    }
    try {
      const token = localStorage.getItem('token');
      const typeMap = { all: 'Meeting', meetings: 'Meeting', tasks: 'Task', events: 'Event' };
              const payload = {
            summary: `[${typeMap[activeTab]}] ${title}`,
            description,
            startDateTime: new Date(`${eventDate}T${startTime}`).toISOString(),
            endDateTime: new Date(`${eventDate}T${endTime}`).toISOString(),
            type: typeMap[activeTab]
        };
        if (editEventId) {
            await axios.put(`${import.meta.env.VITE_API_BASE_URL}/calendar/events/${editEventId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        } else {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/calendar/events`, payload, { headers: { Authorization: `Bearer ${token}` } });
        }
      setShowModal(false);
      setEditEventId(null);
      setTitle('');
      setDescription('');
      setEventDate('');
      setStartTime('09:00');
      setEndTime('10:00');
      fetchEvents();
    } catch (err) {
      alert('Error saving to Calendar: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="schedule-management-container page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Schedule Management</h1>
        
        </div>
        <div className="header-actions">
          {!isSynced ? (
            <button className="crm-btn crm-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleSyncClick}>
              <CalendarIcon size={16} />
              <span>Sync Google Calendar</span>
            </button>
          ) : (
            <button className="crm-btn crm-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', borderColor: '#ef4444', backgroundColor: '#fef2f2' }} onClick={handleDisconnectClick}>
              <CalendarIcon size={16} />
              <span>Disconnect Google Calendar</span>
            </button>
          )}
          <button className="crm-btn crm-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setEditEventId(null); setTitle(''); setEventDate(''); setShowModal(true); }}>
            <PlusIcon size={16} />
            <span>Add New {(activeTab === 'meetings' || activeTab === 'all') ? 'Meeting' : activeTab === 'tasks' ? 'Task' : 'Event'}</span>
          </button>
        </div>
      </div>

      <div className="crm-card">
        <div className="crm-card-header" style={{ padding: '16px 24px', borderBottom: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '150px' }}>
              <CustomSelect 
                value={currentMonth}
                onChange={(val) => setCurrentMonth(val)}
                options={[
                  { value: 0, label: 'January' }, { value: 1, label: 'February' }, { value: 2, label: 'March' },
                  { value: 3, label: 'April' }, { value: 4, label: 'May' }, { value: 5, label: 'June' },
                  { value: 6, label: 'July' }, { value: 7, label: 'August' }, { value: 8, label: 'September' },
                  { value: 9, label: 'October' }, { value: 10, label: 'November' }, { value: 11, label: 'December' }
                ]}
              />
            </div>
            <div style={{ width: '100px' }}>
              <CustomSelect 
                value={currentYear}
                onChange={(val) => setCurrentYear(val)}
                options={Array.from({length: 11}, (_, i) => { const year = new Date().getFullYear() - 5 + i; return { value: year, label: year.toString() }; })}
              />
            </div>
          </div>

          <div className="schedule-custom-tabs" style={{ width: 'auto' }}>
            <button className={`sch-tab ${activeTab === 'all' ? 'sch-tab-active' : ''}`} onClick={() => setActiveTab('all')}>
              All
            </button>
            <button className={`sch-tab ${activeTab === 'meetings' ? 'sch-tab-active' : ''}`} onClick={() => setActiveTab('meetings')}>
              <VideoIcon size={16} /> Meetings
            </button>
            <button className={`sch-tab ${activeTab === 'tasks' ? 'sch-tab-active' : ''}`} onClick={() => setActiveTab('tasks')}>
              <ClipboardListIcon size={16} /> Tasks
            </button>
            <button className={`sch-tab ${activeTab === 'events' ? 'sch-tab-active' : ''}`} onClick={() => setActiveTab('events')}>
              <UsersIcon size={16} /> Events
            </button>
          </div>
        </div>
        
        
        <div className="crm-card-body" style={{ padding: '24px' }}>
          {!isSynced && (
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
               <div style={{ color: '#ef4444', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', padding: '6px 12px', borderRadius: '4px', border: '1px solid #fee2e2' }}>
                  <CalendarIcon size={16} /> 
                  Google Calendar Not Connected
               </div>
            </div>
          )}
          <FullCalendar
            events={filteredEvents}
              onDateClick={(date) => {
                setSelectedDateView(date);
                setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
              }}
              selectedDate={selectedDateView}
            currentMonth={currentMonth}
              currentYear={currentYear}
          />

          {selectedDateView && (
            <div ref={detailsRef} style={{ marginTop: '24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
              <h3 className="schedule-bottom-title" style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '16px' }}>Schedule for {new Date(selectedDateView).toLocaleDateString()}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredEvents.filter(ev => {
                  const evStart = ev.start?.dateTime || ev.start?.date;
                  return evStart && evStart.startsWith(selectedDateView);
                }).map((ev, idx) => {
                  const isNative = !ev.summary?.includes('[Meeting]') && !ev.summary?.includes('[Task]') && !ev.summary?.includes('[Event]');
                  return (
                  <div key={idx} onClick={() => { setSelectedEvent(ev); setShowDetailModal(true); }} className="schedule-list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                    <div>
                      <div className="schedule-list-item-title" style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
    {ev.summary ? ev.summary.replace(/\[(Meeting|Task|Event)\]\s*/, '') : '(No Title)'}
    {isNative && <span style={{ background: '#4285f4', color: 'white', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', title: 'From Google Calendar' }}>G</span>}
</div>
                      <div className="schedule-list-item-subtitle" style={{ fontSize: '13px', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' }}>
                         <span style={{ padding: '2px 8px', background: ev.summary?.includes('[Task]') ? '#fef3c7' : ev.summary?.includes('[Event]') ? '#f3e8ff' : '#dbeafe', color: ev.summary?.includes('[Task]') ? '#92400e' : ev.summary?.includes('[Event]') ? '#6b21a8' : '#1e40af', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                            {ev.summary?.includes('[Task]') ? 'Task' : ev.summary?.includes('[Event]') ? 'Event' : 'Meeting'}
                         </span>
                         {ev.start?.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'All Day'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                       <button className="sch-action-btn" onClick={(e) => { e.stopPropagation(); handleEditEvent(ev); }} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}><EditIcon size={14} /> <span className="action-text">Edit</span></button>
                       <button className="sch-action-btn" onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id); }} style={{ padding: '6px 12px', background: '#fee2e2', border: '1px solid #f87171', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}><TrashIcon size={14} /> <span className="action-text">Delete</span></button>
                    </div>
                  </div>); })}
                {filteredEvents.filter(ev => {
                  const evStart = ev.start?.dateTime || ev.start?.date;
                  return evStart && evStart.startsWith(selectedDateView);
                }).length === 0 && <div style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>No schedule for this date.</div>}
              </div>
            </div>
          )}

        </div>

      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
              <h2 style={{ color: '#0f172a', margin: 0 }}>Add New {(activeTab === 'meetings' || activeTab === 'all') ? 'Meeting' : activeTab === 'tasks' ? 'Task' : 'Event'}</h2>
              <button type="button" className="close-btn" style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }} onClick={() => { setShowModal(false); setEditEventId(null); }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Title</label>
                <input type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} placeholder="E.g. Team Meeting" required />
              </div>
              
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Date</label>
                <input type="date" className="form-control" value={eventDate} onChange={e => setEventDate(e.target.value)} required />
              </div>

              {activeTab !== 'tasks' && (
              <div className="form-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Start Time</label>
                    <input type="time" className="form-control" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>End Time</label>
                    <input type="time" className="form-control" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                  </div>
              </div>
              )}

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea className="form-control" rows="3" value={description} onChange={e => setDescription(e.target.value)} placeholder="Add any details or video links here..."></textarea>
              </div>
              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button type="button" className="crm-btn crm-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="crm-btn crm-btn-primary">Save to Calendar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    
      {showDetailModal && selectedEvent && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
              <h2 style={{ color: '#0f172a', margin: 0 }}>Event Details</h2>
              <button type="button" className="close-btn" style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }} onClick={() => setShowDetailModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ display: 'block', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Title</strong>
                <div style={{ fontSize: '16px', color: '#0f172a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
    {selectedEvent.summary ? selectedEvent.summary.replace(/\[(Meeting|Task|Event)\]\s*/, '') : '(No Title)'}
    {(!selectedEvent.summary?.includes('[Meeting]') && !selectedEvent.summary?.includes('[Task]') && !selectedEvent.summary?.includes('[Event]')) && <span style={{ background: '#4285f4', color: 'white', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }} title="Synced directly from Google Calendar">G</span>}
</div>
              </div>
              
              <div style={{ display: 'flex', gap: '32px', marginBottom: '16px' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Date</strong>
                  <div style={{ fontSize: '15px', color: '#334155' }}>
                    {selectedEvent.start?.dateTime ? new Date(selectedEvent.start.dateTime).toLocaleDateString() : (selectedEvent.start?.date || 'N/A')}
                  </div>
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Time</strong>
                  <div style={{ fontSize: '15px', color: '#334155' }}>
                    {selectedEvent.start?.dateTime ? new Date(selectedEvent.start.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'All Day'}
                    {selectedEvent.end?.dateTime ? ' - ' + new Date(selectedEvent.end.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                  </div>
                </div>
              </div>

              {selectedEvent.description && (
                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ display: 'block', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Description</strong>
                  <div style={{ fontSize: '14px', color: '#475569', whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                    {selectedEvent.description}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button type="button" className="crm-btn crm-btn-outline" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ScheduleManagement;
