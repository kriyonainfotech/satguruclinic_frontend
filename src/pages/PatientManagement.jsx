import React, { useState, useRef, useEffect, useMemo } from 'react';
import axios from 'axios';
import { PlusIcon, TrashIcon, EditIcon, XIcon, UserIcon, SearchIcon, PhoneIcon, CalendarIcon } from '../components/Icons';
import CalendarPicker from '../components/CalendarPicker';
import StatusDropdown from '../components/StatusDropdown';
import CustomSelect from '../components/CustomSelect';
import Pagination from '../components/Pagination';
import { formatDate } from '../utils/formatDate';
import '../App.css';

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' }
];

const BLOOD_GROUP_OPTIONS = [
  { value: 'Unknown', label: 'Unknown' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' }
];

const TagInput = ({ name, value, onChange, suggestions, placeholder }) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const tags = value ? value.split(', ').filter(Boolean) : [];

  const addTag = (tag) => {
    const trimmed = tag?.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    const newTags = [...tags, trimmed];
    onChange({ target: { name, value: newTags.join(', ') } });
    setInputValue('');
    setIsOpen(false);
  };

  const removeTag = (tagToRemove) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    onChange({ target: { name, value: newTags.join(', ') } });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = suggestions.filter(s => 
    s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
  );

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div 
        onClick={() => setIsOpen(true)}
        style={{ 
          border: '1px solid #cbd5e1', 
          borderRadius: '8px', 
          padding: '4px 8px', 
          background: '#fff', 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '4px', 
          minHeight: '38px', 
          cursor: 'text',
          alignItems: 'center',
          boxSizing: 'border-box'
        }}
      >
        {tags.map(tag => (
          <span 
            key={tag} 
            style={{ 
              background: '#e0f2fe', 
              color: '#0369a1', 
              padding: '2px 8px', 
              borderRadius: '6px', 
              fontSize: '11.5px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              border: '1px solid #bae6fd',
              fontWeight: 500
            }}
          >
            {tag}
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }} 
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                padding: 0, 
                color: '#0284c7', 
                display: 'flex', 
                alignItems: 'center',
                fontSize: '14px',
                lineHeight: 1
              }}
            >
              &times;
            </button>
          </span>
        ))}
        <div style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center' }}>
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag(inputValue);
              } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
                removeTag(tags[tags.length - 1]);
              }
            }}
            style={{ 
              border: 'none', 
              outline: 'none', 
              width: '100%', 
              fontSize: '13px', 
              padding: '2px 4px', 
              background: 'transparent', 
              color: '#0f172a' 
            }}
            placeholder={tags.length === 0 ? placeholder : ""}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: '#64748b' }}>
          {inputValue.trim() ? (
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); addTag(inputValue); }}
              style={{ background: 'var(--primary-color, #144b79)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
            >
              Add
            </button>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          )}
        </div>
      </div>

      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 25px -4px rgba(0,0,0,0.12)', zIndex: 999, maxHeight: '160px', overflowY: 'auto' }}>
          {filteredSuggestions.map(s => (
            <div 
              key={s} 
              onClick={() => addTag(s)}
              style={{ padding: '8px 12px', fontSize: '12.5px', cursor: 'pointer', color: '#334155', borderBottom: '1px solid #f8fafc', transition: 'background 0.12s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {s}
            </div>
          ))}
          {inputValue.trim() && !filteredSuggestions.includes(inputValue.trim()) && (
            <div 
              onClick={() => addTag(inputValue)}
              style={{ padding: '8px 12px', fontSize: '12.5px', cursor: 'pointer', color: '#0369a1', fontWeight: 600, background: '#f0f9ff' }}
            >
              + Add "{inputValue.trim()}"
            </div>
          )}
          {filteredSuggestions.length === 0 && !inputValue.trim() && (
            <div style={{ padding: '8px 12px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
              Type to add custom...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PatientManagement = () => {
  const [patients, setPatients] = useState([]);

  const parseDDMMYY = (str) => {
    if (!str) return null;
    const parts = str.split('/');
    if (parts.length === 3) {
      let [d, m, y] = parts;
      if (y.length === 2) y = '20' + y;
      const parsed = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const PATIENT_STATUS_OPTIONS = [
    { value: 'Active', label: 'Active', color: '#10b981' }, // Green
    { value: 'Inactive', label: 'Inactive', color: '#64748b' } // Gray
  ];

  const handleStatusChange = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/patients/${id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPatients();
    } catch (err) {
      console.error('Error updating patient status', err);
      alert('Error updating status');
    }
  };
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    gender: 'Male',
    dateOfBirth: '',
    mobileNumber: '',
    email: '',
    address: '',
    bloodGroup: 'Unknown',
    allergies: '',
    existingConditions: '',
    currentMedicines: '',
    previousHistory: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    relationship: ''
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdminOrTeam = ['superadmin', 'admin', 'team'].includes(user.role);

  // Generate Year options
  const YEAR_OPTIONS = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear - 3; y <= currentYear + 10; y++) {
      years.push(y.toString());
    }
    return years;
  }, []);

  const MONTH_LIST = [
    { val: '01', label: 'January' }, { val: '02', label: 'February' },
    { val: '03', label: 'March' }, { val: '04', label: 'April' },
    { val: '05', label: 'May' }, { val: '06', label: 'June' },
    { val: '07', label: 'July' }, { val: '08', label: 'August' },
    { val: '09', label: 'September' }, { val: '10', label: 'October' },
    { val: '11', label: 'November' }, { val: '12', label: 'December' },
  ];

  const yearOptions = useMemo(() => [
    { value: '', label: 'All Years' },
    ...YEAR_OPTIONS.map(y => ({ value: y, label: y }))
  ], [YEAR_OPTIONS]);

  const monthOptions = useMemo(() => [
    { value: '', label: 'All Months' },
    ...MONTH_LIST.map(m => ({ value: m.val, label: m.label }))
  ], [MONTH_LIST]);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/patients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(res.data);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateInput = (val) => { let v = val.replace(/[^\d/]/g, '').replace(/\/+/g, '/'); let parts = v.split('/'); if (parts.length > 1 && parts[0].length === 1) parts[0] = '0' + parts[0]; if (parts.length > 2 && parts[1].length === 1) parts[1] = '0' + parts[1]; let digits = parts.join('').replace(/\D/g, ''); let formatted = ''; if (digits.length > 0) formatted = digits.substring(0, 2); if (digits.length > 2) formatted += '/' + digits.substring(2, 4); if (digits.length > 4) formatted += '/' + digits.substring(4, 8); if (v.endsWith('/') && digits.length > 0 && digits.length % 2 === 0 && digits.length < 5 && !formatted.endsWith('/')) formatted += '/'; return formatted; }; const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Only allow max 10 digits for phone numbers
    if (name === 'mobileNumber' || name === 'emergencyContactNumber') {
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length > 10) return; // Prevent typing more than 10
      setFormData({ ...formData, [name]: numericValue });
      return;
    }
    
    if(name==='dateOfBirth'){ setFormData({ ...formData, [name]: formatDateInput(value) }); return; } setFormData({ ...formData, [name]: value });
  };

  const calculateAgePreview = (dobStr) => {
    if (!dobStr) return '';
    const birthDate = parseDDMMYY(dobStr);
    if (!birthDate) return '';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      const payload = { ...formData };
      if (payload.dateOfBirth) {
        const parsed = parseDDMMYY(payload.dateOfBirth);
        if (parsed) {
          payload.dateOfBirth = parsed.toISOString().split('T')[0];
        } else {
          return alert('Invalid Date of Birth format. Use DD/MM/YY');
        }
      }

      if (isEditMode && editingId) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/patients/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/patients`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setShowModal(false);
      setFormData({
        fullName: '', gender: 'Male', dateOfBirth: '', mobileNumber: '', email: '', address: '',
        bloodGroup: 'Unknown', allergies: '', existingConditions: '', currentMedicines: '', previousHistory: '',
        emergencyContactName: '', emergencyContactNumber: '', relationship: ''
      });
      fetchPatients();
    } catch (err) {
      console.error('Error saving patient:', err);
      alert('Failed to save patient. ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this patient?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/patients/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPatients();
    } catch (err) {
      console.error('Error deleting patient:', err);
      alert('Failed to delete patient. ' + (err.response?.data?.message || err.message));
    }
  };

  const displayedPatients = React.useMemo(() => {
    let filtered = patients;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.fullName?.toLowerCase().includes(q) ||
        p.patientId?.toLowerCase().includes(q) ||
        p.mobileNumber?.includes(q)
      );
    }
    if (selectedYear) {
      filtered = filtered.filter(p => p.registrationDate && new Date(p.registrationDate).getFullYear().toString() === selectedYear);
    }
    if (selectedMonth) {
      filtered = filtered.filter(p => p.registrationDate && (new Date(p.registrationDate).getMonth() + 1).toString().padStart(2, '0') === selectedMonth);
    }
    return filtered;
  }, [patients, searchQuery, selectedYear, selectedMonth]);

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedYear, selectedMonth]);

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const paginatedPatients = displayedPatients.slice(indexOfFirstRecord, indexOfLastRecord);

  const openEditModal = (p) => {
    setIsEditMode(true);
    setEditingId(p._id);
    let formattedDob = '';
    if (p.dateOfBirth) {
       const date = new Date(p.dateOfBirth);
       if (!isNaN(date)) {
          const dd = String(date.getDate()).padStart(2, '0');
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const yy = String(date.getFullYear());
          formattedDob = `${dd}/${mm}/${yy}`;
       }
    }
    setFormData({
      fullName: p.fullName || '',
      gender: p.gender || 'Male',
      dateOfBirth: formattedDob,
      mobileNumber: p.mobileNumber || '',
      email: p.email || '',
      address: p.address || '',
      bloodGroup: p.bloodGroup || 'Unknown',
      allergies: p.allergies || '',
      existingConditions: p.existingConditions || '',
      currentMedicines: p.currentMedicines || '',
      previousHistory: p.previousHistory || '',
      emergencyContactName: p.emergencyContactName || '',
      emergencyContactNumber: p.emergencyContactNumber || '',
      relationship: p.relationship || ''
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData({
      fullName: '', gender: 'Male', dateOfBirth: '', mobileNumber: '', email: '', address: '',
      bloodGroup: 'Unknown', allergies: '', existingConditions: '', currentMedicines: '', previousHistory: '',
      emergencyContactName: '', emergencyContactNumber: '', relationship: ''
    });
    setShowModal(true);
  };

  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/patients/birthdays/today`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTodayBirthdays(res.data);
      } catch (err) {
        console.error('Error fetching birthdays:', err);
      }
    };
    fetchBirthdays();
  }, []);

  const generateMessage = (patientName) => {
    return `Dear ${patientName}, wishing you a very Happy Birthday from Satguru Clinic! May you be blessed with good health, happiness, and a wonderful year ahead.`;
  };

  const handleCopyMessage = (patientName) => {
    const msg = generateMessage(patientName);
    navigator.clipboard.writeText(msg);
    alert('Message copied to clipboard!');
  };

  const handleWhatsApp = (patientName, mobileNumber) => {
    const msg = generateMessage(patientName);
    const encoded = encodeURIComponent(msg);
    // Remove any non-digit characters from the mobile number and prefix with country code if missing
    let phone = mobileNumber.replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone; // assuming India by default
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  const [historyModal, setHistoryModal] = useState({ show: false, patient: null, appointments: [], loading: false });

  const openHistory = async (patient) => {
    setHistoryModal({ show: true, patient, appointments: [], loading: true });
    try {
      const token = localStorage.getItem('token');
      // Fetch all appointments for this patient
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/appointments?patientId=${patient._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // The backend appointmentController might not support filtering by patientId. I need to make sure it does.
      setHistoryModal({ show: true, patient, appointments: res.data, loading: false });
    } catch (err) {
      console.error('Error fetching history', err);
      setHistoryModal({ show: true, patient, appointments: [], loading: false });
    }
  };

  return (
    <div className="task-page-container">
      <div className="page-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Patient Directory</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {todayBirthdays.length > 0 && (
            <button 
              onClick={() => setShowBirthdayModal(true)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                background: '#f0fdfa', 
                color: '#0d9488', border: '1px solid #14b8a6', 
                padding: '7px 14px', borderRadius: '8px', 
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
              {todayBirthdays.length} Birthday{todayBirthdays.length > 1 ? 's' : ''} Today
            </button>
          )}

          {isAdminOrTeam && (
            <button 
              onClick={openCreateModal}
              className="crm-btn crm-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              <PlusIcon size={16} /> Add Patient
            </button>
          )}
        </div>
      </div>

      <div className="patient-filter-bar">
        <div className="patient-search-input-box">
          <SearchIcon size={16} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Search by name, ID, or mobile..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
        </div>
        <div className="patient-filter-selects">
          <div className="patient-filter-select-item">
            <CustomSelect
              value={selectedYear}
              options={yearOptions}
              placeholder="All Years"
              onChange={val => setSelectedYear(val)}
            />
          </div>
          <div className="patient-filter-select-item">
            <CustomSelect
              value={selectedMonth}
              options={monthOptions}
              placeholder="All Months"
              onChange={val => setSelectedMonth(val)}
            />
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="desktop-table-wrap">
        <div className="table-container" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          {loading ? (
          <p style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>Loading patients...</p>
        ) : displayedPatients.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>No patients found.</p>
        ) : (
          <table className="crm-table">
            <thead>
              <tr>
                <th style={{ width: '56px', textAlign: 'center' }}>SR.NO</th>
                <th>PATIENT ID</th>
                <th>NAME</th>
                <th>AGE/GENDER</th>
                <th>CONTACT</th>
                <th>APPOINTMENTS</th>
                <th>CREATED BY</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'center', width: '90px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPatients.map((p, idx) => (
                <tr key={p._id}>
                  <td style={{ textAlign: 'center' }}><span className="sr-num-pill">{indexOfFirstRecord + idx + 1}</span></td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--primary-color, #144b79)', fontSize: '13px' }}>
                      {p.patientId}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                        color: '#0369a1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '12px',
                        flexShrink: 0
                      }}>
                        {p.fullName ? p.fullName.charAt(0).toUpperCase() : 'P'}
                      </div>
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '13.5px' }}>{p.fullName}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ color: '#475569', fontSize: '13px', fontWeight: 500 }}>
                      {p.age ? `${p.age} Yrs` : '—'} / {p.gender || '—'}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: '#334155', fontSize: '13px', fontWeight: 500, letterSpacing: '0.2px' }}>
                      {p.mobileNumber || '—'}
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => openHistory(p)}
                      style={{
                        background: '#f8fafc',
                        color: 'var(--primary-color, #144b79)',
                        border: '1px solid #cbd5e1',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f1f5f9';
                        e.currentTarget.style.borderColor = '#94a3b8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                      View
                    </button>
                  </td>
                  <td>
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                      {p.createdBy?.name || 'Admin'} <span style={{ color: '#94a3b8' }}>({p.createdBy?.role || 'admin'})</span>
                    </span>
                  </td>
                  <td>
                    <StatusDropdown 
                      value={p.status || 'Active'} 
                      onChange={(val) => handleStatusChange(p._id, val)}
                      options={PATIENT_STATUS_OPTIONS}
                      disabled={!isAdminOrTeam}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="table-action-icons-wrap" style={{ justifyContent: 'center' }}>
                      {isAdminOrTeam && (
                        <button className="action-btn edit tbl-icon-btn" onClick={() => openEditModal(p)} title="Edit Patient" aria-label="Edit Patient">
                          <EditIcon size={15} />
                        </button>
                      )}
                      {user.role === 'admin' && (
                        <button className="action-btn delete tbl-icon-btn" onClick={() => handleDelete(p._id)} title="Delete Patient" aria-label="Delete Patient">
                          <TrashIcon size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {displayedPatients.length > 0 && (
          <div className="desktop-only-pagination">
            <Pagination
              currentPage={currentPage}
              totalItems={displayedPatients.length}
              itemsPerPage={recordsPerPage}
              onPageChange={setCurrentPage}
              itemName="patients"
            />
          </div>
        )}
        </div>
      </div>
        
      {/* Responsive Card View for Mobile/Tablet */}
      <div className="mobile-cards-wrap">
        <div className="crm-card-view">
          {loading ? (
            <div className="empty-state">Loading patients...</div>
          ) : displayedPatients.length === 0 ? (
            <div className="empty-state">No patients found.</div>
          ) : (
            paginatedPatients.map((p) => (
              <div className="patient-card" key={p._id}>
                {/* Header: Avatar + Patient Info + Status */}
                <div className="patient-card-header">
                  <div className="patient-avatar-block">
                    <div className="patient-avatar">
                      {(p.fullName || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div className="patient-name-block">
                      <div className="patient-name-row">
                        <span className="patient-name" title={p.fullName || 'Unknown'}>
                          {p.fullName || 'Unknown'}
                        </span>
                        <span className="patient-id-badge">{p.patientId}</span>
                      </div>
                      <div className="patient-phone-row">
                        <PhoneIcon size={12} color="#94a3b8" />
                        <span>{p.mobileNumber || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="patient-status-wrap">
                    <StatusDropdown 
                      value={p.status || 'Active'} 
                      onChange={(val) => handleStatusChange(p._id, val)}
                      options={PATIENT_STATUS_OPTIONS}
                      disabled={!isAdminOrTeam}
                    />
                  </div>
                </div>

                {/* Demographics Banner */}
                <div className="patient-demographics-banner">
                  <div className="patient-demo-item">
                    <UserIcon size={13} color="#0284c7" />
                    <span>{p.age ? `${p.age} Yrs` : '—'} • {p.gender || '—'}</span>
                  </div>
                  {p.bloodGroup && p.bloodGroup !== 'Unknown' && (
                    <span className="patient-blood-badge">
                      🩸 {p.bloodGroup}
                    </span>
                  )}
                </div>

                {/* Creator & Details */}
                <div className="patient-card-body">
                  <div className="patient-body-row">
                    <span className="patient-body-label">Created By</span>
                    <span className="patient-body-val">
                      {p.createdBy?.name || 'Admin'} {p.createdBy?.role ? `(${p.createdBy.role})` : ''}
                    </span>
                  </div>
                  {p.dateOfBirth && (
                    <div className="patient-body-row">
                      <span className="patient-body-label">DOB</span>
                      <span className="patient-body-val">{formatDate(p.dateOfBirth)}</span>
                    </div>
                  )}
                </div>

                {/* Footer: View Appts & Action Buttons */}
                <div className="patient-card-footer">
                  <button 
                    type="button"
                    className="patient-appts-btn"
                    onClick={() => openHistory(p)}
                    title="View Appointments History"
                  >
                    <CalendarIcon size={13} /> View Appts
                  </button>

                  <div className="patient-actions-right">
                    {isAdminOrTeam && (
                      <button 
                        type="button"
                        className="action-btn edit tbl-icon-btn" 
                        onClick={() => openEditModal(p)} 
                        title="Edit Patient" 
                        aria-label="Edit Patient"
                      >
                        <EditIcon size={15} />
                      </button>
                    )}
                    {user.role === 'admin' && (
                      <button 
                        type="button"
                        className="action-btn delete tbl-icon-btn" 
                        onClick={() => handleDelete(p._id)} 
                        title="Delete Patient" 
                        aria-label="Delete Patient"
                      >
                        <TrashIcon size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {displayedPatients.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <Pagination
              currentPage={currentPage}
              totalItems={displayedPatients.length}
              itemsPerPage={recordsPerPage}
              onPageChange={setCurrentPage}
              itemName="patients"
            />
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', padding: '16px 20px', borderRadius: '12px' }}>
            <div className="modal-header" style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 className="modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary-color, #144b79)' }}>
                {isEditMode ? 'Edit Patient' : 'Add New Patient'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)} title="Close" aria-label="Close">
                <XIcon size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              
              {/* Basic Details Section */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '10px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserIcon size={13} color="var(--primary-color, #144b79)" />
                  Basic Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px', display: 'block' }}>Full Name *</label>
                    <input type="text" name="fullName" className="modal-text-input" placeholder="Enter full name" required value={formData.fullName} onChange={handleInputChange} style={{ height: '36px', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px', display: 'block' }}>Mobile Number *</label>
                    <input type="text" name="mobileNumber" className="modal-text-input" placeholder="Enter 10-digit mobile" required pattern="[0-9]{10}" title="Please enter exactly 10 digits" value={formData.mobileNumber} onChange={handleInputChange} style={{ height: '36px', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px', display: 'block' }}>Date of Birth *</label>
                    <input 
                      type="text" 
                      name="dateOfBirth" 
                      className="modal-text-input" 
                      placeholder="DD/MM/YYYY" 
                      value={formData.dateOfBirth} 
                      onChange={handleInputChange} 
                      required 
                      style={{ height: '36px', fontSize: '13px' }}
                    />
                    {formData.dateOfBirth && <div style={{ fontSize: '10.5px', color: '#0284c7', marginTop: '2px', fontWeight: 500 }}>Age: {calculateAgePreview(formData.dateOfBirth)} yrs</div>}
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px', display: 'block' }}>Gender *</label>
                    <CustomSelect 
                      value={formData.gender} 
                      options={GENDER_OPTIONS} 
                      placeholder="Select Gender" 
                      onChange={(val) => setFormData({ ...formData, gender: val })} 
                      style={{ height: '36px' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px', display: 'block' }}>Address</label>
                    <textarea name="address" className="modal-textarea-input" placeholder="Enter residential address..." rows="1" value={formData.address} onChange={handleInputChange} style={{ minHeight: '42px', padding: '6px 10px', fontSize: '12.5px' }} />
                  </div>
                </div>
              </div>

              {/* Medical Details Section */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '10px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  Medical Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px', display: 'block' }}>Blood Group</label>
                    <CustomSelect 
                      value={formData.bloodGroup} 
                      options={BLOOD_GROUP_OPTIONS} 
                      placeholder="Select Blood Group" 
                      onChange={(val) => setFormData({ ...formData, bloodGroup: val })} 
                      style={{ height: '36px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px', display: 'block' }}>Allergies</label>
                    <TagInput 
                      name="allergies" 
                      value={formData.allergies} 
                      onChange={handleInputChange} 
                      placeholder="e.g. Peanuts, Penicillin..."
                      suggestions={['None', 'Peanuts', 'Penicillin', 'Dust', 'Pollen', 'Latex', 'Aspirin', 'Dairy', 'Eggs']}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px', display: 'block' }}>Existing Conditions</label>
                    <TagInput 
                      name="existingConditions" 
                      value={formData.existingConditions} 
                      onChange={handleInputChange} 
                      placeholder="e.g. Diabetes, Hypertension..."
                      suggestions={['None', 'Diabetes', 'Hypertension', 'Asthma', 'Thyroid', 'Heart Disease', 'Arthritis']}
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Details Section */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '10px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  Emergency Contact
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px', display: 'block' }}>Contact Name</label>
                    <input type="text" name="emergencyContactName" className="modal-text-input" placeholder="e.g. Guardian / Relative" value={formData.emergencyContactName} onChange={handleInputChange} style={{ height: '36px', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px', display: 'block' }}>Contact Number</label>
                    <input type="text" name="emergencyContactNumber" className="modal-text-input" placeholder="10-digit number" pattern="[0-9]{10}" title="Please enter exactly 10 digits" value={formData.emergencyContactNumber} onChange={handleInputChange} style={{ height: '36px', fontSize: '13px' }} />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', marginTop: '2px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setShowModal(false)} style={{ padding: '6px 16px', fontSize: '12.5px', borderRadius: '7px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="crm-btn crm-btn-primary" style={{ padding: '6px 18px', fontSize: '12.5px', borderRadius: '7px', cursor: 'pointer' }}>
                  {isEditMode ? 'Update Patient' : 'Save Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Birthday Modal */}
      {showBirthdayModal && (
        <div className="modal-overlay" onClick={() => setShowBirthdayModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Today's Birthdays</h3>
              <button className="modal-close" onClick={() => setShowBirthdayModal(false)} title="Close" aria-label="Close">
                <XIcon size={16} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                            {todayBirthdays.map(p => (
                <div key={p._id} style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px',
                  display: 'flex', alignItems: 'center', gap: '12px'
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                    {p.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>{p.fullName}</div>
                    <div style={{ color: '#94a3b8', fontSize: '14px' }}>|</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{p.patientId}</div>
                    <div style={{ color: '#94a3b8', fontSize: '14px' }}>|</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{p.mobileNumber}</div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleCopyMessage(p.fullName)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', 
                        padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', 
                        fontSize: '13px', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                      title="Copy Message"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      Copy
                    </button>
                    {p.mobileNumber && (
                      <button 
                        onClick={() => handleWhatsApp(p.fullName, p.mobileNumber)}
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '6px',
                          background: '#25D366', border: 'none', color: '#ffffff', 
                          padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', 
                          fontSize: '13px', fontWeight: 600, boxShadow: '0 2px 4px rgba(37, 211, 102, 0.2)',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#20bd5a'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#25D366'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        title="Send via WhatsApp"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                        </svg>
                        WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* History Modal */}
      {historyModal.show && (
        <div className="modal-overlay" onClick={() => setHistoryModal({ ...historyModal, show: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Appointment History - {historyModal.patient?.fullName}</h3>
              <button onClick={() => setHistoryModal({ ...historyModal, show: false })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94a3b8' }}>&times;</button>
            </div>
            
            {historyModal.loading ? (
              <p style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Loading history...</p>
            ) : historyModal.appointments.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>No appointments found for this patient.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                {historyModal.appointments.map(app => (
                  <div key={app._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>
                        {formatDate(app.appointmentDate)} at {app.timeSlot}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Reason: {app.reason || 'Not specified'}</div>
                      {app.services && <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>Services: {app.services}</div>}
                      {app.packages && <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>Packages: {app.packages}</div>}
                      {(!app.services && !app.packages && app.serviceOrPackage) && <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>Service/Pkg: {app.serviceOrPackage}</div>}
                    </div>
                    <div>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                        background: app.status === 'Completed' ? '#dcfce7' : app.status === 'Cancelled' ? '#fee2e2' : '#dbeafe',
                        color: app.status === 'Completed' ? '#166534' : app.status === 'Cancelled' ? '#991b1b' : '#1e40af'
                      }}>
                        {app.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientManagement;

















