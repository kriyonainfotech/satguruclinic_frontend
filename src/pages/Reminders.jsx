import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import './Reminders.css';
import { InfoIcon, TrashIcon, PhoneIcon, MailIcon, UsersIcon } from '../components/Icons';
import CustomSelect from '../components/CustomSelect';
import Button from '../components/Button';
import CalendarPicker from '../components/CalendarPicker';
import CustomTimePicker from '../components/CustomTimePicker';

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const totalPages = Math.ceil(reminders.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReminders = reminders.slice(indexOfFirstItem, indexOfLastItem);

  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [selectedLeadForFollowup, setSelectedLeadForFollowup] = useState(null);
  const initialFollowupState = { type: 'Phone', date: moment().format('YYYY-MM-DD'), time: moment().format('HH:mm'), nextFollowUpDate: '', remarks: '' };
  const [followupData, setFollowupData] = useState(initialFollowupState);
  const navigate = useNavigate();

  const handleScheduleFollowup = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/leads/${selectedLeadForFollowup._id}/reminders`, followupData, { headers: { Authorization: `Bearer ${token}` } });
      setIsFollowupModalOpen(false);
      setFollowupData(initialFollowupState);
      setSelectedLeadForFollowup(null);
      fetchReminders();
    } catch (err) {
      console.error('Error scheduling followup:', err);
      alert('Failed to schedule followup');
    }
  };

  const openFollowupModal = (lead) => {
    setSelectedLeadForFollowup(lead);
    setFollowupData(initialFollowupState);
    setIsFollowupModalOpen(true);
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const API_URL = import.meta.env.VITE_API_BASE_URL;


  const fetchReminders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/leads/reminders/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter out duplicate leads
      const uniqueReminders = [];
      const leadIds = new Set();
      
      res.data.forEach(reminder => {
        if (reminder.lead && !leadIds.has(reminder.lead._id)) {
          leadIds.add(reminder.lead._id);
          uniqueReminders.push(reminder);
        }
      });
      
      setReminders(uniqueReminders);
    } catch (err) {
      console.error('Error fetching reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleInlineUpdate = async (id, status) => {
    try {
      await axios.put(`${API_URL}/leads/${id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReminders();
    } catch (err) {
      console.error('Error updating lead status:', err);
      alert('Failed to update status');
    }
  };

  const statusOptions = ['New', 'In Followup', 'Interested', 'Cold', 'Lost', 'Won'];
  const statusSelectOptions = statusOptions.map(opt => ({ label: opt, value: opt }));

  return (
    <div className="reminders-page">
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <h2>Today's Reminders</h2>
      </div>

      <div className="reminders-table-container">
        <table className="reminders-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Lead Info</th>
              <th>Task Type</th>
              <th>Assigned By</th>
              <th>Assigned To</th>
              <th>Current Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center' }}>Loading...</td></tr>
            ) : reminders.length > 0 ? (
              currentReminders.map((reminder, index) => {
                const lead = reminder.lead;
                if (!lead) return null;
                
                let TaskIcon = PhoneIcon;
                if (reminder.type === 'Email') TaskIcon = MailIcon;
                if (reminder.type === 'Meeting') TaskIcon = UsersIcon;
                if (reminder.type === 'WhatsApp') TaskIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>;

                return (
                  <tr key={reminder._id}>
                    <td data-label="#">{indexOfFirstItem + index + 1}</td>
                    <td data-label="LEAD INFO">
                        <div className="lead-info-cell">
                        <span 
                          className="lead-name" 
                          style={{ cursor: 'pointer', color: '#0f172a' }} 
                          onClick={() => navigate(`/leads/${lead._id}`)}
                        >
                          {lead.fullName}
                        </span>
                        <div className="lead-meta" style={{ color: '#0f172a', fontWeight: '500' }}>
                          <span style={{ color: '#64748b', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            {moment(reminder.date).format('DD/MM/YYYY')}
                            &nbsp;
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            {reminder.time}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>
                        <TaskIcon size={12} /> {reminder.type}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>
                        {lead.createdBy?.name || 'Admin'}
                      </span>
                    </td>
                    <td data-label="ASSIGNED TO">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {user.role === 'superadmin' && (
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Admin: {lead.adminId?.name || '-'}</span>
                          )}
                          <span style={{ fontSize: '13px', color: '#0f172a' }}>{lead.assignedTo?.name || '-'}</span>
                        </div>
                      </td>
                    <td data-label="STATUS">
                        <CustomSelect
                          options={statusSelectOptions} value={lead.status} onChange={(val) => handleInlineUpdate(lead._id, val)} style={{ width: '130px' }} />
                    </td>
                    <td>
                      <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                        <button className="icon-btn" title="Info">
                          <InfoIcon size={16} />
                        </button>
                        <button className="icon-btn" style={{ color: '#ef4444' }} title="Delete">
                          <TrashIcon size={16} />
                        </button>
                        <button className="btn-view-history" onClick={() => navigate(`/leads/${lead._id}`)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          View History
                          </button>

                          <button className="btn-followup" onClick={() => openFollowupModal(lead)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            Follow Up
                          </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>No Reminders for Today</td>
              </tr>
            )}
          </tbody>
        </table>

        {reminders.length > 0 && (
          <div className="pagination-container">
            <span className="pagination-info">Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, reminders.length)} of {reminders.length} reminders</span>
            <div className="pagination-controls">
              <button 
                className="page-btn" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                <button 
                  key={num} 
                  className={`page-num-btn ${currentPage === num ? 'active' : ''}`}
                  onClick={() => setCurrentPage(num)}
                >
                  {num}
                </button>
              ))}
              <button 
                className="page-btn" 
                disabled={currentPage === totalPages || totalPages === 0} 
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                &gt;
              </button>
            </div>
          </div>
        )}

        </div>

      {isFollowupModalOpen && selectedLeadForFollowup && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a' }}>Schedule Follow Up</h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Lead: <span style={{ color: '#0f172a', fontWeight: '600' }}>{selectedLeadForFollowup.fullName}</span></p>
              </div>
              <button className="icon-btn" onClick={() => setIsFollowupModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleScheduleFollowup}>
              <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>FOLLOW-UP TYPE</div>
              <div className="followup-types">
                {['Phone', 'Email', 'Meeting', 'WhatsApp'].map(type => (
                  <div 
                    key={type} 
                    className={`followup-type ${followupData.type === type ? 'active' : ''}`}
                    onClick={() => setFollowupData({...followupData, type})}
                  >
                    {type === 'Phone' && <PhoneIcon size={14} />}
                    {type === 'Email' && <MailIcon size={14} />}
                    {type === 'Meeting' && <UsersIcon size={14} />}
                    {type === 'WhatsApp' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>}
                    <span>{type}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label>DATE</label>
                  <CalendarPicker selectedDate={followupData.date} onChange={(val) => setFollowupData({ ...followupData, date: val })} placeholder="Select Date" />
                </div>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label>TIME</label>
                  <CustomTimePicker value={followupData.time} onChange={(val) => setFollowupData({ ...followupData, time: val })} placeholder="Select Time" />
                </div>
              </div>

              <div className="form-group">
                <label>NEXT FOLLOWUP DATE</label>
                <CalendarPicker selectedDate={followupData.nextFollowUpDate} onChange={(val) => setFollowupData({ ...followupData, nextFollowUpDate: val })} placeholder="Select Next Follow-up Date" />
              </div>

              <div className="form-group">
                <label>REMARKS</label>
                <textarea 
                  name="remarks" 
                  placeholder="Add important followup remarks..."
                  value={followupData.remarks} 
                  onChange={(e) => setFollowupData({...followupData, remarks: e.target.value})}
                ></textarea>
              </div>

              <Button variant="primary" type="submit" style={{ width: '100%', padding: '12px' }}>
                Schedule
              </Button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Reminders;





