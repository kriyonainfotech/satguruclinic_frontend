import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import moment from 'moment';
import { 
  CalendarIcon, 
  UserIcon, 
  PhoneIcon, 
  EditIcon, 
  TrashIcon,
  SearchIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  XIcon,
  PlusIcon
} from '../components/Icons';
import './CallLogs.css';

// Enhanced searchable CustomSelect with modern styles
const CustomSelect = ({ options = [], value, onChange, placeholder = "Select...", searchable = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectRef = useRef(null);

  const selectedOption = options.find(o => o.value === value);

  const filteredOptions = searchable && search 
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase())) 
    : options;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="call-select-wrap" ref={selectRef}>
      <div 
        role="button"
        tabIndex={0}
        className="call-select-trigger"
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setIsOpen(!isOpen); setSearch(''); } }}
        style={{
          background: '#ffffff',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          border: '1px solid #cbd5e1',
          outline: 'none',
          boxShadow: 'none'
        }}
      >
        <span 
          className="call-select-label-text"
          style={{ color: selectedOption ? '#0f172a' : '#64748b' }}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg 
          width="15" 
          height="15" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#64748b" 
          strokeWidth="2.2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {isOpen && (
        <div className="call-select-dropdown">
          {searchable && (
            <div className="call-select-search-box">
              <input 
                type="text" 
                autoFocus
                placeholder="Search..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="call-select-search-input"
              />
            </div>
          )}
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filteredOptions.map(opt => (
              <div 
                key={opt.value}
                className={`call-select-option ${value === opt.value ? 'selected' : ''}`}
                onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
              >
                <span>{opt.label}</span>
                {value === opt.value && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div style={{ padding: '12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const WhatsAppIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

const CallLogs = () => {
  const [logs, setLogs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [loading, setLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState(moment().format('YYYY-MM'));
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const [formData, setFormData] = useState({ 
    patientId: '', 
    date: moment().format('YYYY-MM-DD'), 
    status: 'Answered', 
    discussion: '', 
    remarks: '' 
  });

  useEffect(() => {
    fetchLogs();
    fetchPatients();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/calls?view=my`, { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchPatients = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/patients`, { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPatients(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/calls/${editingId}`, formData, { 
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/calls`, formData, { 
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ patientId: '', date: moment().format('YYYY-MM-DD'), status: 'Answered', discussion: '', remarks: '' });
      fetchLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteLog = async (id) => {
    if (!window.confirm("Are you sure you want to delete this log?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/calls/${id}`, { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusClass = (status) => {
    if (status === 'Answered') return 'answered';
    if (status === 'Busy') return 'busy';
    if (status === 'DNP') return 'dnp';
    if (status === 'Wrong Number') return 'wrong';
    if (status === 'Unreachable') return 'unreachable';
    return 'default';
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.patient?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.patient?.mobileNumber?.includes(searchTerm) ||
                          log.discussion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    const matchesClient = clientFilter === 'All' || log.patient?._id === clientFilter;
    const matchesMonth = monthFilter === 'All' || moment(log.date).format('YYYY-MM') === monthFilter;
    return matchesSearch && matchesStatus && matchesClient && matchesMonth;
  });

  useEffect(() => { 
    setCurrentPage(1); 
  }, [searchTerm, statusFilter, clientFilter, monthFilter]);

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredLogs.length / recordsPerPage);

  const monthOptions = [{ value: 'All', label: 'All Months' }];
  const uniqueMonths = [...new Set(logs.map(log => moment(log.date).format('YYYY-MM')))].sort((a, b) => b.localeCompare(a));
  uniqueMonths.forEach(m => monthOptions.push({ value: m, label: moment(m, 'YYYY-MM').format('MMMM YYYY') }));

  const handleEdit = (log) => {
    setFormData({
      patientId: log.patient?._id || '',
      date: moment(log.date).format('YYYY-MM-DD'),
      status: log.status,
      discussion: log.discussion,
      remarks: log.remarks || ''
    });
    setEditingId(log._id);
    setShowModal(true);
  };

  const handleOpenNewModal = () => {
    setEditingId(null);
    setFormData({ 
      patientId: '', 
      date: moment().format('YYYY-MM-DD'), 
      status: 'Answered', 
      discussion: '', 
      remarks: '' 
    });
    setShowModal(true);
  };

  const generateWhatsAppText = (log) => {
    const patientName = log.patient?.fullName || '';
    const discussion = log.discussion || '';
    const remarks = log.remarks || '';
    
    let text = 'Hi ' + patientName + ',\n\nFollowing up on our last interaction.\n\nAs discussed: ' + discussion;
    
    if (remarks) {
      text += '\n\nSuggestions: ' + remarks;
    }
    
    text += '\n\nLet me know if you need any assistance!';
    
    return encodeURIComponent(text);
  };

  return (
    <div className="call-logs-container">
      {/* Top Header */}
      <div className="call-logs-header">
        <div className="call-logs-header-left">
          <div className="call-logs-header-icon">
            <PhoneIcon size={22} />
          </div>
          <div>
            <h1 className="call-logs-title">Followup Calls</h1>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleOpenNewModal}
          className="call-logs-btn-primary"
        >
          <PlusIcon size={16} />
          <span>Log New Call</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      {user.role !== 'team' && (
        <div className="call-stats-grid">
          <div className="call-stat-card total">
            <div className="call-stat-icon-wrap">
              <PhoneIcon size={20} />
            </div>
            <div className="call-stat-info">
              <span className="call-stat-label">Total Calls</span>
              <strong className="call-stat-val">{logs.length}</strong>
            </div>
          </div>

          <div className="call-stat-card answered">
            <div className="call-stat-icon-wrap">
              <CheckCircleIcon size={20} />
            </div>
            <div className="call-stat-info">
              <span className="call-stat-label">Answered</span>
              <strong className="call-stat-val">
                {logs.filter(l => l.status === 'Answered').length}
              </strong>
            </div>
          </div>

          <div className="call-stat-card dnp">
            <div className="call-stat-icon-wrap">
              <ClockIcon size={20} />
            </div>
            <div className="call-stat-info">
              <span className="call-stat-label">DNP / Busy</span>
              <strong className="call-stat-val">
                {logs.filter(l => l.status === 'DNP' || l.status === 'Busy').length}
              </strong>
            </div>
          </div>

          <div className="call-stat-card wrong">
            <div className="call-stat-icon-wrap">
              <AlertTriangleIcon size={20} />
            </div>
            <div className="call-stat-info">
              <span className="call-stat-label">Wrong No / Unreachable</span>
              <strong className="call-stat-val">
                {logs.filter(l => l.status === 'Wrong Number' || l.status === 'Unreachable').length}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Filters Card */}
      <div className="call-filters-card">
        <div className="call-search-wrap">
          <SearchIcon size={16} className="call-search-icon" />
          <input 
            type="text" 
            placeholder="Search by client name, mobile or feedback..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="call-search-input"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                padding: 0
              }}
              title="Clear search"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>

        <div className="call-filter-group">
          <div className="call-filter-item call-filter-client">
            <CustomSelect 
              value={clientFilter}
              onChange={val => setClientFilter(val)}
              options={[{ value: 'All', label: 'All Clients' }, ...patients.map(p => ({ value: p._id, label: `${p.mobileNumber} - ${p.fullName}` }))]}
              placeholder="All Clients" 
              searchable={true}
            />
          </div>

          <div className="call-filter-item call-filter-status">
            <CustomSelect 
              value={statusFilter}
              onChange={val => setStatusFilter(val)}
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Answered', label: 'Answered' },
                { value: 'DNP', label: 'DNP' },
                { value: 'Busy', label: 'Busy' },
                { value: 'Wrong Number', label: 'Wrong Number' },
                { value: 'Unreachable', label: 'Unreachable' }
              ]}
              placeholder="All Statuses"
            />
          </div>

          <div className="call-filter-item call-filter-month">
            <CustomSelect 
              value={monthFilter}
              onChange={val => setMonthFilter(val)}
              options={monthOptions}
              placeholder="Select Month"
            />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="call-table-card">
        {/* Mobile View */}
        <div className="mobile-cards">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}><div className="global-loader-container"><div className="global-spinner"></div><div>Loading followup logs...</div></div></div>
          ) : filteredLogs.length === 0 ? (
            <div className="call-empty-state">
              <div className="call-empty-icon">
                <PhoneIcon size={24} />
              </div>
              <h4 className="call-empty-title">No Call Logs Found</h4>
              <p className="call-empty-sub">No calls match your active filter criteria.</p>
              <button 
                type="button" 
                onClick={handleOpenNewModal}
                className="call-logs-btn-primary"
                style={{ fontSize: '12px', padding: '8px 16px' }}
              >
                <PlusIcon size={14} /> Log Call
              </button>
            </div>
          ) : (
            currentLogs.map((log) => {
              const clientName = log.patient?.fullName || 'Unknown';
              const clientInitials = clientName.substring(0, 2).toUpperCase();
              const mobile = log.patient?.mobileNumber || '';

              return (
                <div key={log._id} className="mobile-call-card">
                  {/* Top: Avatar + Client Name & Phone + Status Pill */}
                  <div className="mobile-card-top">
                    <div className="call-card-user-wrap">
                      <div className="call-card-avatar">
                        {clientInitials}
                      </div>
                      <div className="call-card-user-info">
                        <span className="client-name" title={clientName}>{clientName}</span>
                        {mobile ? (
                          <a href={`tel:${mobile}`} className="client-phone">
                            <PhoneIcon size={11} /> {mobile}
                          </a>
                        ) : (
                          <span className="client-phone-none">No phone</span>
                        )}
                      </div>
                    </div>
                    <span className={`call-status-pill ${getStatusClass(log.status)}`}>
                      <span className="call-status-dot"></span>
                      {log.status}
                    </span>
                  </div>
                  
                  {/* Meta: Logged by + Date */}
                  <div className="mobile-card-meta">
                    <div className="call-card-date-chip">
                      <CalendarIcon size={12} color="#64748b" />
                      <span>{moment(log.date).format('DD MMM YYYY')}</span>
                    </div>

                    {user.role !== 'team' && (
                      <div className="call-card-logged-by">
                        <div className="logged-by-avatar">
                          {(log.teamMember?.name || 'U')[0].toUpperCase()}
                        </div>
                        <span className="logged-by-name">{log.teamMember?.name || 'Team Member'}</span>
                      </div>
                    )}
                  </div>

                  {/* Feedback Section */}
                  <div className="mobile-card-section">
                    <span className="mobile-section-label">Feedback</span>
                    <div className="mobile-feedback-text">{log.discussion || '-'}</div>
                  </div>

                  {log.remarks && (
                    <div className="mobile-card-section mobile-remarks-section">
                      <span className="mobile-section-label">Remarks</span>
                      <div className="mobile-remarks-text">{log.remarks}</div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mobile-card-actions">
                    {mobile && (
                      <a href={`tel:${mobile}`} className="call-card-btn-call" title="Call Client">
                        <PhoneIcon size={12} />
                        <span>Call</span>
                      </a>
                    )}
                    <div className="call-card-action-icons">
                      <button 
                        type="button"
                        onClick={() => handleEdit(log)} 
                        className="call-card-icon-btn edit"
                        title="Edit Log"
                      >
                        <EditIcon size={14} />
                      </button>
                      {(user.role === 'superadmin' || user.role === 'admin' || user.id === log.teamMember?._id) && (
                        <button 
                          type="button"
                          onClick={() => deleteLog(log._id)} 
                          className="call-card-icon-btn delete"
                          title="Delete Log"
                        >
                          <TrashIcon size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table */}
        <div className="desktop-table-container call-table-wrap">
          <table className="call-table">
            <thead>
              <tr>
                <th>CLIENT & FIRM</th>
                {user.role !== 'team' && <th>LOGGED BY</th>}
                <th>DATE & TIME</th>
                <th>STATUS</th>
                <th>CLIENT FEEDBACK</th>
                <th>REMARKS</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={user.role !== 'team' ? 7 : 6} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}><div className="global-loader-container"><div className="global-spinner"></div><div>Loading followup logs...</div></div></td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={user.role !== 'team' ? 7 : 6}>
                    <div className="call-empty-state">
                      <div className="call-empty-icon">
                        <PhoneIcon size={24} />
                      </div>
                      <h4 className="call-empty-title">No Call Logs Found</h4>
                      <p className="call-empty-sub">No calls match your active filter criteria.</p>
                      <button 
                        type="button" 
                        onClick={handleOpenNewModal}
                        className="call-logs-btn-primary"
                        style={{ fontSize: '13px', padding: '8px 18px' }}
                      >
                        <PlusIcon size={14} /> Log Call
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                currentLogs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <div className="client-info-cell">
                        <span className="client-name">{log.patient?.fullName || 'Unknown'}</span>
                        <a href={`tel:${log.patient?.mobileNumber}`} className="client-phone">
                          <PhoneIcon size={12} /> {log.patient?.mobileNumber || 'N/A'}
                        </a>
                      </div>
                    </td>

                    {user.role !== 'team' && (
                      <td>
                        <div className="logged-by-cell">
                          <div className="logged-by-avatar">
                            {(log.teamMember?.name || 'U')[0].toUpperCase()}
                          </div>
                          <span className="logged-by-name">{log.teamMember?.name || 'Team Member'}</span>
                        </div>
                      </td>
                    )}

                    <td>
                      <span className="call-date-cell">
                        {moment(log.date).format('DD MMM YYYY')}
                      </span>
                    </td>

                    <td>
                      <span className={`call-status-pill ${getStatusClass(log.status)}`}>
                        <span className="call-status-dot"></span>
                        {log.status}
                      </span>
                    </td>

                    <td>
                      <div className="feedback-cell">
                        {log.discussion}
                      </div>
                    </td>

                    <td>
                      <div className="remarks-cell">
                        {log.remarks || '-'}
                      </div>
                    </td>

                    <td>
                      <div className="call-actions-cell">
                     

                        <button 
                          type="button"
                          onClick={() => handleEdit(log)} 
                          className="call-icon-btn edit"
                          title="Edit Log"
                        >
                          <EditIcon size={14} />
                        </button>

                        {(user.role === 'superadmin' || user.role === 'admin' || user.id === log.teamMember?._id) && (
                          <button 
                            type="button"
                            onClick={() => deleteLog(log._id)} 
                            className="call-icon-btn delete"
                            title="Delete Log"
                          >
                            <TrashIcon size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination UI */}
        {filteredLogs.length > 0 && (
          <div className="call-pagination-bar">
            <div className="call-pagination-info">
              Showing {indexOfFirstRecord + 1}-{Math.min(indexOfLastRecord, filteredLogs.length)} of {filteredLogs.length} records
            </div>
            
            <div className="call-pagination-controls">
              <button 
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="call-page-btn"
                title="Previous Page"
              >
                &lt;
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button 
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`call-page-btn ${currentPage === page ? 'active' : ''}`}
                >
                  {page}
                </button>
              ))}

              <button 
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="call-page-btn"
                title="Next Page"
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Call Modal */}
      {showModal && (
        <div className="call-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="call-modal-content" onClick={e => e.stopPropagation()}>
            <div className="call-modal-header">
              <div className="call-modal-header-left">
                <div className="call-modal-header-icon">
                  <PhoneIcon size={18} />
                </div>
                <div>
                  <h3 className="call-modal-title">
                    {editingId ? 'Edit Followup Call' : 'Log Followup Call'}
                  </h3>
                  <p className="call-modal-subtitle">
                    Record patient interaction, feedback, and notes
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowModal(false)} 
                className="call-modal-close-btn"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="call-modal-form">
              <div className="call-form-row-2">
                <div>
                  <label className="call-form-label">
                    Client / Patient <span className="req">*</span>
                  </label>
                  <CustomSelect 
                    value={formData.patientId} 
                    onChange={val => setFormData({...formData, patientId: val})} 
                    options={patients.map(p => ({ value: p._id, label: `${p.mobileNumber} - ${p.fullName}` }))}
                    placeholder="Select patient..." 
                    searchable={true}
                  />
                </div>

                <div>
                  <label className="call-form-label">
                    Date <span className="req">*</span>
                  </label>
                  <input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    required
                    className="call-form-input"
                  />
                </div>
              </div>

              <div className="call-form-group">
                <label className="call-form-label">
                  Call Status <span className="req">*</span>
                </label>
                <CustomSelect 
                  value={formData.status} 
                  onChange={val => setFormData({...formData, status: val})} 
                  options={[
                    { value: 'Answered', label: 'Answered' },
                    { value: 'DNP', label: 'DNP (Did Not Pick)' },
                    { value: 'Busy', label: 'Busy' },
                    { value: 'Wrong Number', label: 'Wrong Number' },
                    { value: 'Unreachable', label: 'Unreachable' }
                  ]}
                  placeholder="Select status..."
                />
              </div>

              <div className="call-form-group">
                <label className="call-form-label">
                  Client Feedback / Discussion <span className="req">*</span>
                </label>
                <textarea 
                  placeholder="e.g. Patient is recovering well, scheduled next checkup on Monday..." 
                  value={formData.discussion} 
                  onChange={e => setFormData({...formData, discussion: e.target.value})} 
                  required
                  rows={3}
                  className="call-form-textarea"
                />
              </div>

              <div className="call-form-group" style={{ marginBottom: 0 }}>
                <label className="call-form-label">
                  Internal Remarks (Optional)
                </label>
                <textarea 
                  placeholder="Any staff notes or next follow-up suggestions..." 
                  value={formData.remarks} 
                  onChange={e => setFormData({...formData, remarks: e.target.value})} 
                  rows={2}
                  className="call-form-textarea"
                />
              </div>

              <div className="call-modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="call-btn-cancel"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="call-btn-submit"
                >
                  {editingId ? 'Update Call Log' : 'Save Call Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallLogs;
