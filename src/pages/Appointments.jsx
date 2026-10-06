import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SaleEntryModal from '../components/SaleEntryModal';
import axios from 'axios';
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, FilterIcon, PhoneIcon, CalendarIcon, ClockIcon, UserIcon, InfoIcon, XIcon } from '../components/Icons';
import StatusDropdown from '../components/StatusDropdown';
import CustomSelect from '../components/CustomSelect';
import CustomTimePicker from '../components/CustomTimePicker';
import CalendarPicker from '../components/CalendarPicker';
import Pagination from '../components/Pagination';
import { formatDate, formatDisplayTime } from '../utils/formatDate';
import '../App.css';

const Appointments = () => {

  const MONTH_LIST = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];
  
  const YEAR_OPTIONS = [];
  const currentY = new Date().getFullYear();
  for(let i=currentY-3; i<=currentY+5; i++) {
    YEAR_OPTIONS.push({ value: i.toString(), label: i.toString() });
  }

  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilterType, setDateFilterType] = useState("date");
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [systemUsers, setSystemUsers] = useState([]);
  const [creatorFilter, setCreatorFilter] = useState("all");

  const recordsPerPage = 10;
  const [showModal, setShowModal] = useState(false);
  const [mobile, setMobile] = useState('');
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [showEditInvoiceModal, setShowEditInvoiceModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ id: null, date: '', time: '10:00' });
  const [rescheduleDateError, setRescheduleDateError] = useState('');
  const [selectedDetails, setSelectedDetails] = useState(null);

  const [saleModalData, setSaleModalData] = useState({ mobile: '', name: '' });
  const [patientData, setPatientData] = useState(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState('');
  const [bloodGroup, setBloodGroup] = useState('Unknown');
  const [allergies, setAllergies] = useState('');
  const [existingConditions, setExistingConditions] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactNumber, setEmergencyContactNumber] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('10:00');
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [reason, setReason] = useState('General Consultation');
    const [dobError, setDobError] = useState('');
    const [apptDateError, setApptDateError] = useState('');
    const [ageError, setAgeError] = useState('');
  const [editId, setEditId] = useState(null);

  
  const handleBilledClick = async (a) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const invoices = res.data;
      const matching = invoices.find(inv => inv.mobile === a.patientId?.mobileNumber && inv.client === a.patientId?.fullName);
      if (matching) {
        setSaleModalData({
            mobile: a.patientId?.mobileNumber || '',
            name: a.patientId?.fullName || '',
            appointment: a,
            invoice: matching
        });
        setShowSaleModal(true);
      } else {
        alert("Invoice not found for this patient.");
      }
    } catch (e) {
      console.error(e);
      alert("Error finding invoice");
    }
  };

    const handleEditInvoiceSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const diff = Number(editingInvoice.total || 0) - Number(editingInvoice._originalTotal || 0);
      const newBalance = Number(editingInvoice.balance || 0) + diff;
      const payload = { ...editingInvoice, balance: newBalance };
      delete payload._originalTotal;
      
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/invoices/${editingInvoice._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowEditInvoiceModal(false);
      alert("Bill updated successfully!");
    } catch (err) {
      alert("Error updating bill");
    }
  };


  const handleEditClick = (a) => {
    setEditId(a._id);
    setMobile(a.patientId?.mobileNumber || '');
    setPatientData(a.patientId);
    setAppointmentDate(formatDate(a.appointmentDate));
    setTimeSlot(a.timeSlot || '10:00');
    setReason(a.reason || '');
    setSelectedServices(a.services ? a.services.split(', ') : []);
    setSelectedPackages(a.packages ? a.packages.split(', ') : []);
    setSelectedMedicines(a.medicines ? a.medicines.split(', ').map(str => {
        let nameStr = str;
        let dosage = '';
        let qty = 1;
        
        // Match dosage at the end if exists and doesn't start with Qty:
        const dosageMatch = nameStr.match(/(.*?) \[([^\]]+)\]$/);
        if (dosageMatch && !dosageMatch[2].startsWith('Qty:')) {
            nameStr = dosageMatch[1];
            dosage = dosageMatch[2];
        }

        // Match Qty block
        const qtyMatch = nameStr.match(/(.*?) \[Qty: (\d+)\]$/);
        if (qtyMatch) {
            nameStr = qtyMatch[1];
            qty = parseInt(qtyMatch[2], 10) || 1;
        }

        let baseName = nameStr;
        let basePrice = 0;
        
        const priceMatch = nameStr.match(/^(.*?) \(₹(\d+(\.\d+)?)\)$/);
        if (priceMatch) {
            baseName = priceMatch[1];
            // Since nameStr has total price, basePrice = total / qty
            basePrice = parseFloat(priceMatch[2]) / qty;
        }
        
        return { nameStr, dosage, baseName, basePrice, qty };
        return { nameStr, dosage, baseName, basePrice, qty };
      }) : []);
    setShowModal(true);
  };

  const openModal = () => {
    setEditId(null);
    setMobile('');
    setPatientData(null);
    setIsNewPatient(false);
    setName('');
    setGender('Male');
    setDateOfBirth('');
    setAge('');
    setBloodGroup('Unknown');
    setAllergies('');
    setExistingConditions('');
    setEmergencyContactName('');
    setEmergencyContactNumber('');
    setSelectedServices([]);
    setSelectedPackages([]);
    setReason('General Consultation');

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    setAppointmentDate(`${dd}/${mm}/${yy}`);

    let hours = now.getHours();
    let minutes = now.getMinutes() < 30 ? '00' : '30';
    setTimeSlot(`${String(hours).padStart(2, '0')}:${minutes}`);

    setShowModal(true);
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdminOrTeam = ['superadmin', 'admin', 'team'].includes(user.role);

  const [services, setServices] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    fetchAppointments();
    fetchServicesAndPackages();
    fetchSystemUsers();
  }, []);

  
  const fetchSystemUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSystemUsers(res.data);
    } catch(err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchServicesAndPackages = async () => {
    try {
      const token = localStorage.getItem('token');
      const [srvRes, pkgRes, medRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/services`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/packages`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/medicines`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setServices(srvRes.data);
      setPackages(pkgRes.data);
      setMedicines(medRes.data);
    } catch (err) {
      console.error('Error fetching services/packages', err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(res.data);
    } catch (err) {
      console.error('Error fetching appointments', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMobileChange = async (e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length > 10) return;
    setMobile(val);
    if (val.length === 10) {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/patients/search?mobile=${val}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPatientData(res.data);
        setIsNewPatient(false);
      } catch (err) {
        setPatientData(null);
        setIsNewPatient(true);
      }
    } else {
      setPatientData(null);
      setIsNewPatient(false);
    }
  };

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

  const calculateAge = (dobStr) => {
    if (!dobStr) return '';
    const birthDate = parseDDMMYY(dobStr);
    if (!birthDate) return '';
    const today = new Date();
    let a = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      a--;
    }
    return a;
  };

  const formatDateInput = (val) => {
    let v = val.replace(/[^\d/]/g, '').replace(/\/+/g, '/');
    if (v.startsWith('/')) v = v.substring(1);
    let parts = v.split('/');
    if (parts[0] && parts[0].length > 2) {
        const p0 = parts[0];
        parts[0] = p0.substring(0, 2);
        parts.splice(1, 0, p0.substring(2));
    }
    if (parts[1] && parts[1].length > 2) {
        const p1 = parts[1];
        parts[1] = p1.substring(0, 2);
        parts.splice(2, 0, p1.substring(2));
    }
    if (parts.length > 3) parts.length = 3;
    if (parts[2] && parts[2].length > 4) parts[2] = parts[2].substring(0, 4);
    
    // if the original string ended with a slash, and we didn't naturally create a new part, preserve it
    // actually parts.join('/') will preserve empty parts like ['12', ''] -> '12/'
    return parts.join('/');
};

  const validateDateStr = (str, isBirth = false) => {
    if (str.length < 8) return '';
    const parts = str.split('/');
    if (parts.length !== 3) return '';
    const yStr = parts[2];
    if (yStr.length === 3) return 'Invalid year format';
    
    let [d, m, y] = parts.map(n => parseInt(n, 10));
    if (yStr.length === 4 && y < 1850) return 'Year must be > 1850';
    if (y < 100) y += (y > 30 ? 1900 : 2000);
    
    if (m < 1 || m > 12) return 'Invalid month (01-12)';
    const days = new Date(y, m, 0).getDate();
    if (d < 1 || d > days) return 'Invalid day for this month';
    const parsedDate = new Date(y, m - 1, d);
    const today = new Date();
    if (isBirth) {
      if (parsedDate > today) return 'Birth date cannot be in the future';
      let age = today.getFullYear() - parsedDate.getFullYear();
      const mDiff = today.getMonth() - parsedDate.getMonth();
      if (mDiff < 0 || (mDiff === 0 && today.getDate() < parsedDate.getDate())) age--;
      if (age > 150) return 'Age cannot be greater than 150';
    } else {
       today.setHours(0,0,0,0);
       if (parsedDate < today) return 'Appointment cannot be in the past';
    }
    return '';
  };

  const handleDobChange = (e) => {
    const dob = formatDateInput(e.target.value);
    setDateOfBirth(dob);
    const err = validateDateStr(dob, true);
    setDobError(err);
    if (!err && dob.length >= 8) {
      const calculatedAge = calculateAge(dob);
      if (calculatedAge !== '') {
        setAge(calculatedAge.toString());
        if (parseInt(calculatedAge, 10) > 150) setAgeError('Age seems invalid (max 150)');
        else setAgeError('');
      }
    } else {
      setAge('');
    }
  };

  const handleApptDateChange = (e) => {
    const appt = formatDateInput(e.target.value);
    setAppointmentDate(appt);
    setApptDateError(validateDateStr(appt, false));
  };

  const handleAgeChange = (e) => {
    const val = e.target.value;
    setAge(val);
    if (val && parseInt(val, 10) > 150) {
      setAgeError('Age seems invalid (max 150)');
    } else {
      setAgeError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      const parsedDobDate = parseDDMMYY(dateOfBirth);
      const dobPayload = parsedDobDate ? parsedDobDate.toISOString().split('T')[0] : null;

      const parsedApptDate = parseDDMMYY(appointmentDate);
      if (!parsedApptDate) return alert('Invalid Appointment Date format. Use DD/MM/YY');
      const apptPayload = parsedApptDate.toISOString().split('T')[0];

      let pId;
      if (isNewPatient) {
        const pRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/patients`, {
          fullName: name, mobileNumber: mobile, age: Number(age), gender, dateOfBirth: dobPayload,
          bloodGroup, allergies, existingConditions, emergencyContactName, emergencyContactNumber
        }, { headers: { Authorization: `Bearer ${token}` } });
        pId = pRes.data._id;
      } else if (patientData) {
        pId = patientData._id;
      }

      if (!pId) return alert('Patient missing');

      const formatTime12Hour = (time24) => {
        return formatDisplayTime(time24);
      };

      const servicesStr = selectedServices.join(', ');
      const packagesStr = selectedPackages.join(', ');
      const medicinesStr = selectedMedicines.map(m => {
          let str = `${m.nameStr} [Qty: ${m.qty || 1}]`;
          if (m.dosage) str += ` [${m.dosage}]`;
          return str;
      }).join(', ');
      const payload = { patientId: pId, appointmentDate: apptPayload, timeSlot: formatTime12Hour(timeSlot), reason, services: servicesStr, packages: packagesStr, medicines: medicinesStr };
      if (editId) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/appointments/${editId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/appointments`, payload, { headers: { Authorization: `Bearer ${token}` } });
      }

      setShowModal(false);
      setMobile(''); setPatientData(null); setIsNewPatient(false);
      setName(''); setAge(''); setDateOfBirth(''); setAppointmentDate(''); setTimeSlot('');
      fetchAppointments();
    } catch (err) {
      alert('Error creating appointment: ' + (err.response?.data?.message || err.message));
    }
  };

    const handleStatusChange = async (id, status) => {
    if (status === 'Rescheduled') {
        const appointment = appointments.find(a => a._id === id);
        if (appointment) {
            // Set today's date as default for reschedule
            const now = new Date();
            const dd = String(now.getDate()).padStart(2, '0');
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const yy = String(now.getFullYear()).slice(-2);
            setRescheduleData({ 
                id, 
                date: `${dd}/${mm}/${yy}`, 
                time: appointment.timeSlot || '10:00' 
            });
            setRescheduleDateError('');
            setShowRescheduleModal(true);
        }
        return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/appointments/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      fetchAppointments();
    } catch (err) {
      alert('Error updating status');
    }
  };

  const handleRescheduleDateChange = (e) => {
    const appt = formatDateInput(e.target.value);
    setRescheduleData(prev => ({ ...prev, date: appt }));
    setRescheduleDateError(validateDateStr(appt, false));
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (rescheduleDateError) return alert("Please fix date errors first");
    const parsedDate = parseDDMMYY(rescheduleData.date);
    if (!parsedDate) return alert("Invalid date format. Use DD/MM/YYYY");
    
    try {
      const token = localStorage.getItem('token');
      const payload = {
        appointmentDate: parsedDate.toISOString().split('T')[0],
        timeSlot: rescheduleData.time,
        status: 'Rescheduled'
      };
      
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/appointments/${rescheduleData.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowRescheduleModal(false);
      alert('Appointment rescheduled successfully');
      fetchAppointments();
    } catch(err) {
      alert("Error rescheduling appointment");
    }
  };

  const GENDER_OPTIONS = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' }
  ];

  const TIME_SLOT_OPTIONS = [
    { value: '10:00 AM', label: '10:00 AM' },
    { value: '10:30 AM', label: '10:30 AM' },
    { value: '11:00 AM', label: '11:00 AM' },
    { value: '11:30 AM', label: '11:30 AM' },
    { value: '12:00 PM', label: '12:00 PM' },
    { value: '12:30 PM', label: '12:30 PM' },
    { value: '01:00 PM', label: '01:00 PM' },
    { value: '04:00 PM', label: '04:00 PM' },
    { value: '04:30 PM', label: '04:30 PM' },
    { value: '05:00 PM', label: '05:00 PM' },
    { value: '05:30 PM', label: '05:30 PM' },
    { value: '06:00 PM', label: '06:00 PM' },
    { value: '06:30 PM', label: '06:30 PM' },
    { value: '07:00 PM', label: '07:00 PM' },
    { value: '07:30 PM', label: '07:30 PM' },
    { value: '08:00 PM', label: '08:00 PM' },
  ];

  const APPOINTMENT_STATUS_OPTIONS = [
    { value: 'Scheduled', label: 'Scheduled', color: '#3b82f6' }, // Blue
    { value: 'Completed', label: 'Completed', color: '#10b981' }, // Green
    { value: 'Cancelled', label: 'Cancelled', color: '#ef4444' }, // Red
    { value: 'Rescheduled', label: 'Rescheduled', color: '#8b5cf6' }, // Purple
  ];

  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, creatorFilter, dateFilterType, singleDate, startDate, endDate, filterMonth, filterYear]);


  const creatorOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Creators' }];
    systemUsers.forEach(u => {
      options.push({ value: u._id, label: u.name || 'Unknown' });
    });
    return options;
  }, [systemUsers]);

    const isApptOverdue = (app) => {
    if (app.status === 'Completed' || app.status === 'Cancelled') return false;
    if (!app.appointmentDate) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    const appDate = new Date(app.appointmentDate);
    if (isNaN(appDate.getTime())) return false;
    const appStr = appDate.toISOString().split('T')[0];
    return appStr < todayStr;
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = app.patientId?.fullName?.toLowerCase().includes(query);
        const matchesMobile = app.patientId?.mobileNumber?.toLowerCase().includes(query);
        const matchesReason = app.reason?.toLowerCase().includes(query);
        if (!matchesName && !matchesMobile && !matchesReason) return false;
      }
      if (statusFilter && statusFilter !== "all") {
        if (app.status !== statusFilter) return false;
      }
      if (creatorFilter && creatorFilter !== "all") {
        if (app.createdBy?._id !== creatorFilter) return false;
      }
      if (app.appointmentDate) {
        const appDateStr = new Date(app.appointmentDate).toISOString().split("T")[0];
        if (dateFilterType === "date" && singleDate) {
          if (appDateStr !== singleDate) return false;
        } else if (dateFilterType === "range" && (startDate || endDate)) {
          if (startDate && appDateStr < startDate) return false;
          if (endDate && appDateStr > endDate) return false;
        } else if (dateFilterType === "month") {
          if (filterYear && !appDateStr.startsWith(filterYear)) return false;
          if (filterMonth && appDateStr.split("-")[1] !== filterMonth) return false;
        }
      }
      return true;
    });
  }, [appointments, searchQuery, statusFilter, creatorFilter, dateFilterType, singleDate, startDate, endDate, filterMonth, filterYear]);

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentAppointments = filteredAppointments.slice(indexOfFirstRecord, indexOfLastRecord);

  return (
    <div className="task-page-container">
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <h2>Appointments Schedule</h2>
        <button onClick={openModal} className="crm-btn crm-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PlusIcon /> Add Appointment
        </button>
      </div>

                {/* Filters Row */}
        <div className="task-controls-card" style={{ marginBottom: '16px', background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', flex: '1', minWidth: '200px' }}>
              <SearchIcon size={16} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Search patient name, mobile, reason..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', padding: '10px', width: '100%', outline: 'none', fontSize: '14px' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  <XIcon size={14} />
                </button>
              )}
            </div>

            
            {/* Creator Filter */}
            <div style={{ minWidth: '150px' }}>
              <CustomSelect 
                value={creatorFilter} 
                onChange={setCreatorFilter}
                options={creatorOptions}
                placeholder="All Creators"
              />
            </div>

            {/* Status Filter */}
            <div style={{ minWidth: '150px' }}>
              <CustomSelect 
                value={statusFilter} 
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'Scheduled', label: 'Scheduled' },
                  { value: 'Completed', label: 'Completed' },
                  { value: 'Cancelled', label: 'Cancelled' },
                  { value: 'No Show', label: 'No Show' }
                ]}
                placeholder="All Status"
              />
            </div>

            {/* Date Filter Type */}
            <div style={{ minWidth: '150px' }}>
              <CustomSelect 
                value={dateFilterType} 
                onChange={(val) => {
                  setDateFilterType(val);
                  setSingleDate(""); setStartDate(""); setEndDate(""); setFilterMonth(""); setFilterYear("");
                }}
                options={[
                  { value: 'all', label: 'All Dates' },
                  { value: 'month', label: 'By Month' },
                  { value: 'date', label: 'Single Date' },
                  { value: 'range', label: 'Date Range' }
                ]}
                placeholder="All Dates"
              />
            </div>

            {/* Dynamic Date Inputs based on Type */}
            {dateFilterType === 'month' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ minWidth: '110px' }}>
                  <CustomSelect 
                    value={filterMonth} 
                    onChange={setFilterMonth}
                    options={[{value:'', label:'Month'}, ...MONTH_LIST]}
                    placeholder="Month"
                  />
                </div>
                <div style={{ minWidth: '100px' }}>
                  <CustomSelect 
                    value={filterYear} 
                    onChange={setFilterYear}
                    options={[{value:'', label:'Year'}, ...YEAR_OPTIONS]}
                    placeholder="Year"
                  />
                </div>
              </div>
            )}

            {dateFilterType === 'date' && (
              <div style={{ minWidth: '150px' }}>
                <CalendarPicker 
                  selectedDate={singleDate} 
                  onChange={setSingleDate}
                  placeholder="Select Date"
                />
              </div>
            )}

            {dateFilterType === 'range' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ minWidth: '140px' }}>
                  <CalendarPicker 
                    selectedDate={startDate} 
                    onChange={setStartDate}
                    placeholder="Start Date"
                  />
                </div>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>to</span>
                <div style={{ minWidth: '140px' }}>
                  <CalendarPicker 
                    selectedDate={endDate} 
                    onChange={setEndDate}
                    placeholder="End Date"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Table View */}
      <div className="desktop-table-wrap">
        <div className="table-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}><div className="global-loader-container"><div className="global-spinner"></div><div>Loading appointments...</div></div></div>
          ) : filteredAppointments.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>No appointments found.</p>
          ) : (
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Appointment Date & Time</th>
                  <th>Booking Date</th>
                  <th>Patient Name</th>
                  <th>Mobile</th>
                  <th style={{ textAlign: 'center' }}>Details</th>
                  <th>Reason</th>
                  <th>Created By</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right', paddingRight: '20px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentAppointments.map(a => (
                  <tr key={a._id} className="task-row">
                    <td>
                      <div className="tbl-timing-pill">
                        <CalendarIcon size={12} color={isApptOverdue(a) ? "#ef4444" : "currentColor"} />
                          <span style={isApptOverdue(a) ? { color: '#ef4444', fontWeight: 'bold' } : {}}>{formatDate(a.appointmentDate)}</span>
                        <span style={{ color: '#0369a1', fontWeight: 600 }}>• {formatDisplayTime(a.timeSlot, a.appointmentDate)}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(a.createdAt)}</span>
                    </td>
                    <td>
                      <div className="tbl-user-cell">
                        <div className="tbl-user-avatar" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
                          {(a.patientId?.fullName || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div className="tbl-user-info">
                          <span className="tbl-user-name">{a.patientId?.fullName || 'Unknown'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="tbl-mobile-text">{a.patientId?.mobileNumber || '—'}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="action-btn view"
                        onClick={() => { setSelectedDetails(a); setShowDetailsModal(true); }}
                        title="View Details"
                        aria-label="View Details"
                      >
                        <InfoIcon size={15} />
                      </button>
                    </td>
                    <td>
                      <span style={{ fontSize: '12.5px', color: '#334155' }}>{a.reason || 'General Consultation'}</span>
                    </td>
                    <td>
                      <span className="tbl-role-badge badge-team" style={{ fontSize: '11px' }}>
                        {a.createdBy?.name || 'Admin'} {a.createdBy?.role ? `(${a.createdBy.role})` : ''}
                      </span>
                    </td>
                    <td>
                      <StatusDropdown 
                        value={a.status} 
                        onChange={(val) => handleStatusChange(a._id, val)}
                        options={APPOINTMENT_STATUS_OPTIONS}
                        disabled={!isAdminOrTeam}
                      />
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                      {isAdminOrTeam && (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
                          {!a.hasSaleEntry ? (
                            <button 
                              className="sale-entry-btn"
                              onClick={() => { setSaleModalData({ mobile: a.patientId?.mobileNumber || '', name: a.patientId?.fullName || '', appointment: a }); setShowSaleModal(true); }} 
                              title="Create Sale Entry"
                            >
                              + Sale Entry
                            </button>
                          ) : (
                            <button onClick={() => handleBilledClick(a)}  className="billed-edit-btn"><span>Billed</span></button>
                          )}
                          <button 
                            className="action-btn edit"
                            title="Edit Appointment"
                            aria-label="Edit Appointment"
                            onClick={() => handleEditClick(a)} 
                          >
                            <EditIcon size={16} />
                          </button>
                          <button 
                            className="action-btn delete"
                            title="Delete Appointment"
                            aria-label="Delete Appointment"
                            onClick={async () => {
                              if (window.confirm('Delete this appointment?')) {
                                try {
                                  const token = localStorage.getItem('token');
                                  await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/appointments/${a._id}`, { headers: { Authorization: `Bearer ${token}` } });
                                  fetchAppointments();
                                } catch (err) { alert('Error deleting'); }
                              }
                            }} 
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {filteredAppointments.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredAppointments.length}
              itemsPerPage={recordsPerPage}
              onPageChange={setCurrentPage}
              itemName="appointments"
            />
          )}
        </div>
      </div>

      {/* Responsive Card View for Mobile & Tablet (sm: 1 card, md: 2 cards) */}
      <div className="mobile-cards-wrap">
        <div className="crm-card-view">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}><div className="global-loader-container"><div className="global-spinner"></div><div>Loading appointments...</div></div></div>
          ) : filteredAppointments.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>No appointments found.</p>
          ) : (
            currentAppointments.map(a => (
              <div className="appointment-card" key={a._id}>
                {/* Top: Avatar + Patient Info + Status Dropdown */}
                <div className="appt-card-top">
                  <div className="appt-patient-block">
                    <div className="appt-avatar">
                      {(a.patientId?.fullName || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div className="appt-patient-info">
                      <span className="appt-patient-name" title={a.patientId?.fullName || 'Unknown'}>
                        {a.patientId?.fullName || 'Unknown'}
                      </span>
                      <span className="appt-patient-phone">
                        <PhoneIcon size={12} color="#94a3b8" />
                        {a.patientId?.mobileNumber || '—'}
                      </span>
                    </div>
                  </div>
                  <div className="appt-status-box">
                    <StatusDropdown 
                      value={a.status} 
                      onChange={(val) => handleStatusChange(a._id, val)}
                      options={APPOINTMENT_STATUS_OPTIONS}
                      disabled={!isAdminOrTeam}
                    />
                  </div>
                </div>

                {/* Timing Pill Banner */}
                <div className="appt-schedule-banner">
                  <div className="appt-schedule-item">
                    <CalendarIcon size={13} color={isApptOverdue(a) ? "#ef4444" : "#0284c7"} />
                      <span style={isApptOverdue(a) ? { color: '#ef4444', fontWeight: 'bold' } : {}}>{formatDate(a.appointmentDate)}</span>
                  </div>
                  <div className="appt-schedule-item" style={{ color: '#0369a1' }}>
                    <ClockIcon size={13} color="#0284c7" />
                    <span>{formatDisplayTime(a.timeSlot, a.appointmentDate)}</span>
                  </div>
                </div>

                {/* Meta details */}
                <div className="appt-card-body">
                  <div className="appt-body-row">
                    <span className="appt-body-label">Reason</span>
                    <span className="appt-body-val" title={a.reason || 'General Consultation'}>
                      {a.reason || 'General Consultation'}
                    </span>
                  </div>
                  <div className="appt-body-row">
                    <span className="appt-body-label">Created By</span>
                    <span className="appt-body-val">
                      {a.createdBy?.name || 'Admin'} {a.createdBy?.role ? `(${a.createdBy.role})` : ''}
                    </span>
                  </div>
                  <div className="appt-body-row">
                    <span className="appt-body-label">Booked On</span>
                    <span className="appt-body-val">{formatDate(a.createdAt)}</span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="appt-card-footer">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isAdminOrTeam && (
                      !a.hasSaleEntry ? (
                        <button 
                          type="button"
                          className="appt-sale-entry-btn"
                          onClick={() => { 
                            setSaleModalData({ mobile: a.patientId?.mobileNumber || '', name: a.patientId?.fullName || '', appointment: a }); 
                            setShowSaleModal(true); 
                          }} 
                          title="Create Sale Entry"
                        >
                          + Sale Entry
                        </button>
                      ) : (
                        <button onClick={() => handleBilledClick(a)}  className="billed-edit-btn"><span>Billed</span></button>
                      )
                    )}
                    <button 
                      type="button"
                      className="appt-view-details-btn"
                      onClick={() => { setSelectedDetails(a); setShowDetailsModal(true); }}
                      title="View Details"
                    >
                      <InfoIcon size={13} /> Details
                    </button>
                  </div>

                  {isAdminOrTeam && (
                    <div className="appt-actions-right">
                      <button 
                        type="button"
                        className="action-btn edit tbl-icon-btn"
                        title="Edit Appointment"
                        aria-label="Edit Appointment"
                        onClick={() => handleEditClick(a)} 
                      >
                        <EditIcon size={15} />
                      </button>
                      <button 
                        type="button"
                        className="action-btn delete tbl-icon-btn"
                        title="Delete Appointment"
                        aria-label="Delete Appointment"
                        onClick={async () => {
                          if (window.confirm('Delete this appointment?')) {
                            try {
                              const token = localStorage.getItem('token');
                              await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/appointments/${a._id}`, { headers: { Authorization: `Bearer ${token}` } });
                              fetchAppointments();
                            } catch (err) { alert('Error deleting'); }
                          }
                        }} 
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {filteredAppointments.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <Pagination
              currentPage={currentPage}
              totalItems={filteredAppointments.length}
              itemsPerPage={recordsPerPage}
              onPageChange={setCurrentPage}
              itemName="appointments"
            />
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Edit Appointment' : 'Add New Appointment'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)} title="Close" aria-label="Close">
                <XIcon size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="modal-label">Patient Mobile Number *</label>
                <div style={{ position: 'relative' }}>
                  <input autoFocus type="text" className="modal-text-input" placeholder="Enter 10-digit number" value={mobile} onChange={handleMobileChange} required />
                  {mobile.length === 10 && patientData && (
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#16a34a', fontSize: '12px', fontWeight: 700, background: '#f0fdf4', padding: '2px 8px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                      ✓ Found
                    </span>
                  )}
                  {mobile.length === 10 && isNewPatient && (
                    <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', lineHeight: '1.2' }}>
                      NEW PATIENT
                    </span>
                  )}
                </div>
              </div>

              {patientData && (
                <div className="patient-identity-card">
                  <div className="patient-identity-avatar">
                    {patientData.fullName ? patientData.fullName.charAt(0).toUpperCase() : 'P'}
                  </div>
                  <div className="patient-identity-body">
                    <div className="patient-identity-top">
                      <span className="patient-identity-name">{patientData.fullName}</span>
                      {patientData.patientId && (
                        <span className="patient-id-badge">ID: {patientData.patientId}</span>
                      )}
                    </div>
                    <div className="patient-identity-meta">
                      {patientData.age && (
                        <span className="patient-meta-tag">{patientData.age} Yrs</span>
                      )}
                      {patientData.gender && (
                        <span className="patient-meta-tag">{patientData.gender}</span>
                      )}
                      {patientData.bloodGroup && patientData.bloodGroup !== 'Unknown' && (
                        <span className="patient-meta-tag blood">{patientData.bloodGroup}</span>
                      )}
                      <span className="patient-verified-tag">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Registered
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {isNewPatient && (
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="modal-label">Full Name *</label>
                      <input type="text" className="modal-text-input" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="modal-label">Birth Date *</label>
                      <input type="text" className="modal-text-input" placeholder="DD/MM/YYYY" value={dateOfBirth} onChange={handleDobChange} required />
                        {dobError && <div style={{color: 'red', fontSize: '11px', marginTop: '4px'}}>{dobError}</div>}
                    </div>
                    <div>
                      <label className="modal-label">Age *</label>
                      <input type="number" className="modal-text-input" value={age} onChange={handleAgeChange} required />
                        {ageError && <div style={{color: 'red', fontSize: '11px', marginTop: '4px'}}>{ageError}</div>}
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="modal-label">Gender *</label>
                      <StatusDropdown 
                        value={gender} 
                        onChange={(val) => setGender(val)}
                        options={GENDER_OPTIONS}
                      />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>Medical Details</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="modal-label">Blood Group</label>
                        <CustomSelect 
                          value={bloodGroup}
                          options={['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => ({value: bg, label: bg}))}
                          onChange={val => setBloodGroup(val)}
                        />
                      </div>
                      <div>
                        <label className="modal-label">Allergies</label>
                        <input type="text" className="modal-text-input" placeholder="e.g. Peanuts..." value={allergies} onChange={e => setAllergies(e.target.value)} />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="modal-label">Existing Conditions</label>
                        <input type="text" className="modal-text-input" placeholder="e.g. Diabetes..." value={existingConditions} onChange={e => setExistingConditions(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>Emergency Contact</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="modal-label">Contact Name</label>
                        <input type="text" className="modal-text-input" placeholder="e.g. Guardian" value={emergencyContactName} onChange={e => setEmergencyContactName(e.target.value)} />
                      </div>
                      <div>
                        <label className="modal-label">Contact Number</label>
                        <input type="text" className="modal-text-input" placeholder="10-digit number" value={emergencyContactNumber} onChange={e => setEmergencyContactNumber(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(patientData || isNewPatient) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="modal-label">Appointment Date *</label>
                    <input type="text" className="modal-text-input" placeholder="DD/MM/YYYY" value={appointmentDate} onChange={handleApptDateChange} required />
                      {apptDateError && <div style={{color: 'red', fontSize: '11px', marginTop: '4px'}}>{apptDateError}</div>}
                  </div>
                  <div>
                    <label className="modal-label">Time Slot</label>
                    <CustomTimePicker 
                      value={timeSlot} 
                      onChange={val => setTimeSlot(val)} 
                    />
                  </div>
                  <div>
                    <label className="modal-label">Services</label>
                    <CustomSelect 
                      value=""
                      placeholder="-- Add Service --"
                      options={(services || []).map(s => ({
                        value: `${s.name} (₹${s.price || 0})`,
                        label: `${s.name} (₹${s.price || 0})`
                      }))}
                      onChange={val => {
                        if (val && !selectedServices.includes(val)) {
                          setSelectedServices([...selectedServices, val]);
                        }
                      }}
                    />
                    <div className="modal-chip-group">
                      {selectedServices.map(s => (
                        <span key={s} className="modal-chip service">
                          {s} <span className="modal-chip-remove" onClick={() => setSelectedServices(selectedServices.filter(x => x !== s))} title="Remove">×</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="modal-label">Packages</label>
                    <CustomSelect 
                      value=""
                      placeholder="-- Add Package --"
                      options={(packages || []).map(p => ({
                        value: `${p.name} (₹${p.price || 0})`,
                        label: `${p.name} (₹${p.price || 0})`
                      }))}
                      onChange={val => {
                        if (val && !selectedPackages.includes(val)) {
                          setSelectedPackages([...selectedPackages, val]);
                        }
                      }}
                    />
                    <div className="modal-chip-group">
                      {selectedPackages.map(p => (
                        <span key={p} className="modal-chip package">
                          {p} <span className="modal-chip-remove" onClick={() => setSelectedPackages(selectedPackages.filter(x => x !== p))} title="Remove">×</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="modal-label">Medicines</label>
                    <CustomSelect 
                      value=""
                      placeholder="-- Add Medicine --"
                      options={(medicines || []).map(m => ({
                        value: `${m.name} (₹${m.price || 0})`,
                        label: `${m.name} (₹${m.price || 0})`
                      }))}
                      onChange={val => {
                        const baseNameExtracted = val.split(' (₹')[0];
                        if (val && !selectedMedicines.find(x => x.baseName === baseNameExtracted)) {
                          const medData = (medicines || []).find(m => `${m.name} (₹${m.price || 0})` === val);
                          setSelectedMedicines([...selectedMedicines, { 
                            nameStr: val, 
                            baseName: medData?.name || baseNameExtracted,
                            basePrice: medData?.price || 0,
                            qty: 1,
                            dosage: medData?.defaultDosage || '' 
                          }]);
                        }
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      {selectedMedicines.map((m, i) => (
                        <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                          <div style={{ fontWeight: 600, minWidth: '130px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#166534' }} title={m.nameStr}>{m.nameStr}</div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>Qty:</span>
                            <input 
                              type="number" 
                              min="1"
                              value={m.qty || 1} 
                              onChange={(e) => {
                                const newMeds = [...selectedMedicines];
                                const newQty = parseInt(e.target.value) || 1;
                                newMeds[i].qty = newQty;
                                if (m.basePrice !== undefined) {
                                    newMeds[i].nameStr = `${m.baseName} (₹${m.basePrice * newQty})`;
                                }
                                setSelectedMedicines(newMeds);
                              }}
                              className="modal-text-input"
                              style={{ width: '45px', height: '32px', fontSize: '12.5px', padding: '4px' }}
                            />
                          </div>

                          <input 
                            type="text" 
                            placeholder="Dosage/Instructions" 
                            value={m.dosage || ''} 
                            onChange={(e) => {
                              const newMeds = [...selectedMedicines];
                              newMeds[i].dosage = e.target.value;
                              setSelectedMedicines(newMeds);
                            }}
                            className="modal-text-input"
                            style={{ flex: 1, height: '32px', fontSize: '12.5px' }}
                          />
                          <button type="button" onClick={() => setSelectedMedicines(selectedMedicines.filter((_, idx) => idx !== i))} style={{ background: '#fee2e2', color: '#ef4444', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #fecaca', flexShrink: 0, padding: 0 }} title="Remove">×</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="modal-label">Reason</label>
                    <input 
                      type="text" 
                      className="modal-text-input" 
                      value={reason} 
                      onChange={e => setReason(e.target.value)} 
                      placeholder="General Consultation"
                    />
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="crm-btn crm-btn-primary" disabled={!patientData && !isNewPatient} style={{ opacity: (!patientData && !isNewPatient) ? 0.6 : 1 }}>
                  Save Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
        <SaleEntryModal 
        isOpen={showSaleModal} 
        onClose={() => { setShowSaleModal(false); setSaleModalData({}); }} 
        initialPatientMobile={saleModalData.mobile}
        initialPatientName={saleModalData.name}
        initialAppointment={saleModalData.appointment}
        initialInvoice={saleModalData.invoice}
        onSuccess={async () => {
          alert('Sale entry created successfully!');
          try {
            const token = localStorage.getItem('token');
            if (saleModalData.appointment?._id && token) {
              await axios.put(`${import.meta.env.VITE_API_BASE_URL}/appointments/${saleModalData.appointment._id}`, { hasSaleEntry: true, status: 'Completed' }, { headers: { Authorization: `Bearer ${token}` } });
              fetchAppointments();
            }
          } catch(e) {
            console.error('Failed to update appointment status:', e);
          }
        }}
      />

      {showDetailsModal && selectedDetails && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Appointment Details</h3>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)} title="Close" aria-label="Close">
                <XIcon size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <strong style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#64748b', marginBottom: '4px' }}>Services</strong>
                <div style={{ fontSize: '13.5px', color: '#1e293b', fontWeight: 500 }}>{selectedDetails.services || selectedDetails.serviceOrPackage || 'No services'}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <strong style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#64748b', marginBottom: '4px' }}>Packages</strong>
                <div style={{ fontSize: '13.5px', color: '#1e293b', fontWeight: 500 }}>{selectedDetails.packages || 'No packages'}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <strong style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#64748b', marginBottom: '4px' }}>Medicines</strong>
                <div style={{ fontSize: '13.5px', color: '#1e293b', fontWeight: 500, whiteSpace: 'pre-wrap' }}>{selectedDetails.medicines || 'No medicines'}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setShowDetailsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="modal-overlay" onClick={() => setShowRescheduleModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Reschedule Appointment</h3>
              <button className="modal-close" onClick={() => setShowRescheduleModal(false)} title="Close">
                <XIcon size={16} />
              </button>
            </div>
            <form onSubmit={handleRescheduleSubmit}>
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label className="modal-label">New Appointment Date *</label>
                  <input type="text" className="modal-text-input" placeholder="DD/MM/YYYY" value={rescheduleData.date} onChange={handleRescheduleDateChange} required />
                  {rescheduleDateError && <div style={{color: 'red', fontSize: '11px', marginTop: '4px'}}>{rescheduleDateError}</div>}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label className="modal-label">New Time Slot *</label>
                  <CustomTimePicker value={rescheduleData.time} onChange={(val) => setRescheduleData(prev => ({ ...prev, time: val }))} required />
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowRescheduleModal(false)} className="crm-btn" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }}>Cancel</button>
                <button type="submit" className="crm-btn crm-btn-primary">Reschedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Appointments;



























