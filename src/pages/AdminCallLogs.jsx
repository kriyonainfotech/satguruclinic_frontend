import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import moment from 'moment';
import { PhoneIcon, TrashIcon, EditIcon, DownloadIcon, SearchIcon, XIcon, ClockIcon, CalendarIcon } from '../components/Icons';
import CustomSelect from '../components/CustomSelect';
import Pagination from '../components/Pagination';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../App.css';

const WhatsAppIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.001.597 1.761.853 2.806.853 3.19 0 5.77-2.587 5.77-5.766.001-3.18-2.575-5.766-5.77-5.766zm3.385 8.163c-.145.411-.749.773-1.034.799-.285.026-.525.045-1.579-.387-1.282-.526-2.152-1.742-2.217-1.829-.065-.087-.521-.692-.521-1.319 0-.626.326-.934.442-1.061.116-.128.253-.16.337-.16.084 0 .169.001.242.005.078.003.181-.03.283.213.104.248.356.868.387.931.031.063.052.137.01.22-.042.084-.063.136-.126.21-.063.073-.133.164-.19.22-.063.064-.129.133-.055.261.074.127.329.544.707.881.488.435.899.57 1.026.634.127.063.201.053.275-.032.074-.085.317-.369.401-.496.085-.126.17-.105.286-.063.116.042.74.349.867.412.127.063.212.095.243.148.031.053.031.306-.114.717z"/>
  </svg>
);

