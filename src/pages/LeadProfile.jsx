import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import './LeadProfile.css';
import { ChevronLeftIcon, PhoneIcon, MailIcon, UsersIcon, EditIcon, TrashIcon } from '../components/Icons';

const LeadProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingReminder, setEditingReminder] = useState(null);
  
  const handleDeleteReminder = async (remId) => {
    if (window.confirm('Delete this reminder?')) {
      try {
        await axios.delete(`${API_URL}/leads/reminders/${remId}`, { headers: { Authorization: `Bearer ${token}` } });
        setReminders(reminders.filter(r => r._id !== remId));
      } catch (err) {
        console.error(err);
      }
    }
  };
  
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`${API_URL}/leads/reminders/${editingReminder._id}`, editingReminder, { headers: { Authorization: `Bearer ${token}` } });
      setReminders(reminders.map(r => r._id === editingReminder._id ? { ...res.data, createdBy: r.createdBy } : r));
      setEditingReminder(null);
    } catch (err) {
      console.error(err);
    }
  };


  const token = localStorage.getItem('token');
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        setLoading(true);
        const [leadRes, remRes] = await Promise.all([
          axios.get(`${API_URL}/leads/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/leads/${id}/reminders`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setLead(leadRes.data);
        setReminders(remRes.data);
      } catch (err) {
        console.error('Error fetching lead profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeadData();
  }, [id, token, API_URL]);

  if (loading) return <div style={{ padding: '24px' }}>Loading...</div>;
  if (!lead) return <div style={{ padding: '24px' }}>Lead not found</div>;

  return (
    <div className="lead-profile-page">
      <div className="profile-header">
        <button className="icon-btn back-btn" onClick={() => navigate(-1)}>
          <ChevronLeftIcon size={18} />
        </button>
        <div>
          <h1>Lead Profile</h1>
          <p>#{lead._id.substring(lead._id.length - 6)}</p>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-sidebar">
          <div className="profile-card banner-card">
            <div className="banner-bg"></div>
            <div className="avatar-container">
              <div className="avatar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
            </div>
            <h2>{lead.fullName}</h2>
            <span className="status-badge">{lead.status}</span>
            <div className="quick-actions">
              <a href={`tel:${lead.mobile}`} className="btn-quick-call">
                <PhoneIcon size={14} /> Call
              </a>
              <a href={`https://wa.me/${lead.mobile.toString().replace(/[^0-9]/g, "").length === 10 ? "91" + lead.mobile.toString().replace(/[^0-9]/g, "") : lead.mobile.toString().replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="btn-quick-text">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                WhatsApp
                </a>
            </div>
          </div>

          <div className="profile-card info-card">
            <div className="info-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              INFORMATION
            </div>
            <div className="info-item">
              <div className="info-icon"><PhoneIcon size={14} /></div>
              <div className="info-content">
                <label>PHONE</label>
                <span>{lead.mobile}</span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-icon"><MailIcon size={14} /></div>
              <div className="info-content">
                <label>EMAIL</label>
                <span>{lead.email || '-'}</span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></div>
              <div className="info-content">
                <label>SOURCE</label>
                <span>{lead.source}</span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-icon"><UsersIcon size={14} /></div>
              <div className="info-content">
                <label>ASSIGNED TO</label>
                <span>{lead.assignedTo?.name || '-'}</span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-icon" style={{ color: '#ea580c' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
              <div className="info-content">
                <label style={{ color: '#ea580c' }}>NEXT FOLLOW-UP</label>
                <span style={{ color: '#ea580c' }}>{lead.nextFollowUp ? moment(lead.nextFollowUp).format('DD/MM/YYYY') : 'No Date'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-main">
          <div className="profile-card history-card">
            <div className="history-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: '600' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Activity History
              </div>
            </div>
            
            <div className="timeline-container">
              {reminders.length === 0 ? (
                <div style={{ padding: '20px', color: '#64748b' }}>No activity history found.</div>
              ) : (
                reminders.map((rem, i) => (
                  <div key={rem._id} className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <div className="timeline-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span className="timeline-type">{rem.type.toUpperCase()}</span>
                          <span className="timeline-date">{moment(rem.date).format('DD/MM/YYYY')} - {rem.time}</span>
                          <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px', fontWeight: '500' }}>By {rem.createdBy?.name || 'Admin'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="icon-btn" style={{ color: '#64748b', padding: '4px' }} onClick={() => setEditingReminder(rem)}><EditIcon size={14} /></button>
                          <button className="icon-btn" style={{ color: '#ef4444', padding: '4px' }} onClick={() => handleDeleteReminder(rem._id)}><TrashIcon size={14} /></button>
                        </div>
                      </div>
                      <div className="timeline-remarks">
                        {rem.remarks || 'No remarks added.'}
                      </div>
                      {rem.nextFollowUpDate && (
                        <div className="timeline-next-step">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                          Next step: {moment(rem.nextFollowUpDate).format('DD/MM/YYYY')}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      
      {editingReminder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#0f172a', margin: 0, fontSize: '20px' }}>Edit Reminder</h2>
              <button className="icon-btn" onClick={() => setEditingReminder(null)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Remarks</label>
                <textarea 
                  value={editingReminder.remarks || ''} 
                  onChange={(e) => setEditingReminder({...editingReminder, remarks: e.target.value})}
                  rows="3"
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>
              <div className="form-group">
                <label>Next Follow-Up Date</label>
                <input 
                  type="date" 
                  value={editingReminder.nextFollowUpDate ? moment(editingReminder.nextFollowUpDate).format('YYYY-MM-DD') : ''} 
                  onChange={(e) => setEditingReminder({...editingReminder, nextFollowUpDate: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setEditingReminder(null)} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  </div>
  );
};

export default LeadProfile;


