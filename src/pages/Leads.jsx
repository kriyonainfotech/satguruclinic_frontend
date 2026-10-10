import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import './Leads.css';
import Button from '../components/Button';
import CustomSelect from '../components/CustomSelect';
import CalendarPicker from '../components/CalendarPicker';
import CustomTimePicker from '../components/CustomTimePicker';
import { EditIcon, TrashIcon, UsersIcon, UserIcon, PhoneIcon, HeartPulseIcon, SparkleIcon, CheckCircleIcon, XIcon, MailIcon, CalendarIcon } from '../components/Icons';

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [selectedLeadForFollowup, setSelectedLeadForFollowup] = useState(null);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [todayBirthdayList, setTodayBirthdayList] = useState([]);

  const initialFormState = {
    date: moment().format('YYYY-MM-DD'),
    nextFollowUp: '',
    fullName: '',
    email: '',
    mobile: '',
    birthdate: '',
    status: 'New',
    source: 'Reference',
    assignedTo: ''
  };

  const initialFollowupState = {
    type: 'Phone',
    date: moment().format('YYYY-MM-DD'),
    nextFollowUp: '',
    time: moment().format('HH:mm'),
    nextFollowUpDate: '',
    remarks: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [followupData, setFollowupData] = useState(initialFollowupState);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/leads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeads(res.data);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    if (user.role === 'admin' || user.role === 'superadmin') {
      try {
        if (user.role === 'superadmin') {
          const adminRes = await axios.get(`${API_URL}/auth/users/admin`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setTeamMembers(adminRes.data);
        } else {
          const teamRes = await axios.get(`${API_URL}/auth/users/team`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setTeamMembers(teamRes.data);
        }
      } catch (err) {
        console.error('Error fetching team:', err);
      }
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchTeamMembers();
  }, []);

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'mobile') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleFollowupChange = (e) => {
    const { name, value } = e.target;
    setFollowupData({ ...followupData, [name]: value });
  };

  const openAddModal = () => {
    setEditingLeadId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  
  const handleMessageTodayBirthdays = () => {
    const today = moment().format('MM-DD');
    const bdays = leads.filter(lead => lead.birthdate && moment(lead.birthdate).format('MM-DD') === today);
    if (bdays.length === 0) {
      alert("No birthdays today.");
      return;
    }
    setTodayBirthdayList(bdays);
    setShowBirthdayModal(true);
  };

  const handleEdit = (lead) => {
    setEditingLeadId(lead._id);
    setFormData({
      date: lead.date ? moment(lead.date).format('YYYY-MM-DD') : moment(lead.date || lead.createdAt).format('YYYY-MM-DD'),
      nextFollowUp: lead.nextFollowUp ? moment(lead.nextFollowUp).format('YYYY-MM-DD') : '',
      fullName: lead.fullName || '',
      email: lead.email || '',
      mobile: lead.mobile || '',
        birthdate: lead.birthdate ? moment(lead.birthdate).format('YYYY-MM-DD') : '',
      status: lead.status || 'New',
      source: lead.source || 'Reference',
      assignedTo: lead.assignedTo?._id || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await axios.delete(`${API_URL}/leads/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchLeads();
      } catch (err) {
        console.error('Error deleting lead:', err);
        alert('Failed to delete lead');
      }
    }
  };

  const handleInlineUpdate = async (id, field, value) => {
    try {
      const payload = { [field]: value || null };
      await axios.put(`${API_URL}/leads/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchLeads();
    } catch (err) {
      console.error('Error updating lead:', err);
      alert('Failed to update lead');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.mobile.length !== 10) {
      alert('Mobile number must be exactly 10 digits');
      return;
    }
    try {
      const payload = { ...formData };
      if (!payload.nextFollowUp) { payload.nextFollowUp = null; }
        if (!payload.birthdate) { payload.birthdate = null; }
      if (!payload.assignedTo) {
        payload.assignedTo = null;
      }

      if (editingLeadId) {
        await axios.put(`${API_URL}/leads/${editingLeadId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/leads`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsModalOpen(false);
      setFormData(initialFormState);
      setEditingLeadId(null);
      fetchLeads();
    } catch (err) {
      console.error('Error saving lead:', err);
      alert('Failed to save lead');
    }
  };

  const handleScheduleFollowup = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/leads/${selectedLeadForFollowup._id}/reminders`, followupData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsFollowupModalOpen(false);
      setFollowupData(initialFollowupState);
      setSelectedLeadForFollowup(null);
      fetchLeads();
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

  // Metrics
  const metrics = {
    TOTAL: leads.length,
    NEW: leads.filter(l => l.status === 'New').length,
    IN_FOLLOWUP: leads.filter(l => l.status === 'In Followup').length,
    INTERESTED: leads.filter(l => l.status === 'Interested').length,
    COLD: leads.filter(l => l.status === 'Cold').length,
    WON: leads.filter(l => l.status === 'Won').length,
    LOST: leads.filter(l => l.status === 'Lost').length
  };

  // Filtering
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lead.mobile?.includes(searchTerm) || 
                          lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    
    let matchDate = true;
    if (dateFilter) {
      matchDate = moment(lead.date || lead.createdAt).format('YYYY-MM-DD') === dateFilter;
    }
    
    return matchesSearch && matchesStatus && matchDate;
  });

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLeads = filteredLeads.slice(indexOfFirstItem, indexOfLastItem);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter]);

  const statusOptions = ['New', 'In Followup', 'Interested', 'Cold', 'Lost', 'Won'];
  const sourceOptions = ['Reference', 'Instagram', 'WhatsApp', 'LinkedIn', 'Other'];
  
  const statusSelectOptions = statusOptions.map(opt => ({ label: opt, value: opt }));
  const sourceSelectOptions = sourceOptions.map(opt => ({ label: opt, value: opt }));
  const teamSelectOptions = teamMembers.map(m => ({ label: m.name + (m.role ? ` (${m.role})` : ''), value: m._id }));

  return (
    <div className="leads-page">
      <style>{`
        .custom-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        .custom-metric-card {
          background: white;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          width: 100%;
          box-sizing: border-box;
        }
        .custom-metric-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .custom-metric-icon svg {
          width: 16px;
          height: 16px;
        }
        .custom-metric-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }
        .custom-metric-value {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1;
        }
        .custom-metric-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.3px;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        @media (max-width: 992px) {
          .custom-metrics-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>

      <div className="page-header" style={{ marginBottom: '16px' }}>
        <h2>Leads</h2>
        <button onClick={openAddModal} className="crm-btn crm-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          + Add Lead
        </button>
      </div>

      <div className="custom-metrics-grid">
        <div className="custom-metric-card">
          <div className="custom-metric-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}><UsersIcon size={20} /></div>
          <div className="custom-metric-info">
            <span className="custom-metric-value">{metrics.TOTAL}</span>
            <span className="custom-metric-label">Total Leads</span>
          </div>
        </div>
        <div className="custom-metric-card">
          <div className="custom-metric-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><UserIcon size={20} /></div>
          <div className="custom-metric-info">
            <span className="custom-metric-value">{metrics.NEW}</span>
            <span className="custom-metric-label">New</span>
          </div>
        </div>
        <div className="custom-metric-card">
          <div className="custom-metric-icon" style={{ background: '#ffedd5', color: '#ea580c' }}><PhoneIcon size={14} /></div>
          <div className="custom-metric-info">
            <span className="custom-metric-value">{metrics.IN_FOLLOWUP}</span>
            <span className="custom-metric-label">In Followup</span>
          </div>
        </div>
        <div className="custom-metric-card">
          <div className="custom-metric-icon" style={{ background: '#dcfce7', color: '#16a34a' }}><HeartPulseIcon size={20} /></div>
          <div className="custom-metric-info">
            <span className="custom-metric-value">{metrics.INTERESTED}</span>
            <span className="custom-metric-label">Interested</span>
          </div>
        </div>
        <div className="custom-metric-card">
          <div className="custom-metric-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}><SparkleIcon size={20} /></div>
          <div className="custom-metric-info">
            <span className="custom-metric-value">{metrics.COLD}</span>
            <span className="custom-metric-label">Cold</span>
          </div>
        </div>
        <div className="custom-metric-card">
          <div className="custom-metric-icon" style={{ background: '#dcfce7', color: '#16a34a' }}><CheckCircleIcon size={20} /></div>
          <div className="custom-metric-info">
            <span className="custom-metric-value">{metrics.WON}</span>
            <span className="custom-metric-label">Won</span>
          </div>
        </div>
        <div className="custom-metric-card">
          <div className="custom-metric-icon" style={{ background: '#fce7f3', color: '#db2777' }}><XIcon size={20} /></div>
          <div className="custom-metric-info">
            <span className="custom-metric-value">{metrics.LOST}</span>
            <span className="custom-metric-label">Lost</span>
          </div>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filters-left" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Search leads by name, phone, or email..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <div style={{ width: '160px' }}>
              <CustomSelect 
                options={[{label: 'All Status', value: 'All'}, ...statusOptions.map(opt => ({label: opt, value: opt}))]}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
              />
            </div>

            <div style={{ width: '180px' }}>
              <CalendarPicker
                selectedDate={dateFilter}
                onChange={(val) => setDateFilter(val)}
                placeholder="Filter by Date"
              />
            </div>
          <button 
            type="button" 
            onClick={handleMessageTodayBirthdays} 
            className="btn-primary" 
            style={{ marginLeft: '10px', background: '#25d366', borderColor: '#25d366' }}
            title="Message Today's Birthdays"
          >
            <SparkleIcon size={14} /> Msg Today Birthdays
          </button>
          </div>
      </div>

      <div className="leads-table-container">
        <table className="leads-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Lead Info</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Assigned By</th>
              <th>Next Follow-Up</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center' }}>Loading...</td></tr>
            ) : currentLeads.length > 0 ? (
                currentLeads.map((lead, index) => (
                <tr key={lead._id}>
                  <td data-label="#">{index + 1}</td>
                  <td data-label="LEAD INFO">
                    <div className="lead-info-cell">
                      <span 
                        className="lead-name"
                        style={{ cursor: 'pointer', color: '#0f172a' }} 
                        onClick={() => { window.location.href = `/leads/${lead._id}` }}
                      >
                        {lead.fullName}
                      </span>
                      <div className="lead-meta">
                        <span><PhoneIcon size={14} /> {lead.mobile}</span>
                        {lead.email && <span><MailIcon size={14} /> {lead.email}</span>}
                      </div>
                      <span className="lead-source">{lead.source}</span>
                    </div>
                  </td>
                  <td data-label="STATUS">
                    <CustomSelect
                      options={statusSelectOptions}
                      value={lead.status}
                      onChange={(val) => handleInlineUpdate(lead._id, 'status', val)}
                      style={{ width: '130px' }}
                    />
                  </td>
                  <td data-label="ASSIGNED TO">
                    {(user.role === 'admin' || user.role === 'superadmin') ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <CustomSelect
                          options={teamSelectOptions}
                          value={(user.role === 'superadmin' ? lead.adminId?._id : lead.assignedTo?._id) || ''}
                          onChange={(val) => handleInlineUpdate(lead._id, 'assignedTo', val)}
                          placeholder="Assign..."
                          style={{ width: '150px' }}
                        />
                        {user.role === 'superadmin' && lead.assignedTo && lead.assignedTo._id !== lead.adminId?._id && (
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', paddingLeft: '4px' }}>
                            Team: {lead.assignedTo.name}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>
                        {lead.assignedTo?.name || '-'}
                      </span>
                    )}
                  </td>
                  <td data-label="ASSIGNED BY">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>{lead.createdBy?.name || 'System'}</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{moment(lead.date || lead.createdAt).format('DD/MM/YYYY')}</span>
                    </div>
                  </td>
                  <td data-label="NEXT FOLLOW-UP">
                    {lead.nextFollowUp ? (
                      <span style={{ color: '#ea580c', background: '#ffedd5', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
                        <CalendarIcon size={14} /> {moment(lead.nextFollowUp).format('DD/MM/YYYY')}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}><CalendarIcon size={14} /> No Date</span>
                    )}
                  </td>
                  <td data-label="ACTIONS">
                    <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                      <button className="icon-btn" onClick={() => handleEdit(lead)} title="Edit">
                        <EditIcon size={16} />
                      </button>
                      <button className="icon-btn" style={{ color: '#10b981' }} onClick={() => {
                          window.open(`https://wa.me/91${lead.mobile}`, '_blank');
                        }} title="Send WhatsApp Message">
                          <PhoneIcon size={16} />
                        </button>
                        <button className="icon-btn" style={{ color: '#ef4444' }} onClick={() => handleDelete(lead._id)} title="Delete">
                        <TrashIcon size={16} />
                      </button>
                      <button className="btn-followup" onClick={() => openFollowupModal(lead)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        Follow Up
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>No Leads Found</td>
              </tr>
            )}
          </tbody>
        </table>
          {filteredLeads.length > 0 && (
            <div className="pagination-container">
              <span className="pagination-info">Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredLeads.length)} of {filteredLeads.length} leads</span>
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

        


      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#0f172a', margin: 0, fontSize: '20px' }}>{editingLeadId ? 'Edit Lead' : 'Create New Lead'}</h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label>Date *</label>
                  <CalendarPicker selectedDate={formData.date} onChange={(val) => setFormData({ ...formData, date: val })} placeholder="Select Date" />
                </div>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label>Next Follow-Up Date</label>
                  <CalendarPicker selectedDate={formData.nextFollowUp} onChange={(val) => setFormData({ ...formData, nextFollowUp: val })} placeholder="Select Next Follow-Up Date" />
                </div>
              </div>
              <div className="form-group">
                <label>Full Name *</label>
                <input 
                  type="text" name="fullName" required 
                  value={formData.fullName} onChange={handleInputChange} 
                  placeholder="Enter full name"
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" name="email" 
                  value={formData.email} onChange={handleInputChange}
                  placeholder="Enter email"
                />
              </div>
              
              <div className="form-group">
                <label>Birth Date</label>
                <CalendarPicker selectedDate={formData.birthdate} onChange={(val) => setFormData({ ...formData, birthdate: val })} placeholder="Select Birth Date" />
              </div>
              <div className="form-group">
                <label>Mobile Number *</label>
                <input 
                  type="tel" name="mobile" required pattern="[0-9]{10}" maxLength="10"
                  title="Please enter a valid 10-digit mobile number"
                  value={formData.mobile} onChange={handleInputChange} 
                  placeholder="Enter 10-digit mobile number"
                />
              </div>
              
              <div className="form-group">
                <label>Status</label>
                <CustomSelect
                  options={statusSelectOptions}
                  value={formData.status}
                  onChange={(val) => setFormData({ ...formData, status: val })}
                />
              </div>
              <div className="form-group">
                <label>Source</label>
                <CustomSelect
                  options={sourceSelectOptions}
                  value={formData.source}
                  onChange={(val) => setFormData({ ...formData, source: val })}
                />
              </div>

              {(user.role === 'admin' || user.role === 'superadmin') && (
                <div className="form-group">
                  <label>Assign To</label>
                  <CustomSelect
                    options={teamSelectOptions}
                    value={formData.assignedTo}
                    onChange={(val) => setFormData({ ...formData, assignedTo: val })}
                    placeholder="-- Select Team Member --"
                  />
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button variant="primary" type="submit">{editingLeadId ? 'Update Lead' : 'Save Lead'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  onChange={handleFollowupChange}
                ></textarea>
              </div>

              <Button variant="primary" type="submit" style={{ width: '100%', padding: '12px' }}>
                Schedule
              </Button>
            </form>
          </div>
        </div>
      )}

      {showBirthdayModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#0f172a', margin: 0, fontSize: '20px' }}>Today's Birthdays</h2>
              <button className="icon-btn" onClick={() => setShowBirthdayModal(false)}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '400px', overflowY: 'auto' }}>
              {todayBirthdayList.map(lead => (
                <div key={lead._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{lead.fullName}</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{lead.mobile}</div>
                  </div>
                  <button 
                    className="btn-primary" 
                    style={{ background: '#25d366', borderColor: '#25d366', padding: '6px 12px', fontSize: '13px' }}
                    onClick={() => {
                      const message = encodeURIComponent(`Dear ${lead.fullName},\n\nWishing you a very Happy Birthday! \uD83C\uDF89\uD83C\uDF82\n\nOn your special day, we pray for your excellent health, boundless energy, and lifelong happiness. May this coming year bring you peace of mind and a fit, healthy body. \n\nWarmest regards,\nThe Team at Satguru Clinic \uD83C\uDFE5\u2728`);
                      window.open(`https://wa.me/91${lead.mobile}?text=${message}`, '_blank');
                    }}
                  >
                    <PhoneIcon size={14} style={{ marginRight: '4px' }} /> Send Wish
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;