const AdminCallLogs = () => {
  const [logs, setLogs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [loading, setLoading] = useState(false);
  
  const [teamFilter, setTeamFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
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
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const resTeam = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/users/team`, { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const resAdmin = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/users/admin`, { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTeamMembers([...resTeam.data, ...resAdmin.data]);
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/calls`, { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setLogs(res.data);
    } catch (err) {
      console.error('Error fetching call logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/patients`, { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPatients(res.data);
    } catch (err) {
      console.error('Error fetching patients:', err);
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
      alert("Error deleting log: " + (err.response?.data?.message || err.message));
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Answered') return { bg: '#ecfdf5', color: '#10b981' };
    if (status === 'DNP') return { bg: '#fef3c7', color: '#d97706' };
    if (status === 'Busy') return { bg: '#ffedd5', color: '#ea580c' };
    if (status === 'Wrong Number' || status === 'Unreachable') return { bg: '#fee2e2', color: '#ef4444' };
    return { bg: '#f1f5f9', color: '#64748b' };
  };

  const baseFilteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !searchTerm.trim() || 
        log.patient?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        log.patient?.mobileNumber?.includes(searchTerm) ||
        log.discussion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.teamMember?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMonth = monthFilter === 'All' || moment(log.date).format('YYYY-MM') === monthFilter;
      return matchesSearch && matchesMonth;
    });
  }, [logs, searchTerm, monthFilter]);

  const filteredLogs = useMemo(() => {
    return baseFilteredLogs.filter(log => {
      return teamFilter === 'All' || log.teamMember?._id === teamFilter;
    });
  }, [baseFilteredLogs, teamFilter]);

  useEffect(() => { 
    setCurrentPage(1); 
  }, [searchTerm, monthFilter, teamFilter]);

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredLogs.length / recordsPerPage) || 1;

  const teamOptions = useMemo(() => [
    { value: 'All', label: 'All Team / Admin' },
    ...teamMembers.map(t => ({ value: t._id, label: t.name }))
  ], [teamMembers]);

  const monthOptions = useMemo(() => {
    const opts = [{ value: 'All', label: 'All Months' }];
    const uniqueMonths = [...new Set(logs.map(log => moment(log.date).format('YYYY-MM')))].sort((a, b) => b.localeCompare(a));
    uniqueMonths.forEach(m => opts.push({ value: m, label: moment(m, 'YYYY-MM').format('MMMM YYYY') }));
    return opts;
  }, [logs]);

  const patientOptions = useMemo(() => [
    { value: '', label: 'Select a patient...' },
    ...patients.map(p => ({
      value: p._id,
      label: `${p.fullName} (${p.mobileNumber})`
    }))
  ], [patients]);

  const statusOptions = [
    { value: 'Answered', label: 'Answered' },
    { value: 'DNP', label: 'DNP' },
    { value: 'Busy', label: 'Busy' },
    { value: 'Wrong Number', label: 'Wrong Number' },
    { value: 'Unreachable', label: 'Unreachable' }
  ];

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(20, 75, 121);
    doc.text('Satguru Clinic', 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Call Logs Report', 14, 28);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    let yPos = 36;
    doc.text(`Generated On: ${moment().format('DD MMM YYYY, hh:mm A')}`, 14, yPos);
    yPos += 6;
    doc.text(`Month Filter: ${monthFilter === 'All' ? 'All Months' : moment(monthFilter, 'YYYY-MM').format('MMMM YYYY')}`, 14, yPos);
    
    if (teamFilter !== 'All') {
      const t = teamMembers.find(t => t._id === teamFilter);
      if (t) {
        yPos += 6;
        doc.text(`Team Member Filter: ${t.name}`, 14, yPos);
      }
    }

    const total = filteredLogs.length;
    const answered = filteredLogs.filter(l => l.status === 'Answered').length;
    const dnp = filteredLogs.filter(l => l.status === 'DNP').length;
    const busy = filteredLogs.filter(l => l.status === 'Busy').length;
    const wrong = filteredLogs.filter(l => l.status === 'Wrong Number' || l.status === 'Unreachable').length;

    yPos += 10;
    doc.setFontSize(11);
    doc.setTextColor(20, 75, 121);
    doc.text('Report Summary', 14, yPos);
    
    yPos += 6;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Calls: ${total}   |   Answered: ${answered}   |   DNP: ${dnp}   |   Busy/Wrong: ${busy + wrong}`, 14, yPos);

    yPos += 10;

    const tableData = filteredLogs.map((log, i) => [
      i + 1,
      `${log.patient?.fullName || 'Unknown'}\n${log.patient?.mobileNumber || ''}`,
      log.teamMember?.name || 'Unknown',
      moment(log.date).format('DD MMM YYYY'),
      log.status,
      log.discussion,
      log.remarks || '-'
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Patient', 'Logged By', 'Date', 'Status', 'Feedback', 'Remarks']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [20, 75, 121],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    doc.save(`CallLogs_Report_${moment().format('YYYYMMDD')}.pdf`);
  };

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
      fetchLogs();
    } catch (err) {
      alert("Error saving call log: " + (err.response?.data?.message || err.message));
    }
  };

  const renderSummaryCards = (targetLogs) => {
    const total = targetLogs.length;
    const answered = targetLogs.filter(l => l.status === 'Answered').length;
    const dnp = targetLogs.filter(l => l.status === 'DNP').length;
    const busy = targetLogs.filter(l => l.status === 'Busy').length;
    const wrong = targetLogs.filter(l => l.status === 'Wrong Number' || l.status === 'Unreachable').length;

    return (
      <div className="call-summary-grid">
        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eff6ff', color: 'var(--primary-color, #144b79)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, flexShrink: 0 }}>
            {total}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Total Calls</div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>All logged entries</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, flexShrink: 0 }}>
            {answered}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Answered</div>
            <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 500, marginTop: '2px' }}>{total ? Math.round((answered/total)*100) : 0}% success rate</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, flexShrink: 0 }}>
            {dnp}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>DNP (Did Not Pick)</div>
            <div style={{ fontSize: '11.5px', color: '#b45309', fontWeight: 500, marginTop: '2px' }}>{total ? Math.round((dnp/total)*100) : 0}% missed</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, flexShrink: 0 }}>
            {busy + wrong}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Busy / Wrong No</div>
            <div style={{ fontSize: '11.5px', color: '#c2410c', fontWeight: 500, marginTop: '2px' }}>{total ? Math.round(((busy+wrong)/total)*100) : 0}% unresolved</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container" style={{ boxSizing: 'border-box' }}>
      <div className="page-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '10px' }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Call Logs Management</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <button 
            onClick={fetchLogs} 
            className="crm-btn crm-btn-secondary"
            title="Refresh"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            <span>Refresh</span>
          </button>
          <button 
            onClick={exportPDF} 
            className="crm-btn crm-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <DownloadIcon size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* Filter Bar with CustomSelect */}
      <div className="call-filter-bar">
        <div className="call-filter-search-wrap">
          <SearchIcon size={15} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Search patient, team, remarks..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="call-filter-search-input"
          />
        </div>
        <div className="call-filter-selects">
          <div className="call-filter-select-item">
            <CustomSelect 
              value={teamFilter}
              onChange={val => setTeamFilter(val)}
              options={teamOptions}
              placeholder="All Team / Admin"
            />
          </div>
          <div className="call-filter-select-item">
            <CustomSelect 
              value={monthFilter}
              onChange={val => setMonthFilter(val)}
              options={monthOptions}
              placeholder="All Months"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {renderSummaryCards(filteredLogs)}

      {/* Desktop Table View */}
      <div className="desktop-table-wrap">
        <div className="table-container" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden', marginBottom: '24px' }}>
          <table className="crm-table">
            <thead>
              <tr>
                <th style={{ width: '56px', textAlign: 'center' }}>#</th>
                <th>LOGGED BY</th>
                <th>PATIENT</th>
                <th>DATE & TIME</th>
                <th>STATUS</th>
                <th>PATIENT FEEDBACK</th>
                <th>REMARKS</th>
                <th style={{ textAlign: 'center', width: '70px' }}>DEL</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>Loading call logs...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>No call logs found matching your filters.</td></tr>
              ) : (
                currentLogs.map((log, index) => (
                  <tr key={log._id}>
                    <td style={{ textAlign: 'center' }}>
                      <span className="sr-num-pill">{indexOfFirstRecord + index + 1}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                          color: '#0369a1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          {(log.teamMember?.name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>{log.teamMember?.name}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'capitalize' }}>{log.teamMember?.role || 'team'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>{log.patient?.fullName || 'Unknown'}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--primary-color, #144b79)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontWeight: 500 }}>
                        <PhoneIcon size={11} /> {log.patient?.mobileNumber || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '12.5px' }}>
                        {moment(log.date).format('DD MMM YYYY')}
                      </div>
                      {log.createdAt && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <ClockIcon size={11} /> {moment(log.createdAt).format('hh:mm A')}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ 
                        background: getStatusColor(log.status).bg, 
                        color: getStatusColor(log.status).color, 
                        padding: "4px 10px", 
                        borderRadius: "6px", 
                        fontSize: "12px", 
                        fontWeight: 600, 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: "6px", 
                        border: `1px solid ${getStatusColor(log.status).color}30` 
                      }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: getStatusColor(log.status).color }}></div>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ color: '#334155', fontSize: '13px', maxWidth: '260px', lineHeight: 1.4 }}>
                      {log.discussion}
                    </td>
                    <td style={{ color: '#64748b', fontSize: '12.5px', maxWidth: '160px' }}>
                      {log.remarks || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {(user.role === 'superadmin' || user.role === 'admin') && (
                        <button 
                          onClick={() => deleteLog(log._id)} 
                          className="action-btn delete tbl-icon-btn" 
                          title="Delete Call Log"
                          style={{ margin: '0 auto' }}
                        >
                          <TrashIcon size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {filteredLogs.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredLogs.length}
              itemsPerPage={recordsPerPage}
              onPageChange={setCurrentPage}
              itemName="call logs"
            />
          )}
        </div>
      </div>

      {/* Responsive Card View for Mobile & Tablet (sm: 1 card, md: 2 cards) */}
      <div className="mobile-cards-wrap" style={{ marginBottom: '24px' }}>
        <div className="crm-card-view">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
              Loading call logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: '#94a3b8', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
              No call logs found matching your filters.
            </div>
          ) : (
            currentLogs.map((log, index) => {
              const statusStyle = getStatusColor(log.status);
              return (
                <div className="call-log-card" key={log._id}>
                  {/* Top: Avatar + Patient Info + Status Badge */}
                  <div className="call-card-top">
                    <div className="call-patient-block">
                      <div className="call-patient-avatar">
                        {(log.patient?.fullName || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div className="call-patient-info">
                        <span className="call-patient-name" title={log.patient?.fullName || 'Unknown'}>
                          {log.patient?.fullName || 'Unknown'}
                        </span>
                        {log.patient?.mobileNumber ? (
                          <a href={`tel:${log.patient.mobileNumber}`} className="call-patient-phone">
                            <PhoneIcon size={11} /> {log.patient.mobileNumber}
                          </a>
                        ) : (
                          <span className="call-patient-phone no-phone">No phone</span>
                        )}
                      </div>
                    </div>
                    <span 
                      className="call-status-badge"
                      style={{ 
                        background: statusStyle.bg, 
                        color: statusStyle.color,
                        borderColor: `${statusStyle.color}35`
                      }}
                    >
                      <span className="call-status-dot" style={{ background: statusStyle.color }} />
                      {log.status}
                    </span>
                  </div>

                  {/* Schedule & Logged By Banner */}
                  <div className="call-schedule-banner">
                    <div className="call-schedule-item">
                      <CalendarIcon size={13} color="#0284c7" />
                      <span>{moment(log.date).format('DD MMM YYYY')}</span>
                      {log.createdAt && (
                        <span className="call-time-inline">
                          <ClockIcon size={12} color="#0284c7" />
                          {moment(log.createdAt).format('hh:mm A')}
                        </span>
                      )}
                    </div>
                    <div className="call-logged-by-badge" title={`Logged by ${log.teamMember?.name || 'Team'}`}>
                      <span className="call-logged-avatar">
                        {(log.teamMember?.name || 'U')[0].toUpperCase()}
                      </span>
                      <span className="call-logged-name">{log.teamMember?.name || 'Team'}</span>
                    </div>
                  </div>

                  {/* Feedback / Discussion */}
                  <div className="call-card-body">
                    <div className="call-feedback-box">
                      <span className="call-feedback-label">Patient Feedback / Discussion</span>
                      <p className="call-feedback-text">{log.discussion || '—'}</p>
                    </div>

                    {log.remarks && (
                      <div className="call-remarks-box">
                        <span className="call-remarks-label">Remarks:</span>
                        <span className="call-remarks-text">{log.remarks}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="call-card-footer">
                    <span className="call-card-index">#{indexOfFirstRecord + index + 1}</span>
                    <div className="call-card-actions">
                      {(user.role === 'superadmin' || user.role === 'admin') && (
                        <button 
                          onClick={() => deleteLog(log._id)} 
                          className="action-btn delete tbl-icon-btn" 
                          title="Delete Call Log"
                          aria-label="Delete Call Log"
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

        {filteredLogs.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <Pagination
              currentPage={currentPage}
              totalItems={filteredLogs.length}
              itemsPerPage={recordsPerPage}
              onPageChange={setCurrentPage}
              itemName="call logs"
            />
          </div>
        )}
      </div>

      {/* Modal with CustomSelect */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: '22px 24px', borderRadius: '14px' }}>
            <div className="modal-header" style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 className="modal-title" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary-color, #144b79)' }}>
                {editingId ? 'Edit Followup Call' : 'Log Followup Call'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)} title="Close" aria-label="Close">
                <XIcon size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Patient *</label>
                <CustomSelect 
                  value={formData.patientId} 
                  onChange={val => setFormData({...formData, patientId: val})} 
                  options={patientOptions}
                  placeholder="Select a patient..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Date *</label>
                  <input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    required
                    className="modal-text-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Call Status *</label>
                  <CustomSelect 
                    value={formData.status} 
                    onChange={val => setFormData({...formData, status: val})} 
                    options={statusOptions}
                    placeholder="Select status..."
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Patient Feedback / Discussion *</label>
                <textarea 
                  placeholder="e.g. Patient ki tabiyat ab theek hai, next appointment..." 
                  value={formData.discussion} 
                  onChange={e => setFormData({...formData, discussion: e.target.value})} 
                  required
                  rows={3}
                  className="modal-textarea-input"
                  style={{ minHeight: '70px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Remarks (Optional)</label>
                <textarea 
                  placeholder="Any internal remarks..." 
                  value={formData.remarks} 
                  onChange={e => setFormData({...formData, remarks: e.target.value})} 
                  rows={2}
                  className="modal-textarea-input"
                  style={{ minHeight: '50px' }}
                />
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', marginTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setShowModal(false)} style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="crm-btn crm-btn-primary" style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}>Save Call Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCallLogs;
