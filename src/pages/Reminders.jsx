import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import './Reminders.css';
import { InfoIcon, TrashIcon, PhoneIcon, MailIcon, UsersIcon } from '../components/Icons';
import CustomSelect from '../components/CustomSelect';

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
              reminders.map((reminder, index) => {
                const lead = reminder.lead;
                if (!lead) return null;
                
                let TaskIcon = PhoneIcon;
                if (reminder.type === 'Email') TaskIcon = MailIcon;
                if (reminder.type === 'Meeting') TaskIcon = UsersIcon;
                if (reminder.type === 'WhatsApp') TaskIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>;

                return (
                  <tr key={reminder._id}>
                    <td data-label="#">{index + 1}</td>
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
      </div>
    </div>
  );
};

export default Reminders;



