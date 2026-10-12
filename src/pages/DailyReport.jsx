import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import CalendarPicker from '../components/CalendarPicker';
import CustomSelect from '../components/CustomSelect';
import { 
    CalendarIcon, 
    CheckSquareIcon, 
    UsersIcon, 
    TrashIcon, 
    DownloadIcon,
    EyeIcon,
    EditIcon
} from '../components/Icons';
import './DailyReport.css';

const ChevronDownIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);

export default function DailyReport() {
    const API_URL = import.meta.env.VITE_API_BASE_URL;
    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isPrivileged = currentUser.role === 'superadmin' || currentUser.role === 'admin';

    // Modal state for Fill/Edit Form Popup
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    
    // Form specific date & target user
    const [formDate, setFormDate] = useState(() => moment().format('YYYY-MM-DD'));
    const [formUserId, setFormUserId] = useState(() => isPrivileged ? '' : (currentUser.id || currentUser._id));
    
    // Filters for Overview Table
    const [filterYear, setFilterYear] = useState(() => moment().format('YYYY'));
    const [filterMonth, setFilterMonth] = useState(() => moment().format('MM'));
    const [filterDate, setFilterDate] = useState('');
    const [filterUserId, setFilterUserId] = useState('');
    const [activeRoleFilter, setActiveRoleFilter] = useState('All Roles');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [teamMembers, setTeamMembers] = useState([]);
    
    // Reports list for table
    const [allReports, setAllReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(false);
    const [viewingReportModal, setViewingReportModal] = useState(null);
    
    // Accordion expand/collapse state (1 to 8)
    const [openSections, setOpenSections] = useState({
        1: true,  // Basic Details
        2: true,  // Attendance & Timing
        3: true,  // Target & Sales
        4: false, // Calling & Leads
        5: false, // Patient Details
        6: false, // Task Management
        7: false, // Clinic Compliance
        8: false  // Followup & Remarks
    });

    const toggleSection = (num) => {
        setOpenSections(prev => ({ ...prev, [num]: !prev[num] }));
    };

    const expandAll = () => {
        setOpenSections({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true });
    };

    const collapseAll = () => {
        setOpenSections({ 1: true, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false });
    };

    // Form State
    const initialFormState = {
        employeeName: currentUser.name || '',
        category: currentUser.category || '',
        attendanceTiming: {
            morningInTime: '',
            afternoonOutTime: '',
            afternoonInTime: '',
            eveningOutTime: ''
        },
        targetSales: {
            monthlyTarget: '',
            monthlySales: '',
            weeklyTarget: '',
            weeklySales: '',
            todayTarget: '',
            todaySales: '',
            crossSelling: '',
            cosmeticSales: '',
            totalExpenses: '',
            todayExpenses: ''
        },
        callingLeads: {
            totalCallingTarget: '',
            totalCallingDone: '',
            todayCalling: '',
            totalLeads: '',
            todayLeads: '',
            followupCalls: '',
            convertedLeadsTotal: '',
            convertedLeadsToday: '',
            phoneLeads: '',
            metaLeads: '',
            mediumCalls: '',
            googleReviewsTarget: '',
            googleReviewsDone: ''
        },
        patientDetails: {
            todayTotalPatients: '',
            totalDonePatients: '',
            todayDonePatients: '',
            monthlyPatients: '',
            patientVisits: '',
            lhrPatients: '',
            cosmeticPatients: '',
            followupPatients: ''
        },
        taskManagement: {
            totalTasks: '',
            completedTasks: '',
            taskSheetSubmitted: 'No',
            softwareMessagesTotal: '',
            softwareMessagesDone: '',
            reviewTargetTotal: '',
            reviewTargetDone: '',
            billPaymentTotal: '',
            billPaymentDone: ''
        },
        compliance: {
            grooming: 'Yes',
            oathCompleted: 'Yes',
            mrCount: '',
            errorReported: 'No',
            totalErrors: '',
            solvedErrors: ''
        },
        followupPending: {
            julyFollowups: '',
            augustFollowups: '',
            septemberFollowups: '',
            octoberFollowups: '',
            otherPendingFollowups: '',
            reasonPending: '',
            todayActionPlan: '',
            tomorrowActionPlan: '',
            remarks: ''
        }
    };

    const [formData, setFormData] = useState(initialFormState);
    const [saving, setSaving] = useState(false);
    const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

    // Fetch user profile and team members list for dropdown
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // 1. Fetch current user profile to ensure latest category is present
                const profileRes = await axios.get(`${API_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (profileRes.data?.user) {
                    const u = profileRes.data.user;
                    localStorage.setItem('user', JSON.stringify({ ...currentUser, ...u }));
                    if (!isPrivileged) {
                        setFormData(prev => ({
                            ...prev,
                            employeeName: u.name || prev.employeeName,
                            category: u.category || prev.category
                        }));
                    }
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
            }

            try {
                // 2. Fetch users based on role
                // If superadmin, fetch all users to allow filtering by Role (Admin, Telecaller, etc.) and User
                const endpoint = currentUser.role === 'superadmin' ? `${API_URL}/auth/users` : `${API_URL}/auth/users/team`;
                const res = await axios.get(endpoint, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const members = res.data || [];
                setTeamMembers(members);

                // If currently selected form user is in members list, ensure category is prefilled
                const currentTargetId = formUserId || (!isPrivileged ? currentUser.id || currentUser._id : '');
                const found = members.find(t => t._id === currentTargetId);
                if (found) {
                    setFormData(prev => ({
                        ...prev,
                        employeeName: prev.employeeName || found.name,
                        category: prev.category || found.category || ''
                    }));
                }
            } catch (err) {
                console.error('Error fetching team members:', err);
            }
        };
        fetchUserData();
    }, [API_URL, token]);

    // Fetch single report for form
    const fetchSingleReport = async (userIdToFetch, dateToFetch) => {
        const uId = userIdToFetch || formUserId;
        const dStr = dateToFetch || formDate;
        if (!uId || !dStr) return;

        try {
            const foundUser = teamMembers.find(t => t._id === uId) || (uId === (currentUser.id || currentUser._id) ? currentUser : null);
            const fallbackCategory = foundUser?.category || '';
            const fallbackName = foundUser?.name || '';

            const res = await axios.get(`${API_URL}/daily-reports/single`, {
                params: { date: dStr, userId: uId },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data) {
                const d = res.data;
                setFormData({
                    employeeName: d.employeeName || fallbackName,
                    category: d.category || fallbackCategory,
                    attendanceTiming: { ...initialFormState.attendanceTiming, ...(d.attendanceTiming || {}) },
                    targetSales: { ...initialFormState.targetSales, ...(d.targetSales || {}) },
                    callingLeads: { ...initialFormState.callingLeads, ...(d.callingLeads || {}) },
                    patientDetails: { ...initialFormState.patientDetails, ...(d.patientDetails || {}) },
                    taskManagement: { ...initialFormState.taskManagement, ...(d.taskManagement || {}) },
                    compliance: { ...initialFormState.compliance, ...(d.compliance || {}) },
                    followupPending: { ...initialFormState.followupPending, ...(d.followupPending || {}) }
                });
            } else {
                setFormData({
                    ...initialFormState,
                    employeeName: fallbackName,
                    category: fallbackCategory
                });
            }
        } catch (err) {
            console.error('Error fetching single report:', err);
        }
    };

    // Open Form Modal handler
    const openFormModal = (targetUserId = null, targetDate = null) => {
        let uId = targetUserId;
        if (!uId) {
            uId = isPrivileged ? (teamMembers[0]?._id || '') : (currentUser.id || currentUser._id);
        }
        const dStr = targetDate || moment().format('YYYY-MM-DD');

        setFormUserId(uId);
        setFormDate(dStr);
        fetchSingleReport(uId, dStr);
        setIsFormModalOpen(true);
    };

    // Fetch all reports matching filters
    const fetchAllReports = async () => {
        try {
            setLoadingReports(true);
            const params = {};
            if (filterDate) {
                params.date = filterDate;
            } else if (filterYear && filterMonth) {
                params.month = `${filterYear}-${filterMonth}`;
            } else if (filterYear) {
                params.month = filterYear;
            }

            if (filterUserId) {
                params.userId = filterUserId;
            }

            const res = await axios.get(`${API_URL}/daily-reports`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllReports(res.data || []);
            setCurrentPage(1);
        } catch (err) {
            console.error('Error fetching all reports:', err);
        } finally {
            setLoadingReports(false);
        }
    };

    useEffect(() => {
        fetchAllReports();
    }, [filterDate, filterYear, filterMonth, filterUserId]);

    // Nested form field update helper
    const handleNestedChange = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    // Save report submit handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setSaveSuccessMsg('');
            
            await axios.post(`${API_URL}/daily-reports`, {
                userId: formUserId,
                date: formDate,
                ...formData
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSaveSuccessMsg('Report saved successfully!');
            setTimeout(() => {
                setSaveSuccessMsg('');
                setIsFormModalOpen(false);
            }, 800);
            fetchAllReports();
        } catch (err) {
            console.error('Error saving report:', err);
            alert(err.response?.data?.message || 'Failed to save daily report');
        } finally {
            setSaving(false);
        }
    };

    // Delete report handler
    const handleDeleteReport = async (id, empName) => {
        if (window.confirm(`Are you sure you want to delete daily report for ${empName}?`)) {
            try {
                await axios.delete(`${API_URL}/daily-reports/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                fetchAllReports();
            } catch (err) {
                console.error('Error deleting report:', err);
                alert('Failed to delete report');
            }
        }
    };

    // Year Filter Options
    const currentYear = moment().year();
    const yearOptions = [
        { value: '', label: 'All Years' },
        ...Array.from({ length: 5 }, (_, i) => {
            const yr = String(currentYear - 2 + i);
            return { value: yr, label: yr };
        }).reverse()
    ];

    // Month Filter Options (12 Months)
    const monthOptions = [
        { value: '', label: 'All Months' },
        { value: '01', label: 'January' },
        { value: '02', label: 'February' },
        { value: '03', label: 'March' },
        { value: '04', label: 'April' },
        { value: '05', label: 'May' },
        { value: '06', label: 'June' },
        { value: '07', label: 'July' },
        { value: '08', label: 'August' },
        { value: '09', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' }
    ];

    // Categories and roles available across fetched team members
    const uniqueCategories = Array.from(new Set(teamMembers.map(u => u.category).filter(Boolean)));
    const availableRoleOptions = currentUser.role === 'superadmin' 
        ? ['All Roles', 'Superadmin', 'Admin', ...uniqueCategories]
        : ['All Roles', ...uniqueCategories];

    // Filter team members displayed in User pills based on activeRoleFilter
    const filteredUsersForTabs = teamMembers.filter(u => {
        if (currentUser.role !== 'superadmin' && u.role === 'superadmin') return false;
        if (activeRoleFilter === 'All Roles') return true;
        if (activeRoleFilter === 'Superadmin') return u.role === 'superadmin';
        if (activeRoleFilter === 'Admin') return u.role === 'admin';
        return u.role === 'team' && u.category?.toLowerCase() === activeRoleFilter.toLowerCase();
    });

    // Client-side search and role filtering
    const filteredReports = allReports.filter(rep => {
        // Role / Category filter
        if (activeRoleFilter !== 'All Roles') {
            const userObj = teamMembers.find(t => t._id === rep.userId);
            if (activeRoleFilter === 'Superadmin') {
                if (userObj?.role !== 'superadmin') return false;
            } else if (activeRoleFilter === 'Admin') {
                if (userObj?.role !== 'admin') return false;
            } else {
                const repCat = (rep.category || userObj?.category || '').toLowerCase();
                if (repCat !== activeRoleFilter.toLowerCase()) return false;
            }
        }

        // Search text filter
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (rep.employeeName && rep.employeeName.toLowerCase().includes(q)) ||
            (rep.category && rep.category.toLowerCase().includes(q))
        );
    });

    // Pagination calculations
    const totalPages = Math.ceil(filteredReports.length / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedReports = filteredReports.slice(startIndex, startIndex + pageSize);

    const displayFormDate = moment(formDate).isValid() ? moment(formDate).format('DD MMM YYYY') : moment().format('DD MMM YYYY');

    return (
        <div className="daily-report-container">
            {/* Header */}
            <div className="daily-report-header">
                <div className="daily-report-title-wrap">
                    <div className="daily-report-icon-badge">
                        <CheckSquareIcon size={22} />
                    </div>
                    <div>
                        <h2 className="daily-report-title">Daily EOD Team Report</h2>
                    
                    </div>
                </div>

                <div className="daily-report-actions">
                    {!isPrivileged && (
                        <button 
                            type="button" 
                            onClick={() => openFormModal()}
                            className="payments-btn-primary"
                            style={{ padding: '9px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <span>＋</span>
                            <span>Submit Today's Report</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Role & User Navigation Filters (Exact same clean design as Rules / SOPs) */}
            {isPrivileged && (
                <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', maxWidth: '100%' }}>
                    {/* Row 1: All Roles / Categories Pills */}
                    {currentUser.role === 'superadmin' && (
                        <div className="hide-scrollbar" style={{ display: 'inline-flex', gap: '3px', background: '#f8fafc', padding: '3px 4px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'nowrap', overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
                            {availableRoleOptions.map(role => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => {
                                        setActiveRoleFilter(role);
                                        setFilterUserId('');
                                        setCurrentPage(1);
                                    }}
                                    style={{
                                        background: activeRoleFilter === role ? '#144b79' : 'transparent',
                                        border: 'none',
                                        boxShadow: activeRoleFilter === role ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '11.5px',
                                        color: activeRoleFilter === role ? '#ffffff' : '#475569',
                                        cursor: 'pointer',
                                        fontWeight: activeRoleFilter === role ? '600' : '500',
                                        transition: 'all 0.15s ease',
                                        textTransform: 'capitalize',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0
                                    }}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Row 2: All Users / Specific Team Member Pills */}
                    <div className="hide-scrollbar" style={{ display: 'inline-flex', gap: '3px', background: '#f8fafc', padding: '3px 4px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'nowrap', overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setFilterUserId('');
                                setCurrentPage(1);
                            }}
                            style={{
                                background: filterUserId === '' ? '#144b79' : 'transparent',
                                border: 'none',
                                boxShadow: filterUserId === '' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                color: filterUserId === '' ? '#ffffff' : '#475569',
                                cursor: 'pointer',
                                fontWeight: filterUserId === '' ? '600' : '500',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }}
                        >
                            All Users ({filteredReports.length})
                        </button>

                        {filteredUsersForTabs.map(member => {
                            const isSelected = filterUserId === member._id;
                            const memberCount = allReports.filter(r => r.userId === member._id).length;
                            return (
                                <button
                                    key={member._id}
                                    type="button"
                                    onClick={() => {
                                        setFilterUserId(member._id);
                                        setCurrentPage(1);
                                    }}
                                    style={{
                                        background: isSelected ? '#144b79' : 'transparent',
                                        border: 'none',
                                        boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '11.5px',
                                        color: isSelected ? '#ffffff' : '#475569',
                                        cursor: 'pointer',
                                        fontWeight: isSelected ? '600' : '500',
                                        transition: 'all 0.15s ease',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}
                                >
                                    <span>{member.name}</span>
                                    {memberCount > 0 && (
                                        <span style={{
                                            fontSize: '10px',
                                            padding: '0 4px',
                                            borderRadius: '8px',
                                            background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(100,116,139,0.12)',
                                            color: isSelected ? '#fff' : '#64748b',
                                            fontWeight: 700
                                        }}>
                                            {memberCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Comprehensive Filter Toolbar (Year, Month, Date, Search) */}
            <div className="report-filter-bar">
                {/* Year Filter */}
                <div className="report-filter-item" style={{ minWidth: '130px' }}>
                    <span className="report-filter-label">Year</span>
                    <CustomSelect 
                        value={filterYear}
                        onChange={(val) => {
                            setFilterYear(val);
                            if (filterDate && val && !filterDate.startsWith(val)) {
                                setFilterDate('');
                            }
                        }}
                        options={yearOptions}
                        placeholder="Select Year"
                    />
                </div>

                {/* Month Filter */}
                <div className="report-filter-item" style={{ minWidth: '150px' }}>
                    <span className="report-filter-label">Month</span>
                    <CustomSelect 
                        value={filterMonth}
                        onChange={(val) => {
                            setFilterMonth(val);
                            if (val && filterYear && filterDate) {
                                const ym = `${filterYear}-${val}`;
                                if (!filterDate.startsWith(ym)) setFilterDate('');
                            }
                        }}
                        options={monthOptions}
                        placeholder="Select Month"
                    />
                </div>

                {/* Specific Date Filter */}
                <div className="report-filter-item" style={{ width: '160px' }}>
                    <span className="report-filter-label">Specific Date</span>
                    <CalendarPicker 
                        selectedDate={filterDate}
                        onChange={(val) => setFilterDate(val || '')}
                        placeholder="All Dates"
                        enableYearMonthDropdown={true}
                    />
                </div>

                {filterDate && (
                    <button 
                        type="button" 
                        onClick={() => setFilterDate('')}
                        style={{ alignSelf: 'flex-end', height: '38px', padding: '0 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', color: '#475569', fontWeight: 600 }}
                        title="Clear Specific Date Filter"
                    >
                        ✕ Clear Date
                    </button>
                )}

                {/* Search query */}
                <div className="report-filter-item" style={{ flex: 1, minWidth: '180px' }}>
                    <span className="report-filter-label">Search</span>
                    <input 
                        type="text" 
                        placeholder="Search by employee or category..." 
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="report-search-input"
                    />
                </div>

                {/* Reset Filters button */}
                {(filterDate || filterUserId || searchQuery || activeRoleFilter !== 'All Roles' || filterMonth !== moment().format('MM') || filterYear !== moment().format('YYYY')) && (
                    <button 
                        type="button" 
                        onClick={() => {
                            setFilterYear(moment().format('YYYY'));
                            setFilterMonth(moment().format('MM'));
                            setFilterDate('');
                            setFilterUserId('');
                            setActiveRoleFilter('All Roles');
                            setSearchQuery('');
                            setCurrentPage(1);
                        }}
                        style={{ alignSelf: 'flex-end', height: '38px', padding: '0 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', color: '#dc2626', fontWeight: 600 }}
                    >
                        Reset Filters
                    </button>
                )}
            </div>

            {/* Reports Overview Table Card */}
            <div className="report-table-card payments-table-card">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: 600 }}>
                            Daily Performance Reports
                        </h3>
                        <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                            {filterDate 
                                ? `Showing reports for ${moment(filterDate).format('DD MMMM YYYY')}` 
                                : (filterYear && filterMonth) 
                                    ? `Showing reports for ${moment(`${filterYear}-${filterMonth}-01`).format('MMMM YYYY')}` 
                                    : filterYear
                                        ? `Showing reports for year ${filterYear}`
                                        : 'Showing all recorded reports'}
                        </span>
                    </div>

                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                        {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'} found
                    </div>
                </div>

                {loadingReports ? (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
                        Loading reports data...
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                        <p style={{ fontSize: '15px', fontWeight: 600, color: '#334155', margin: '0 0 6px 0' }}>
                            No reports found matching your selected filters.
                        </p>
                        {!isPrivileged ? (
                            <>
                                <p style={{ fontSize: '13px', margin: '0 0 16px 0' }}>
                                    Click below to create and submit your daily report.
                                </p>
                                <button 
                                    type="button" 
                                    onClick={() => openFormModal()}
                                    className="payments-btn-primary"
                                >
                                    + Submit Daily Report Now
                                </button>
                            </>
                        ) : (
                            <p style={{ fontSize: '13px', margin: 0, color: '#64748b' }}>
                                Team members will submit their daily reports from their account.
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="desktop-table-container">
                            <table className="payments-data-table">
                                <thead>
                                    <tr>
                                        <th>DATE</th>
                                        <th>EMPLOYEE</th>
                                        <th>CATEGORY</th>
                                        <th>TIMING</th>
                                        <th>CALLING (DONE/TARGET)</th>
                                        <th>TODAY SALES</th>
                                        <th>TASKS (DONE/TOTAL)</th>
                                        <th>DONE PATIENTS</th>
                                        <th>REVIEWS</th>
                                        <th>GROOMING / OATH</th>
                                        <th className="text-right">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedReports.map(rep => {
                                        const t = rep.attendanceTiming || {};
                                        const s = rep.targetSales || {};
                                        const c = rep.callingLeads || {};
                                        const p = rep.patientDetails || {};
                                        const k = rep.taskManagement || {};
                                        const comp = rep.compliance || {};
                                        const repDate = moment(rep.date).isValid() ? moment(rep.date).format('DD MMM YYYY') : rep.date;

                                        return (
                                            <tr key={rep._id}>
                                                <td style={{ fontWeight: 600, color: '#0284c7', whiteSpace: 'nowrap' }}>
                                                    {repDate}
                                                </td>
                                                <td style={{ fontWeight: 600, color: '#0f172a' }}>{rep.employeeName}</td>
                                                <td style={{ color: '#475569', fontSize: '13px' }}>{rep.category || '-'}</td>
                                                <td style={{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' }}>
                                                    {t.morningInTime ? `In: ${t.morningInTime}` : '-'} | {t.eveningOutTime ? `Out: ${t.eveningOutTime}` : '-'}
                                                </td>
                                                <td style={{ fontWeight: 600 }}>
                                                    {c.totalCallingDone || c.todayCalling || 0} / {c.totalCallingTarget || '-'}
                                                </td>
                                                <td style={{ color: '#16a34a', fontWeight: 700 }}>
                                                    ₹{Number(s.todaySales || 0).toLocaleString()}
                                                </td>
                                                <td>{k.completedTasks || 0} / {k.totalTasks || 0}</td>
                                                <td>{p.todayDonePatients || 0}</td>
                                                <td>{c.googleReviewsDone || 0} / {c.googleReviewsTarget || 0}</td>
                                                <td>
                                                    <span style={{ color: comp.grooming === 'Yes' ? '#16a34a' : '#dc2626', fontWeight: 600, fontSize: '12px' }}>
                                                        {comp.grooming || '-'}
                                                    </span> / {comp.oathCompleted || '-'}
                                                </td>
                                                <td className="text-right">
                                                    <div className="payments-table-actions">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setViewingReportModal(rep)}
                                                            className="payments-icon-action-btn"
                                                            title="View Full Details"
                                                            style={{ color: '#0284c7' }}
                                                        >
                                                            <EyeIcon size={16} />
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => openFormModal(rep.userId, rep.date)} 
                                                            className="payments-icon-action-btn"
                                                            title="Edit Report"
                                                            style={{ color: '#64748b' }}
                                                        >
                                                            <EditIcon size={15} />
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleDeleteReport(rep._id, rep.employeeName)} 
                                                            className="payments-icon-action-btn"
                                                            title="Delete Report"
                                                            style={{ color: '#ef4444' }}
                                                        >
                                                            <TrashIcon size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile & Tablet Card Layout (SM & MD sizes) */}
                        <div className="report-mobile-cards-grid">
                            {paginatedReports.map(rep => {
                                const t = rep.attendanceTiming || {};
                                const s = rep.targetSales || {};
                                const c = rep.callingLeads || {};
                                const p = rep.patientDetails || {};
                                const k = rep.taskManagement || {};
                                const comp = rep.compliance || {};
                                const repDate = moment(rep.date).isValid() ? moment(rep.date).format('DD MMM YYYY') : rep.date;

                                return (
                                    <div key={rep._id} className="report-mobile-card">
                                        <div className="report-mcard-header">
                                            <div className="report-mcard-user">
                                                <span className="report-mcard-name">{rep.employeeName}</span>
                                                <span className="report-mcard-role">{rep.category || 'Staff'}</span>
                                            </div>
                                            <span className="report-mcard-date">{repDate}</span>
                                        </div>

                                        <div className="report-mcard-stats">
                                            <div className="report-mstat-col">
                                                <span className="report-mstat-label">Sales</span>
                                                <span className="report-mstat-val" style={{ color: '#16a34a' }}>
                                                    ₹{Number(s.todaySales || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="report-mstat-col">
                                                <span className="report-mstat-label">Calling</span>
                                                <span className="report-mstat-val">
                                                    {c.totalCallingDone || c.todayCalling || 0} / {c.totalCallingTarget || '-'}
                                                </span>
                                            </div>
                                            <div className="report-mstat-col">
                                                <span className="report-mstat-label">Tasks</span>
                                                <span className="report-mstat-val">
                                                    {k.completedTasks || 0} / {k.totalTasks || 0}
                                                </span>
                                            </div>
                                            <div className="report-mstat-col">
                                                <span className="report-mstat-label">Patients</span>
                                                <span className="report-mstat-val">
                                                    {p.todayDonePatients || 0} done
                                                </span>
                                            </div>
                                            <div className="report-mstat-col">
                                                <span className="report-mstat-label">Timing</span>
                                                <span className="report-mstat-val" style={{ fontSize: '11.5px', color: '#475569' }}>
                                                    {t.morningInTime ? `In: ${t.morningInTime}` : '-'} | {t.eveningOutTime ? `Out: ${t.eveningOutTime}` : '-'}
                                                </span>
                                            </div>
                                            <div className="report-mstat-col">
                                                <span className="report-mstat-label">Grooming / Oath</span>
                                                <span className="report-mstat-val" style={{ fontSize: '11.5px', color: comp.grooming === 'Yes' ? '#16a34a' : '#dc2626' }}>
                                                    {comp.grooming || '-'} / {comp.oathCompleted || '-'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="report-mcard-actions">
                                            <button 
                                                type="button" 
                                                onClick={() => setViewingReportModal(rep)}
                                                className="report-mcard-btn"
                                                style={{ background: '#f0f9ff', color: '#0284c7', borderColor: '#bae6fd' }}
                                            >
                                                <EyeIcon size={14} />
                                                <span>View</span>
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => openFormModal(rep.userId, rep.date)}
                                                className="report-mcard-btn"
                                                style={{ background: '#f8fafc', color: '#475569', borderColor: '#cbd5e1' }}
                                            >
                                                <EditIcon size={13} />
                                                <span>Edit</span>
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => handleDeleteReport(rep._id, rep.employeeName)}
                                                className="report-mcard-btn"
                                                style={{ background: '#fef2f2', color: '#ef4444', borderColor: '#fca5a5' }}
                                            >
                                                <TrashIcon size={13} />
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination Bar */}
                        <div className="report-pagination-bar">
                            <div className="report-pagination-info">
                                Showing <strong>{startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, filteredReports.length)}</strong> of <strong>{filteredReports.length}</strong> reports
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b' }}>
                                    <span>Rows:</span>
                                    <select 
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff', color: '#1e293b' }}
                                    >
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>

                                <div className="report-pagination-controls">
                                    <button 
                                        type="button" 
                                        className="report-page-btn"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    >
                                        Prev
                                    </button>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                                        Math.max(0, currentPage - 3),
                                        Math.min(totalPages, currentPage + 2)
                                    ).map(pageNum => (
                                        <button 
                                            key={pageNum}
                                            type="button"
                                            className={`report-page-btn ${pageNum === currentPage ? 'active' : ''}`}
                                            onClick={() => setCurrentPage(pageNum)}
                                        >
                                            {pageNum}
                                        </button>
                                    ))}

                                    <button 
                                        type="button" 
                                        className="report-page-btn"
                                        disabled={currentPage >= totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* FULL DETAILS MODAL FOR INSPECTING ANY REPORT */}
            {viewingReportModal && (
                <div className="report-modal-overlay" onClick={() => setViewingReportModal(null)}>
                    <div className="report-modal-box" style={{ maxWidth: '850px' }} onClick={e => e.stopPropagation()}>
                        <div className="report-modal-header">
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
                                    Daily Report: {viewingReportModal.employeeName}
                                </h3>
                                <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>
                                    Category: <strong>{viewingReportModal.category || 'Staff'}</strong> • Date: <strong>{moment(viewingReportModal.date).isValid() ? moment(viewingReportModal.date).format('DD MMMM YYYY') : viewingReportModal.date}</strong>
                                </p>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setViewingReportModal(null)}
                                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b', padding: '0 4px', lineHeight: 1 }}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="report-modal-body" style={{ background: '#f8fafc', padding: '16px' }}>
                            {/* 1. Attendance & Timing */}
                            <div className="view-report-section">
                                <div className="view-section-header">
                                    <span>1. Attendance & Timing</span>
                                </div>
                                <div className="view-compact-grid">
                                    <div className="view-cell">
                                        <span className="view-cell-label">Morning In</span>
                                        <span className="view-cell-val primary">{viewingReportModal.attendanceTiming?.morningInTime || '—'}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Afternoon Out</span>
                                        <span className="view-cell-val">{viewingReportModal.attendanceTiming?.afternoonOutTime || '—'}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Afternoon In</span>
                                        <span className="view-cell-val">{viewingReportModal.attendanceTiming?.afternoonInTime || '—'}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Evening / Night Out</span>
                                        <span className="view-cell-val">{viewingReportModal.attendanceTiming?.eveningOutTime || '—'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Target & Sales */}
                            <div className="view-report-section">
                                <div className="view-section-header" style={{ color: '#16a34a' }}>
                                    <span>2. Target & Sales</span>
                                </div>
                                <div className="view-compact-grid">
                                    <div className="view-cell">
                                        <span className="view-cell-label">Today Sales</span>
                                        <span className="view-cell-val positive">₹{Number(viewingReportModal.targetSales?.todaySales || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Today Target</span>
                                        <span className="view-cell-val">₹{Number(viewingReportModal.targetSales?.todayTarget || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Monthly Target</span>
                                        <span className="view-cell-val">₹{Number(viewingReportModal.targetSales?.monthlyTarget || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Monthly Sales</span>
                                        <span className="view-cell-val positive">₹{Number(viewingReportModal.targetSales?.monthlySales || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Weekly Target</span>
                                        <span className="view-cell-val">₹{Number(viewingReportModal.targetSales?.weeklyTarget || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Cross Selling</span>
                                        <span className="view-cell-val">₹{Number(viewingReportModal.targetSales?.crossSelling || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Cosmetic Sales</span>
                                        <span className="view-cell-val">₹{Number(viewingReportModal.targetSales?.cosmeticSales || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Today Expenses</span>
                                        <span className="view-cell-val alert">₹{Number(viewingReportModal.targetSales?.todayExpenses || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Calling & Leads */}
                            <div className="view-report-section">
                                <div className="view-section-header" style={{ color: '#9333ea' }}>
                                    <span>3. Calling & Leads</span>
                                </div>
                                <div className="view-compact-grid">
                                    <div className="view-cell">
                                        <span className="view-cell-label">Calling (Done / Target)</span>
                                        <span className="view-cell-val">{viewingReportModal.callingLeads?.totalCallingDone || 0} / {viewingReportModal.callingLeads?.totalCallingTarget || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Today Calling</span>
                                        <span className="view-cell-val">{viewingReportModal.callingLeads?.todayCalling || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Follow-up Calls</span>
                                        <span className="view-cell-val">{viewingReportModal.callingLeads?.followupCalls || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Leads (Today / Total)</span>
                                        <span className="view-cell-val">{viewingReportModal.callingLeads?.todayLeads || 0} / {viewingReportModal.callingLeads?.totalLeads || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Converted Leads (Today / Total)</span>
                                        <span className="view-cell-val positive">{viewingReportModal.callingLeads?.convertedLeadsToday || 0} / {viewingReportModal.callingLeads?.convertedLeadsTotal || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Phone Leads</span>
                                        <span className="view-cell-val">{viewingReportModal.callingLeads?.phoneLeads || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Meta Leads</span>
                                        <span className="view-cell-val">{viewingReportModal.callingLeads?.metaLeads || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Reviews (Done / Target)</span>
                                        <span className="view-cell-val primary">{viewingReportModal.callingLeads?.googleReviewsDone || 0} / {viewingReportModal.callingLeads?.googleReviewsTarget || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 5. Patient Details */}
                            <div className="view-report-section">
                                <div className="view-section-header" style={{ color: '#ea580c' }}>
                                    <span>5. Patient Details</span>
                                </div>
                                <div className="view-compact-grid">
                                    <div className="view-cell">
                                        <span className="view-cell-label">Today Patients</span>
                                        <span className="view-cell-val">{viewingReportModal.patientDetails?.todayTotalPatients || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Monthly Patients</span>
                                        <span className="view-cell-val">{viewingReportModal.patientDetails?.monthlyPatients || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Done Patients (Today / Total)</span>
                                        <span className="view-cell-val">{viewingReportModal.patientDetails?.todayDonePatients || 0} / {viewingReportModal.patientDetails?.totalDonePatients || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Clinic Visits</span>
                                        <span className="view-cell-val">{viewingReportModal.patientDetails?.patientVisits || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">LHR Patients</span>
                                        <span className="view-cell-val">{viewingReportModal.patientDetails?.lhrPatients || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Cosmetic Patients</span>
                                        <span className="view-cell-val">{viewingReportModal.patientDetails?.cosmeticPatients || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Follow-up Patients</span>
                                        <span className="view-cell-val">{viewingReportModal.patientDetails?.followupPatients || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 6. Task Management (Target vs Done) */}
                            <div className="view-report-section">
                                <div className="view-section-header" style={{ color: '#0284c7' }}>
                                    <span>6. Task Management (Target vs Done)</span>
                                </div>
                                <div className="view-compact-grid">
                                    <div className="view-cell">
                                        <span className="view-cell-label">Tasks (Completed / Total)</span>
                                        <span className="view-cell-val primary">{viewingReportModal.taskManagement?.completedTasks || 0} / {viewingReportModal.taskManagement?.totalTasks || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Task Sheet Photo Submitted</span>
                                        <span className="view-cell-val" style={{ color: viewingReportModal.taskManagement?.taskSheetSubmitted === 'Yes' ? '#16a34a' : '#64748b' }}>
                                            {viewingReportModal.taskManagement?.taskSheetSubmitted || 'No'}
                                        </span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Software Messages (Done / Target)</span>
                                        <span className="view-cell-val">{viewingReportModal.taskManagement?.softwareMessagesDone || 0} / {viewingReportModal.taskManagement?.softwareMessagesTotal || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Bill Payment (Done / Total)</span>
                                        <span className="view-cell-val">{viewingReportModal.taskManagement?.billPaymentDone || 0} / {viewingReportModal.taskManagement?.billPaymentTotal || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 7. Clinic & Staff Compliance */}
                            <div className="view-report-section">
                                <div className="view-section-header" style={{ color: '#059669' }}>
                                    <span>7. Clinic & Staff Compliance</span>
                                </div>
                                <div className="view-compact-grid">
                                    <div className="view-cell">
                                        <span className="view-cell-label">Staff Grooming</span>
                                        <span className="view-cell-val" style={{ color: viewingReportModal.compliance?.grooming === 'Yes' ? '#16a34a' : '#dc2626' }}>
                                            {viewingReportModal.compliance?.grooming || 'No'}
                                        </span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Morning Oath / Prarthana</span>
                                        <span className="view-cell-val" style={{ color: viewingReportModal.compliance?.oathCompleted === 'Yes' ? '#16a34a' : '#dc2626' }}>
                                            {viewingReportModal.compliance?.oathCompleted || 'No'}
                                        </span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">MR Count</span>
                                        <span className="view-cell-val">{viewingReportModal.compliance?.mrCount || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Error Reported</span>
                                        <span className="view-cell-val" style={{ color: viewingReportModal.compliance?.errorReported === 'Yes' ? '#dc2626' : '#16a34a' }}>
                                            {viewingReportModal.compliance?.errorReported || 'No'}
                                        </span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Errors (Solved / Total)</span>
                                        <span className="view-cell-val">{viewingReportModal.compliance?.solvedErrors || 0} / {viewingReportModal.compliance?.totalErrors || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 8. Follow-up & Pending Work (Action Plan) */}
                            <div className="view-report-section">
                                <div className="view-section-header" style={{ color: '#475569' }}>
                                    <span>8. Follow-up & Pending Work (Action Plan)</span>
                                </div>
                                <div className="view-compact-grid" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <div className="view-cell">
                                        <span className="view-cell-label">July Follow-ups</span>
                                        <span className="view-cell-val">{viewingReportModal.followupPending?.julyFollowups || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">August Follow-ups</span>
                                        <span className="view-cell-val">{viewingReportModal.followupPending?.augustFollowups || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">September Follow-ups</span>
                                        <span className="view-cell-val">{viewingReportModal.followupPending?.septemberFollowups || 0}</span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Other Pending Follow-ups</span>
                                        <span className="view-cell-val">{viewingReportModal.followupPending?.otherPendingFollowups || 0}</span>
                                    </div>
                                </div>
                                <div className="view-compact-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Today's Action Done</span>
                                        <span className="view-cell-val" style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                                            {viewingReportModal.followupPending?.todayActionPlan || '—'}
                                        </span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Tomorrow's Action Plan</span>
                                        <span className="view-cell-val" style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                                            {viewingReportModal.followupPending?.tomorrowActionPlan || '—'}
                                        </span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">Reason for Pending Work</span>
                                        <span className="view-cell-val" style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                                            {viewingReportModal.followupPending?.reasonPending || '—'}
                                        </span>
                                    </div>
                                    <div className="view-cell">
                                        <span className="view-cell-label">General Remarks & Notes</span>
                                        <span className="view-cell-val" style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                                            {viewingReportModal.followupPending?.remarks || '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="report-modal-footer">
                            <div></div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        const uid = viewingReportModal.userId;
                                        const dt = viewingReportModal.date;
                                        setViewingReportModal(null);
                                        openFormModal(uid, dt);
                                    }}
                                    className="payments-btn-primary"
                                    style={{ padding: '8px 18px', fontSize: '13px' }}
                                >
                                    Edit This Report
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setViewingReportModal(null)}
                                    style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODE 2: FORM POPUP MODAL */}
            {isFormModalOpen && (
                <div className="report-modal-overlay" onClick={() => setIsFormModalOpen(false)}>
                    <div className="report-modal-box" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="report-modal-header">
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
                                    {isPrivileged ? 'Fill / Edit Team Daily Report' : 'Submit Daily EOD Report'}
                                </h3>
                                <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>
                                    Employee: <strong style={{ color: '#0f172a' }}>{formData.employeeName || 'Staff'}</strong> • Date: <strong style={{ color: '#0f172a' }}>{displayFormDate}</strong>
                                </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {isPrivileged && (
                                    <>
                                        <div style={{ width: '180px' }}>
                                            <CustomSelect 
                                                value={formUserId}
                                                onChange={(val) => {
                                                    setFormUserId(val);
                                                    fetchSingleReport(val, formDate);
                                                }}
                                                options={teamMembers.map(t => ({ value: t._id, label: t.name }))}
                                                placeholder="Select Member"
                                            />
                                        </div>
                                        <div style={{ width: '150px' }}>
                                            <CalendarPicker 
                                                selectedDate={formDate}
                                                onChange={(val) => {
                                                    setFormDate(val);
                                                    fetchSingleReport(formUserId, val);
                                                }}
                                                placeholder="Select Date"
                                            />
                                        </div>
                                    </>
                                )}
                                <button 
                                    type="button" 
                                    onClick={() => setIsFormModalOpen(false)}
                                    style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b', padding: '0 4px', lineHeight: 1 }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="report-modal-body">
                            <form id="dailyReportForm" onSubmit={handleSubmit}>
                                {/* Control Bar to Expand / Collapse All */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
                                    <button 
                                        type="button" 
                                        onClick={expandAll} 
                                        style={{ 
                                            background: '#ffffff', 
                                            color: '#1e293b', 
                                            border: '1px solid #cbd5e1', 
                                            padding: '6px 14px', 
                                            borderRadius: '6px', 
                                            fontSize: '12px', 
                                            cursor: 'pointer', 
                                            fontWeight: 600,
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}
                                    >
                                        ＋ Expand All
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={collapseAll} 
                                        style={{ 
                                            background: '#ffffff', 
                                            color: '#1e293b', 
                                            border: '1px solid #cbd5e1', 
                                            padding: '6px 14px', 
                                            borderRadius: '6px', 
                                            fontSize: '12px', 
                                            cursor: 'pointer', 
                                            fontWeight: 600,
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}
                                    >
                                        － Collapse All
                                    </button>
                                </div>

                                <div className="report-accordion-group">
                                    {/* 1. BASIC DETAILS */}
                                    <div className={`report-accordion-card ${openSections[1] ? 'open' : ''}`}>
                                        <div className="report-accordion-header" onClick={() => toggleSection(1)}>
                                            <div className="report-accordion-title">
                                                <span className="report-step-badge">1</span>
                                                <span>Basic Details</span>
                                            </div>
                                            <div className={`report-accordion-chevron ${openSections[1] ? 'open' : ''}`}>
                                                <ChevronDownIcon size={18} />
                                            </div>
                                        </div>
                                        {openSections[1] && (
                                            <div className="report-accordion-body">
                                                <div className="report-form-grid">
                                                    <div className="report-field-group">
                                                        <label className="report-field-label">Date</label>
                                                        <CalendarPicker 
                                                            selectedDate={formDate}
                                                            onChange={(val) => {
                                                                if (val) {
                                                                    setFormDate(val);
                                                                    fetchSingleReport(formUserId, val);
                                                                }
                                                            }}
                                                            placeholder="Select Date"
                                                            allowClear={false}
                                                            showPresets={true}
                                                            className="w-full"
                                                        />
                                                    </div>
                                        <div className="report-field-group">
                                            <label className="report-field-label">Employee Name</label>
                                            <input 
                                                type="text" 
                                                value={formData.employeeName} 
                                                onChange={(e) => setFormData(prev => ({ ...prev, employeeName: e.target.value }))}
                                                className="report-input" 
                                            />
                                        </div>
                                        <div className="report-field-group">
                                            <label className="report-field-label">Department / Category</label>
                                            <input 
                                                type="text" 
                                                value={formData.category} 
                                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                                placeholder="e.g. Doctor, Skin Therapist, Receptionist"
                                                className="report-input" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. ATTENDANCE & TIMING */}
                        <div className={`report-accordion-card ${openSections[2] ? 'open' : ''}`}>
                            <div className="report-accordion-header" onClick={() => toggleSection(2)}>
                                <div className="report-accordion-title">
                                    <span className="report-step-badge">2</span>
                                    <span>Attendance & Timing</span>
                                </div>
                                <div className={`report-accordion-chevron ${openSections[2] ? 'open' : ''}`}>
                                    <ChevronDownIcon size={18} />
                                </div>
                            </div>
                            {openSections[2] && (
                                <div className="report-accordion-body">
                                    <div className="report-form-grid">
                                        <div className="report-field-group">
                                            <label className="report-field-label">Morning In Time</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. 09:00 AM"
                                                value={formData.attendanceTiming.morningInTime}
                                                onChange={(e) => handleNestedChange('attendanceTiming', 'morningInTime', e.target.value)}
                                                className="report-input"
                                            />
                                        </div>
                                        <div className="report-field-group">
                                            <label className="report-field-label">Afternoon Out Time</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. 01:30 PM (or 0)"
                                                value={formData.attendanceTiming.afternoonOutTime}
                                                onChange={(e) => handleNestedChange('attendanceTiming', 'afternoonOutTime', e.target.value)}
                                                className="report-input"
                                            />
                                        </div>
                                        <div className="report-field-group">
                                            <label className="report-field-label">Afternoon In Time</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. 02:30 PM (or 0)"
                                                value={formData.attendanceTiming.afternoonInTime}
                                                onChange={(e) => handleNestedChange('attendanceTiming', 'afternoonInTime', e.target.value)}
                                                className="report-input"
                                            />
                                        </div>
                                        <div className="report-field-group">
                                            <label className="report-field-label">Evening / Night Out Time</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. 08:55 PM"
                                                value={formData.attendanceTiming.eveningOutTime}
                                                onChange={(e) => handleNestedChange('attendanceTiming', 'eveningOutTime', e.target.value)}
                                                className="report-input"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. TARGET & SALES */}
                        <div className={`report-accordion-card ${openSections[3] ? 'open' : ''}`}>
                            <div className="report-accordion-header" onClick={() => toggleSection(3)}>
                                <div className="report-accordion-title">
                                    <span className="report-step-badge">3</span>
                                    <span>Target & Sales (Kitne mese Kitne)</span>
                                </div>
                                <div className={`report-accordion-chevron ${openSections[3] ? 'open' : ''}`}>
                                    <ChevronDownIcon size={18} />
                                </div>
                            </div>
                            {openSections[3] && (
                                <div className="report-accordion-body">
                                    <div className="report-form-grid">
                                        {/* Monthly Target vs Sales */}
                                        <div className="report-field-group">
                                            <label className="report-field-label">
                                                <span>Monthly Target vs Sales</span>
                                                <span className="report-field-sublabel">Target / Done</span>
                                            </label>
                                            <div className="report-dual-input">
                                                <input 
                                                    type="number" 
                                                    placeholder="Target"
                                                    value={formData.targetSales.monthlyTarget}
                                                    onChange={(e) => handleNestedChange('targetSales', 'monthlyTarget', e.target.value)}
                                                />
                                                <span className="report-dual-separator">/</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="Sales"
                                                    value={formData.targetSales.monthlySales}
                                                    onChange={(e) => handleNestedChange('targetSales', 'monthlySales', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Weekly Target vs Sales */}
                                        <div className="report-field-group">
                                            <label className="report-field-label">
                                                <span>Weekly Target vs Sales</span>
                                                <span className="report-field-sublabel">Target / Done</span>
                                            </label>
                                            <div className="report-dual-input">
                                                <input 
                                                    type="number" 
                                                    placeholder="Target"
                                                    value={formData.targetSales.weeklyTarget}
                                                    onChange={(e) => handleNestedChange('targetSales', 'weeklyTarget', e.target.value)}
                                                />
                                                <span className="report-dual-separator">/</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="Sales"
                                                    value={formData.targetSales.weeklySales}
                                                    onChange={(e) => handleNestedChange('targetSales', 'weeklySales', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Today Target vs Sales */}
                                        <div className="report-field-group">
                                            <label className="report-field-label">
                                                <span>Today's Target vs Sales</span>
                                                <span className="report-field-sublabel">Target / Sales</span>
                                            </label>
                                            <div className="report-dual-input">
                                                <input 
                                                    type="number" 
                                                    placeholder="Target"
                                                    value={formData.targetSales.todayTarget}
                                                    onChange={(e) => handleNestedChange('targetSales', 'todayTarget', e.target.value)}
                                                />
                                                <span className="report-dual-separator">/</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="Sales"
                                                    value={formData.targetSales.todaySales}
                                                    onChange={(e) => handleNestedChange('targetSales', 'todaySales', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">Cross-Selling (₹)</label>
                                            <input 
                                                type="number" 
                                                placeholder="e.g. 6000"
                                                value={formData.targetSales.crossSelling}
                                                onChange={(e) => handleNestedChange('targetSales', 'crossSelling', e.target.value)}
                                                className="report-input"
                                            />
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">Cosmetic Sales (₹)</label>
                                            <input 
                                                type="number" 
                                                placeholder="e.g. 100000"
                                                value={formData.targetSales.cosmeticSales}
                                                onChange={(e) => handleNestedChange('targetSales', 'cosmeticSales', e.target.value)}
                                                className="report-input"
                                            />
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">
                                                <span>Clinic Expenses</span>
                                                <span className="report-field-sublabel">Total / Today</span>
                                            </label>
                                            <div className="report-dual-input">
                                                <input 
                                                    type="number" 
                                                    placeholder="Total"
                                                    value={formData.targetSales.totalExpenses}
                                                    onChange={(e) => handleNestedChange('targetSales', 'totalExpenses', e.target.value)}
                                                />
                                                <span className="report-dual-separator">/</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="Today"
                                                    value={formData.targetSales.todayExpenses}
                                                    onChange={(e) => handleNestedChange('targetSales', 'todayExpenses', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 4. CALLING & LEADS */}
                        <div className={`report-accordion-card ${openSections[4] ? 'open' : ''}`}>
                            <div className="report-accordion-header" onClick={() => toggleSection(4)}>
                                <div className="report-accordion-title">
                                    <span className="report-step-badge">4</span>
                                    <span>Calling & Leads</span>
                                </div>
                                <div className={`report-accordion-chevron ${openSections[4] ? 'open' : ''}`}>
                                    <ChevronDownIcon size={18} />
                                </div>
                            </div>
                            {openSections[4] && (
                                <div className="report-accordion-body">
                                    <div className="report-form-grid">
                                        <div className="report-field-group">
                                            <label className="report-field-label">
                                                <span>Total Calling</span>
                                                <span className="report-field-sublabel">Target / Done</span>
                                            </label>
                                            <div className="report-dual-input">
                                                <input 
                                                    type="number" 
                                                    placeholder="Target (e.g. 150)"
                                                    value={formData.callingLeads.totalCallingTarget}
                                                    onChange={(e) => handleNestedChange('callingLeads', 'totalCallingTarget', e.target.value)}
                                                />
                                                <span className="report-dual-separator">/</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="Done (e.g. 141)"
                                                    value={formData.callingLeads.totalCallingDone}
                                                    onChange={(e) => handleNestedChange('callingLeads', 'totalCallingDone', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">Follow-up Calls</label>
                                            <input 
                                                type="number" 
                                                placeholder="e.g. 95"
                                                value={formData.callingLeads.followupCalls}
                                                onChange={(e) => handleNestedChange('callingLeads', 'followupCalls', e.target.value)}
                                                className="report-input"
                                            />
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">
                                                <span>Total Leads vs Today's Leads</span>
                                                <span className="report-field-sublabel">Total / Today</span>
                                            </label>
                                            <div className="report-dual-input">
                                                <input 
                                                    type="number" 
                                                    placeholder="Total"
                                                    value={formData.callingLeads.totalLeads}
                                                    onChange={(e) => handleNestedChange('callingLeads', 'totalLeads', e.target.value)}
                                                />
                                                <span className="report-dual-separator">/</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="Today"
                                                    value={formData.callingLeads.todayLeads}
                                                    onChange={(e) => handleNestedChange('callingLeads', 'todayLeads', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">
                                                <span>Converted Leads</span>
                                                <span className="report-field-sublabel">Total / Today</span>
                                            </label>
                                            <div className="report-dual-input">
                                                <input 
                                                    type="number" 
                                                    placeholder="Total Converted"
                                                    value={formData.callingLeads.convertedLeadsTotal}
                                                    onChange={(e) => handleNestedChange('callingLeads', 'convertedLeadsTotal', e.target.value)}
                                                />
                                                <span className="report-dual-separator">/</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="Today Converted"
                                                    value={formData.callingLeads.convertedLeadsToday}
                                                    onChange={(e) => handleNestedChange('callingLeads', 'convertedLeadsToday', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">
                                                <span>Phone Leads / Meta Leads</span>
                                                <span className="report-field-sublabel">Phone / Meta</span>
                                            </label>
                                            <div className="report-dual-input">
                                                <input 
                                                    type="number" 
                                                    placeholder="Phone Leads"
                                                    value={formData.callingLeads.phoneLeads}
                                                    onChange={(e) => handleNestedChange('callingLeads', 'phoneLeads', e.target.value)}
                                                />
                                                <span className="report-dual-separator">/</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="Meta Leads"
                                                    value={formData.callingLeads.metaLeads}
                                                    onChange={(e) => handleNestedChange('callingLeads', 'metaLeads', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">Medium Calls</label>
                                            <input 
                                                type="number" 
                                                placeholder="e.g. 10"
                                                value={formData.callingLeads.mediumCalls}
                                                onChange={(e) => handleNestedChange('callingLeads', 'mediumCalls', e.target.value)}
                                                className="report-input"
                                            />
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">
                                                <span>Google Reviews</span>
                                                <span className="report-field-sublabel">Target / Achieved</span>
                                            </label>
                                            <div className="report-dual-input">
                                                <input 
                                                    type="number" 
                                                    placeholder="Target (e.g. 4)"
                                                    value={formData.callingLeads.googleReviewsTarget}
                                                    onChange={(e) => handleNestedChange('callingLeads', 'googleReviewsTarget', e.target.value)}
                                                />
                                                <span className="report-dual-separator">/</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="Done (e.g. 4)"
                                                    value={formData.callingLeads.googleReviewsDone}
                                                    onChange={(e) => handleNestedChange('callingLeads', 'googleReviewsDone', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 5. PATIENT DETAILS */}
                        <div className={`report-accordion-card ${openSections[5] ? 'open' : ''}`}>
                            <div className="report-accordion-header" onClick={() => toggleSection(5)}>
                                <div className="report-accordion-title">
                                    <span className="report-step-badge">5</span>
                                    <span>Patient Details</span>
                                </div>
                                <div className={`report-accordion-chevron ${openSections[5] ? 'open' : ''}`}>
                                    <ChevronDownIcon size={18} />
                                </div>
                            </div>
                            {openSections[5] && (
                                <div className="report-accordion-body">
                                    <div className="report-form-grid">
                                        <div className="report-field-group">
                                            <label className="report-field-label">
                                                <span>Today's Patients vs Monthly</span>
                                                <span className="report-field-sublabel">Today / Monthly</span>
                                            </label>
                                            <div className="report-dual-input">
                                                <input 
                                                    type="number" 
                                                    placeholder="Today (e.g. 50)"
                                                    value={formData.patientDetails.todayTotalPatients}
                                                    onChange={(e) => handleNestedChange('patientDetails', 'todayTotalPatients', e.target.value)}
                                                />
                                                <span className="report-dual-separator">/</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="Monthly (e.g. 298)"
                                                    value={formData.patientDetails.monthlyPatients}
                                                    onChange={(e) => handleNestedChange('patientDetails', 'monthlyPatients', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">
                                                <span>Done Patients</span>
                                                <span className="report-field-sublabel">Total / Today</span>
                                            </label>
                                            <div className="report-dual-input">
                                                <input 
                                                    type="number" 
                                                    placeholder="Total (e.g. 66)"
                                                    value={formData.patientDetails.totalDonePatients}
                                                    onChange={(e) => handleNestedChange('patientDetails', 'totalDonePatients', e.target.value)}
                                                />
                                                <span className="report-dual-separator">/</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="Today (e.g. 12)"
                                                    value={formData.patientDetails.todayDonePatients}
                                                    onChange={(e) => handleNestedChange('patientDetails', 'todayDonePatients', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">Patient Visits in Clinic</label>
                                            <input 
                                                type="number" 
                                                placeholder="e.g. 3"
                                                value={formData.patientDetails.patientVisits}
                                                onChange={(e) => handleNestedChange('patientDetails', 'patientVisits', e.target.value)}
                                                className="report-input"
                                            />
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">LHR Patients</label>
                                            <input 
                                                type="number" 
                                                placeholder="e.g. 2"
                                                value={formData.patientDetails.lhrPatients}
                                                onChange={(e) => handleNestedChange('patientDetails', 'lhrPatients', e.target.value)}
                                                className="report-input"
                                            />
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">Cosmetic Patients</label>
                                            <input 
                                                type="number" 
                                                placeholder="e.g. 5"
                                                value={formData.patientDetails.cosmeticPatients}
                                                onChange={(e) => handleNestedChange('patientDetails', 'cosmeticPatients', e.target.value)}
                                                className="report-input"
                                            />
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">Follow-up Patients</label>
                                            <input 
                                                type="number" 
                                                placeholder="e.g. 4"
                                                value={formData.patientDetails.followupPatients}
                                                onChange={(e) => handleNestedChange('patientDetails', 'followupPatients', e.target.value)}
                                                className="report-input"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 6. TASK MANAGEMENT */}
                        <div className={`report-accordion-card ${openSections[6] ? 'open' : ''}`}>
                            <div className="report-accordion-header" onClick={() => toggleSection(6)}>
                                <div className="report-accordion-title">
                                    <span className="report-step-badge">6</span>
                                    <span>Task Management (Target vs Done)</span>
                                </div>
                                <div className={`report-accordion-chevron ${openSections[6] ? 'open' : ''}`}>
                                    <ChevronDownIcon size={18} />
                                </div>
                            </div>
                            {openSections[6] && (
                                <div className="report-accordion-body">
                                    <div className="report-form-grid">
                                        <div className="report-field-group">
                                            <label className="report-field-label">
                                                <span>Tasks Overview</span>
                                                <span className="report-field-sublabel">Completed / Total</span>
                                            </label>
                                            <div className="report-dual-input">
                                                <input 
                                                    type="number" 
                                                    placeholder="Completed"
                                                    value={formData.taskManagement.completedTasks}
                                                    onChange={(e) => handleNestedChange('taskManagement', 'completedTasks', e.target.value)}
                                                />
                                                <span className="report-dual-separator">/</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="Total"
                                                    value={formData.taskManagement.totalTasks}
                                                    onChange={(e) => handleNestedChange('taskManagement', 'totalTasks', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">Task Sheet Photo Submitted?</label>
                                            <div className="report-toggle-group">
                                                {['Yes', 'No'].map(opt => (
                                                    <button 
                                                        key={opt}
                                                        type="button" 
                                                        className={`report-toggle-btn ${formData.taskManagement.taskSheetSubmitted === opt ? 'active' : ''}`}
                                                        onClick={() => handleNestedChange('taskManagement', 'taskSheetSubmitted', opt)}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">
                                                <span>Software Messages</span>
                                                <span className="report-field-sublabel">Done / Target</span>
                                            </label>
                                            <div className="report-dual-input">
                                                <input 
                                                    type="number" 
                                                    placeholder="Done"
                                                    value={formData.taskManagement.softwareMessagesDone}
                                                    onChange={(e) => handleNestedChange('taskManagement', 'softwareMessagesDone', e.target.value)}
                                                />
                                                <span className="report-dual-separator">/</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="Target"
                                                    value={formData.taskManagement.softwareMessagesTotal}
                                                    onChange={(e) => handleNestedChange('taskManagement', 'softwareMessagesTotal', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">
                                                <span>Bill Payment Tasks</span>
                                                <span className="report-field-sublabel">Done / Total</span>
                                            </label>
                                            <div className="report-dual-input">
                                                <input 
                                                    type="number" 
                                                    placeholder="Done"
                                                    value={formData.taskManagement.billPaymentDone}
                                                    onChange={(e) => handleNestedChange('taskManagement', 'billPaymentDone', e.target.value)}
                                                />
                                                <span className="report-dual-separator">/</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="Total"
                                                    value={formData.taskManagement.billPaymentTotal}
                                                    onChange={(e) => handleNestedChange('taskManagement', 'billPaymentTotal', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 7. CLINIC & STAFF COMPLIANCE */}
                        <div className={`report-accordion-card ${openSections[7] ? 'open' : ''}`}>
                            <div className="report-accordion-header" onClick={() => toggleSection(7)}>
                                <div className="report-accordion-title">
                                    <span className="report-step-badge">7</span>
                                    <span>Clinic & Staff Compliance</span>
                                </div>
                                <div className={`report-accordion-chevron ${openSections[7] ? 'open' : ''}`}>
                                    <ChevronDownIcon size={18} />
                                </div>
                            </div>
                            {openSections[7] && (
                                <div className="report-accordion-body">
                                    <div className="report-form-grid">
                                        <div className="report-field-group">
                                            <label className="report-field-label">Grooming Done?</label>
                                            <div className="report-toggle-group">
                                                {['Yes', 'No'].map(opt => (
                                                    <button 
                                                        key={opt}
                                                        type="button" 
                                                        className={`report-toggle-btn ${formData.compliance.grooming === opt ? 'active' : ''}`}
                                                        onClick={() => handleNestedChange('compliance', 'grooming', opt)}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">Oath / Prarthana Completed?</label>
                                            <div className="report-toggle-group">
                                                {['Yes', 'No', 'NA'].map(opt => (
                                                    <button 
                                                        key={opt}
                                                        type="button" 
                                                        className={`report-toggle-btn ${formData.compliance.oathCompleted === opt ? 'active' : ''}`}
                                                        onClick={() => handleNestedChange('compliance', 'oathCompleted', opt)}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">MR Count</label>
                                            <input 
                                                type="number" 
                                                placeholder="e.g. 0"
                                                value={formData.compliance.mrCount}
                                                onChange={(e) => handleNestedChange('compliance', 'mrCount', e.target.value)}
                                                className="report-input"
                                            />
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">Error Reported?</label>
                                            <div className="report-toggle-group">
                                                {['Yes', 'No'].map(opt => (
                                                    <button 
                                                        key={opt}
                                                        type="button" 
                                                        className={`report-toggle-btn ${formData.compliance.errorReported === opt ? 'active' : ''}`}
                                                        onClick={() => handleNestedChange('compliance', 'errorReported', opt)}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">
                                                <span>Errors (Solved / Total)</span>
                                                <span className="report-field-sublabel">Solved / Total</span>
                                            </label>
                                            <div className="report-dual-input">
                                                <input 
                                                    type="number" 
                                                    placeholder="Solved"
                                                    value={formData.compliance.solvedErrors}
                                                    onChange={(e) => handleNestedChange('compliance', 'solvedErrors', e.target.value)}
                                                />
                                                <span className="report-dual-separator">/</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="Total"
                                                    value={formData.compliance.totalErrors}
                                                    onChange={(e) => handleNestedChange('compliance', 'totalErrors', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 8. FOLLOW-UP & PENDING WORK */}
                        <div className={`report-accordion-card ${openSections[8] ? 'open' : ''}`}>
                            <div className="report-accordion-header" onClick={() => toggleSection(8)}>
                                <div className="report-accordion-title">
                                    <span className="report-step-badge">8</span>
                                    <span>Follow-up & Pending Work (Action Plan)</span>
                                </div>
                                <div className={`report-accordion-chevron ${openSections[8] ? 'open' : ''}`}>
                                    <ChevronDownIcon size={18} />
                                </div>
                            </div>
                            {openSections[8] && (
                                <div className="report-accordion-body">
                                    <div className="report-form-grid-3" style={{ marginBottom: '16px' }}>
                                        <div className="report-field-group">
                                            <label className="report-field-label">July Follow-ups</label>
                                            <input 
                                                type="number" 
                                                placeholder="e.g. 0"
                                                value={formData.followupPending.julyFollowups}
                                                onChange={(e) => handleNestedChange('followupPending', 'julyFollowups', e.target.value)}
                                                className="report-input"
                                            />
                                        </div>
                                        <div className="report-field-group">
                                            <label className="report-field-label">August Follow-ups</label>
                                            <input 
                                                type="number" 
                                                placeholder="e.g. 85"
                                                value={formData.followupPending.augustFollowups}
                                                onChange={(e) => handleNestedChange('followupPending', 'augustFollowups', e.target.value)}
                                                className="report-input"
                                            />
                                        </div>
                                        <div className="report-field-group">
                                            <label className="report-field-label">September Follow-ups</label>
                                            <input 
                                                type="number" 
                                                placeholder="e.g. 37"
                                                value={formData.followupPending.septemberFollowups}
                                                onChange={(e) => handleNestedChange('followupPending', 'septemberFollowups', e.target.value)}
                                                className="report-input"
                                            />
                                        </div>
                                        <div className="report-field-group">
                                            <label className="report-field-label">Other Pending Follow-ups</label>
                                            <input 
                                                type="number" 
                                                placeholder="e.g. 0"
                                                value={formData.followupPending.otherPendingFollowups}
                                                onChange={(e) => handleNestedChange('followupPending', 'otherPendingFollowups', e.target.value)}
                                                className="report-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="report-form-grid-full">
                                        <div className="report-field-group">
                                            <label className="report-field-label">Reason for Pending Work</label>
                                            <textarea 
                                                placeholder="Enter reason if any..."
                                                value={formData.followupPending.reasonPending}
                                                onChange={(e) => handleNestedChange('followupPending', 'reasonPending', e.target.value)}
                                                className="report-textarea"
                                            />
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">Today's Action Done</label>
                                            <textarea 
                                                placeholder="e.g. Masi ma ne hydra mate inform karyu. Next time aavse..."
                                                value={formData.followupPending.todayActionPlan}
                                                onChange={(e) => handleNestedChange('followupPending', 'todayActionPlan', e.target.value)}
                                                className="report-textarea"
                                            />
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">Tomorrow's Action Plan</label>
                                            <textarea 
                                                placeholder="Plan for tomorrow..."
                                                value={formData.followupPending.tomorrowActionPlan}
                                                onChange={(e) => handleNestedChange('followupPending', 'tomorrowActionPlan', e.target.value)}
                                                className="report-textarea"
                                            />
                                        </div>

                                        <div className="report-field-group">
                                            <label className="report-field-label">General Remarks & Notes</label>
                                            <textarea 
                                                placeholder="Any additional notes..."
                                                value={formData.followupPending.remarks}
                                                onChange={(e) => handleNestedChange('followupPending', 'remarks', e.target.value)}
                                                className="report-textarea"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="report-modal-footer">
                            <div className="report-status-text">
                                {saveSuccessMsg ? (
                                    <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ {saveSuccessMsg}</span>
                                ) : (
                                    <span>Fill required daily work details, then press Submit</span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setIsFormModalOpen(false)}
                                    style={{ padding: '9px 18px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#1e293b', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    form="dailyReportForm"
                                    disabled={saving}
                                    className="payments-btn-primary"
                                    style={{ padding: '9px 24px', fontSize: '13.5px' }}
                                >
                                    {saving ? 'Saving Report...' : '✓ Submit Daily Report'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
