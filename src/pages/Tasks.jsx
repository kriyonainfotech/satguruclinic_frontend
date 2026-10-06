import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import FormInput from '../components/FormInput';
import CalendarPicker, { formatDateToISO, formatDisplayDate } from '../components/CalendarPicker';
import DateRangePicker from '../components/DateRangePicker';
import SidebarCalendar from '../components/SidebarCalendar';
import StatusDropdown from '../components/StatusDropdown';
import CustomSelect from '../components/CustomSelect';
import Pagination from '../components/Pagination';
import {
  EditIcon,
  TrashIcon,
  SearchIcon,
  EyeIcon,
  FilterIcon,
  CalendarIcon,
  XIcon,
  PlusIcon,
  CheckSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  ClipboardListIcon
} from '../components/Icons';
import './Tasks.css';

const DEFAULT_CATEGORIES = [
  'General',
  'Patient Care',
  'Follow-up',
  'Prescription / Lab',
  'Billing / Accounts',
  'Clinic Operations'
];

// Helper to format due date as 'DD/MM/YY'
const formatShortDate = (dateVal) => {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

// Helper to format date as '01 Oct 2026'
const formatLongDate = (dateVal) => {
  if (!dateVal) return '';
  const parts = dateVal.split('-');
  if (parts.length !== 3) return dateVal;
  const [y, m, d] = parts;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(m, 10) - 1;
  return `${d} ${monthNames[monthIdx] || m} ${y}`;
};

const Tasks = ({ isEmbedded }) => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser.role || 'team';
  const isTeam = userRole === 'team';
  const isSuperadmin = userRole === 'superadmin';
  const isAdmin = userRole === 'admin';

  // Available Tabs based on user role
  const availableTabs = useMemo(() => {
    if (isSuperadmin) {
      return [
        { id: 'all', label: 'All Tasks' },
        { id: 'my', label: 'My Tasks' },
        { id: 'superadmin', label: 'Superadmin Tasks' },
        { id: 'admin', label: 'Admin Tasks' },
        { id: 'team', label: 'Team Tasks' }
      ];
    }
    if (isAdmin) {
      return [
        { id: 'my', label: 'My Tasks' },
        { id: 'team', label: 'Team Tasks' }
      ];
    }
    return [
      { id: 'my', label: 'My Tasks' }
    ];
  }, [isSuperadmin, isAdmin]);

  const [activeTab, setActiveTab] = useState('my');
  const [tasks, setTasks] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedstatus, setSelectedstatus] = useState('all');
  const [selectedAssignee, setSelectedAssignee] = useState('all');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => formatDateToISO(new Date()));

  // Modal State for Create / Edit
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingTaskData, setEditingTaskData] = useState(null);
  const [bulkEditStartDate, setBulkEditStartDate] = useState('');
  const [bulkEditEndDate, setBulkEditEndDate] = useState('');

  // Bulk Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');

  // View Details Modal
  const [viewingTask, setViewingTask] = useState(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [customCategory, setCustomCategory] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [status, setstatus] = useState('Pending');
  const [message, setMessage] = useState('');
  const [checklistTemplates, setChecklistTemplates] = useState([]);
  const [selectedChecklist, setSelectedChecklist] = useState('');

  // Initial Fetch & Refresh on filter change
  useEffect(() => {
    fetchTasks();
    fetchChecklistTemplates();
    if (assignableUsers.length === 0) {
      fetchAssignableUsers();
    }
  }, [activeTab, searchQuery, selectedYear, selectedMonth, selectedstatus, selectedAssignee]);

  const currentUserId = currentUser.id || currentUser._id;

  // Filter assignees based on role
  const teamAssignees = useMemo(() => {
    if (isTeam) {
      return assignableUsers.filter(u => (u._id || u.id) === currentUserId);
    }
    return assignableUsers.filter(u => (u.role || '').toLowerCase() === 'team');
  }, [assignableUsers, isTeam, currentUserId]);

  const adminAssignees = useMemo(() => {
    return assignableUsers.filter(u => (u.role || '').toLowerCase() === 'admin');
  }, [assignableUsers]);

  const superadminAssignees = useMemo(() => {
    return assignableUsers.filter(u => (u.role || '').toLowerCase() === 'superadmin');
  }, [assignableUsers]);

  // Current tab's eligible assignees
  const currentTabAssignees = useMemo(() => {
    if (activeTab === 'team') return teamAssignees;
    if (activeTab === 'admin') return adminAssignees;
    if (activeTab === 'superadmin') return superadminAssignees;
    return assignableUsers;
  }, [activeTab, teamAssignees, adminAssignees, superadminAssignees, assignableUsers]);

  const fetchChecklistTemplates = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/checklists`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (Array.isArray(res.data)) {
        setChecklistTemplates(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      if (activeTab === 'my') {
        params.append('tab', 'my');
      } else {
        params.append('tab', activeTab);
      }

      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedYear) params.append('year', selectedYear);
      if (selectedMonth) params.append('month', selectedMonth);
      if (selectedstatus && selectedstatus !== 'all') params.append('status', selectedstatus);
      if (selectedAssignee && selectedAssignee !== 'all') params.append('assignedTo', selectedAssignee);

      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/tasks?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(res.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignableUsers = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/tasks/assignable-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        setAssignableUsers(res.data);
        return;
      }
    } catch (error) {
      console.warn('Assignable users endpoint fallback triggered:', error);
    }

    try {
      const [teamRes, adminRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/users/team`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/users/admin`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      ]);

      const combined = [...(teamRes.data || []), ...(adminRes.data || [])];
      if (combined.length > 0) {
        setAssignableUsers(combined);
      }
    } catch (err) {
      console.error('Error in fallback user fetch:', err);
    }
  };

  // Filter tasks displayed in table and cards by selected calendar date if active
  const displayedTasks = useMemo(() => {
    if (!selectedCalendarDate) return tasks;
    return tasks.filter(t => {
      if (!t.dueDate) return false;
      return formatDateToISO(t.dueDate) === selectedCalendarDate;
    });
  }, [tasks, selectedCalendarDate]);

  // Metrics overview
  const metrics = useMemo(() => {
    const total = displayedTasks.length;
    const done = displayedTasks.filter(t => t.status === 'Done' || t.status === 'Completed' || t.status === 'Approved').length;
    const overdue = displayedTasks.filter(t => t.status === 'Overdue').length;
    const pending = total - done - overdue;
    return { total, done, pending: pending < 0 ? 0 : pending, overdue };
  }, [displayedTasks]);

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedYear, selectedMonth, selectedstatus, selectedAssignee, selectedCalendarDate, activeTab, tasks]);

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const paginatedTasks = displayedTasks.slice(indexOfFirstRecord, indexOfLastRecord);

  // Dynamic Add Button Text
  const addButtonLabel = useMemo(() => {
    if (activeTab === 'team') return '+ Add Team Task';
    if (activeTab === 'admin') return '+ Add Admin Task';
    if (activeTab === 'superadmin') return '+ Add Superadmin Task';
    return 'Add Task';
  }, [activeTab]);

  const openBulkModal = () => {
    fetchChecklistTemplates();
    setTitle('');
    setDescription('');
    setCategory('General');
    setCustomCategory('');
    
    setAssignedTo(currentUserId);
    setBulkStartDate('');
    setBulkEndDate('');
    setPriority('Medium');
    setMessage('');
    setSelectedChecklist('');
    setShowBulkModal(true);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setMessage('Task title is required');
      return;
    }
    if (!bulkStartDate || !bulkEndDate) {
      setMessage('Date range is required');
      return;
    }
    if (bulkStartDate === bulkEndDate) {
        setMessage('Please select a Date Range (Start Date and End Date must be different for a Bulk Task). Click two different dates in the calendar.');
        return;
      }
      if (new Date(bulkStartDate) > new Date(bulkEndDate)) {
      setMessage('End Date must be after Start Date');
      return;
    }
    
    // Generate dates
    const dueDates = [];
    let current = new Date(bulkStartDate);
    const end = new Date(bulkEndDate);
    while (current <= end) {
      dueDates.push(formatDateToISO(current));
      current.setDate(current.getDate() + 1);
    }

    try {
      const token = localStorage.getItem('token');
      let targetAssignee = assignedTo;
      if (assignedTo === 'ALL_TEAM') {
        targetAssignee = teamAssignees.map(u => u._id || u.id).filter(Boolean);
        if (!targetAssignee || targetAssignee.length === 0) targetAssignee = 'ALL_TEAM';
      } else if (assignedTo === 'ALL_ADMIN') {
        targetAssignee = adminAssignees.map(u => u._id || u.id).filter(Boolean);
        if (!targetAssignee || targetAssignee.length === 0) targetAssignee = 'ALL_ADMIN';
      }

      if (!targetAssignee || (Array.isArray(targetAssignee) && targetAssignee.length === 0)) {
        setMessage('Please select an assignee.');
        return;
      }

      console.log('Generated dueDates:', dueDates);
      
      let finalCategory = category;
      if (category === 'Custom' && customCategory.trim()) {
        finalCategory = customCategory.trim();
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category: finalCategory,
        dueDates, // Multiple dates
        dueDate: dueDates.length > 0 ? dueDates[0] : null, // Fallback for backend validation
        priority,
        status: 'Pending'
      };

      if (category === 'Checklist' && selectedChecklist) {
        payload.checklistTemplate = selectedChecklist;
        const tpl = checklistTemplates.find(t => t._id === selectedChecklist);
        if (tpl) payload.checklistItems = tpl.items.map(i => ({ text: i, isCompleted: false }));
      }

      if (Array.isArray(targetAssignee) && targetAssignee.length > 1) {
        payload.assignedTo = targetAssignee;
      } else {
        payload.assignedTo = Array.isArray(targetAssignee) ? targetAssignee[0] : targetAssignee;
      }

      console.log('Sending Bulk Add payload:', payload);

      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/tasks`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchTasks();
      fetchChecklistTemplates();
      setSelectedCalendarDate(bulkStartDate);
      setShowBulkModal(false);
    } catch (err) {
      console.error('Error bulk adding tasks:', err);
      setMessage(err.response?.data?.message || 'Error bulk adding tasks');
    }
  };

  const openCreateModal = () => {
    fetchChecklistTemplates();
    setIsEditMode(false);
    setEditingId(null);
    setTitle('');
    setDescription('');
    setCategory('General');
    setCustomCategory('');

    if (assignableUsers.length === 0) {
      fetchAssignableUsers();
    }

    let defaultAssignee = '';
    if (activeTab === 'my') {
      defaultAssignee = currentUserId;
    } else if (activeTab === 'team') {
      defaultAssignee = teamAssignees.length > 1 ? 'ALL_TEAM' : (teamAssignees.length > 0 ? teamAssignees[0]._id : '');
    } else if (activeTab === 'admin') {
      defaultAssignee = adminAssignees.length > 1 ? 'ALL_ADMIN' : (adminAssignees.length > 0 ? adminAssignees[0]._id : '');
    } else if (activeTab === 'superadmin') {
      defaultAssignee = superadminAssignees.length > 0 ? superadminAssignees[0]._id : currentUserId;
    }

    setAssignedTo(defaultAssignee);
    setDueDate(formatDateToISO(new Date()));
    setPriority('Medium');
    setstatus('Pending');
    setMessage('');
    setSelectedChecklist('');
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setIsEditMode(true);
    setEditingId(task._id);
    setEditingTaskData(task);
    if (task.isBulkTask && task.bulkStartDate && task.bulkEndDate) {
      setBulkEditStartDate(formatDateToISO(new Date(task.bulkStartDate)));
      setBulkEditEndDate(formatDateToISO(new Date(task.bulkEndDate)));
    } else {
      setBulkEditStartDate('');
      setBulkEditEndDate('');
    }
    setTitle(task.title);
    setDescription(task.description || '');
    if (DEFAULT_CATEGORIES.includes(task.category)) {
      setCategory(task.category);
      setCustomCategory('');
    } else {
      setCategory('Other');
      setCustomCategory(task.category || '');
    }
    setAssignedTo(task.assignedTo?._id || '');
    setDueDate(formatDateToISO(new Date(task.dueDate)));
    setPriority(task.priority || 'Medium');
    setstatus(task.status || 'Pending');
    setMessage('');
    setSelectedChecklist(task.checklistTemplate || '');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setMessage('Task title is required');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      let targetAssignee = assignedTo;
      if (activeTab === 'my') {
        targetAssignee = currentUserId;
      } else if (assignedTo === 'ALL_TEAM') {
        targetAssignee = teamAssignees.map(u => u._id || u.id).filter(Boolean);
        if (!targetAssignee || targetAssignee.length === 0) targetAssignee = 'ALL_TEAM';
      } else if (assignedTo === 'ALL_ADMIN') {
        targetAssignee = adminAssignees.map(u => u._id || u.id).filter(Boolean);
        if (!targetAssignee || targetAssignee.length === 0) targetAssignee = 'ALL_ADMIN';
      }

      if (!targetAssignee || (Array.isArray(targetAssignee) && targetAssignee.length === 0)) {
        setMessage('Please select an assignee.');
        return;
      }

      const finalCategory = category === 'Other' ? (customCategory.trim() || 'General') : category;

      let checklistItems = [];
      if (!isEditMode && selectedChecklist) {
        const template = checklistTemplates.find(t => t._id === selectedChecklist);
        if (template && template.items) {
          checklistItems = template.items.map(item => ({ text: item.text, isCompleted: false }));
        }
      }

      let bulkDueDates = [];
        if (isEditMode && editingTaskData?.isBulkTask) {
          if (!bulkEditStartDate || !bulkEditEndDate || bulkEditStartDate === bulkEditEndDate) {
            setMessage('For Bulk Tasks, please select a valid Date Range with two different dates.');
            return;
          }
          let current = new Date(bulkEditStartDate);
          const end = new Date(bulkEditEndDate);
          while (current <= end) {
            bulkDueDates.push(formatDateToISO(current));
            current.setDate(current.getDate() + 1);
          }
        }

        const basePayload = {
        checklistTemplate: selectedChecklist || undefined,
        checklistItems: !isEditMode ? checklistItems : undefined,
        title: title.trim(),
        description: description.trim(),
        category: finalCategory,
        dueDate,
        priority,
        status
      };

      if (isEditMode) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/tasks/${editingId}`, {
          ...basePayload,
          assignedTo: Array.isArray(targetAssignee) ? targetAssignee[0] : targetAssignee
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Task updated successfully!');
      } else if (Array.isArray(targetAssignee)) {
        await Promise.all(
          targetAssignee.map(userId =>
            axios.post(`${import.meta.env.VITE_API_BASE_URL}/tasks`, {
              ...basePayload,
              assignedTo: userId
            }, {
              headers: { Authorization: `Bearer ${token}` }
            })
          )
        );
        setMessage(`Tasks created successfully for ${targetAssignee.length} members!`);
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/tasks`, {
          ...basePayload,
          assignedTo: targetAssignee
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Task created successfully!');
      }

      fetchTasks();
    fetchChecklistTemplates();
      if (dueDate) {
        setSelectedCalendarDate(dueDate);
      }
      setTimeout(() => {
        setShowModal(false);
        setMessage('');
      }, 1000);
    } catch (error) {
      console.error('Error creating task:', error);
      const detail = error.response?.data?.message 
        || error.response?.data?.error 
        || error.message 
        || `Error ${isEditMode ? 'updating' : 'creating'} task`;
      setMessage(detail);
    }
  };

  const toggleChecklistItem = async (task, itemIndex) => {
    try {
      const updatedItems = [...task.checklistItems];
      updatedItems[itemIndex].isCompleted = !updatedItems[itemIndex].isCompleted;
      
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/tasks/${task._id}`,
        { checklistItems: updatedItems },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const updatedTask = { ...task, checklistItems: updatedItems };
      if (viewingTask && viewingTask._id === task._id) {
        setViewingTask(updatedTask);
      }
      setTasks(tasks.map(t => t._id === task._id ? updatedTask : t));
    } catch (error) {
      console.error('Error updating checklist item:', error);
      alert('Failed to update checklist item');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    if (newStatus === 'Completed' || newStatus === 'Done') {
      const taskToUpdate = tasks.find(t => t._id === taskId);
      if (taskToUpdate && taskToUpdate.checklistItems && taskToUpdate.checklistItems.length > 0) {
        const hasUnticked = taskToUpdate.checklistItems.some(item => !item.isCompleted);
        if (hasUnticked) {
          alert('You must complete all checklist items before marking this task as ' + newStatus);
          return;
        }
      }
    }
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL}/tasks/${taskId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks(tasks.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error('Error changing status:', error);
      alert('Error updating status: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTasks();
    fetchChecklistTemplates();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedYear('');
    setSelectedMonth('');
    setSelectedstatus('all');
    setSelectedAssignee('all');
    setSelectedCalendarDate(formatDateToISO(new Date()));
  };

  // Generate Year options
  const YEAR_OPTIONS = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear - 3; y <= currentYear + 10; y++) {
      years.push(y.toString());
    }
    return years;
  }, []);

  const MONTH_LIST = [
    { val: '01', label: 'January' },
    { val: '02', label: 'February' },
    { val: '03', label: 'March' },
    { val: '04', label: 'April' },
    { val: '05', label: 'May' },
    { val: '06', label: 'June' },
    { val: '07', label: 'July' },
    { val: '08', label: 'August' },
    { val: '09', label: 'September' },
    { val: '10', label: 'October' },
    { val: '11', label: 'November' },
    { val: '12', label: 'December' },
  ];

  // CustomSelect Options for Filters
  const yearSelectOptions = useMemo(() => [
    { value: '', label: 'Select Year' },
    ...YEAR_OPTIONS.map(y => ({ value: y, label: y }))
  ], [YEAR_OPTIONS]);

  const monthSelectOptions = useMemo(() => [
    { value: '', label: 'Select Month' },
    ...MONTH_LIST.map(m => ({ value: m.val, label: m.label }))
  ], []);

  const statusFilterOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Overdue', label: 'Overdue' },
    { value: 'Done', label: 'Done' }
  ];

  const assigneeFilterOptions = useMemo(() => {
    const defaultLabel = activeTab === 'team'
      ? 'All Team Members'
      : activeTab === 'admin'
      ? 'All Admins'
      : activeTab === 'superadmin'
      ? 'All Superadmins'
      : 'All Assignees';

    return [
      { value: 'all', label: defaultLabel },
      ...currentTabAssignees.map(u => ({ value: u._id, label: u.name }))
    ];
  }, [activeTab, currentTabAssignees]);

  // Modal CustomSelect Options
  const categorySelectOptions = useMemo(() => [
    ...DEFAULT_CATEGORIES.map(cat => ({ value: cat, label: cat })),
    { value: 'Other', label: '+ Custom Category' }
  ], []);

  const prioritySelectOptions = [
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' }
  ];

  const modalAssigneeOptions = useMemo(() => {
    if (isEditMode) {
      const opts = [];
      opts.push({ value: currentUserId, label: `${currentUser.name || 'Myself'} (Myself)` });
      if (isSuperadmin) {
        adminAssignees.forEach(u => {
          if (u._id !== currentUserId) opts.push({ value: u._id, label: `${u.name} (Admin)` });
        });
        teamAssignees.forEach(u => {
          if (u._id !== currentUserId) opts.push({ value: u._id, label: `${u.name} (Team)` });
        });
      } else if (isAdmin) {
        teamAssignees.forEach(u => {
          if (u._id !== currentUserId) opts.push({ value: u._id, label: `${u.name} (Team)` });
        });
      }
      return opts;
    }

    if (activeTab === 'team') {
      const opts = [];
      if (teamAssignees.length > 1) {
        opts.push({
          value: 'ALL_TEAM',
          label: `All Team Members (${teamAssignees.length} Members)`
        });
      }
      teamAssignees.forEach(u => {
        opts.push({
          value: u._id,
          label: u._id === currentUserId ? `${u.name} (Myself)` : u.name
        });
      });
      return opts;
    }

    if (activeTab === 'admin') {
      const opts = [];
      if (adminAssignees.length > 1) {
        opts.push({
          value: 'ALL_ADMIN',
          label: `All Admins (${adminAssignees.length} Admins)`
        });
      }
      adminAssignees.forEach(u => {
        opts.push({
          value: u._id,
          label: u._id === currentUserId ? `${u.name} (Myself)` : u.name
        });
      });
      return opts;
    }

    const defaultLabel = activeTab === 'superadmin' ? 'Select Superadmin' : 'Select Assignee';

    return [
      { value: '', label: defaultLabel },
      ...currentTabAssignees.map(u => ({
        value: u._id,
        label: u._id === currentUserId ? `${u.name} (Myself)` : u.name
      }))
    ];
  }, [activeTab, teamAssignees, adminAssignees, currentTabAssignees, currentUserId, isEditMode, isSuperadmin, isAdmin, currentUser.name]);

  const bulkAssigneeOptions = useMemo(() => {
    const opts = [];
    opts.push({ value: currentUserId, label: 'Assigned to Self' });
    if (isSuperadmin) {
      if (adminAssignees.length > 0) opts.push({ value: 'ALL_ADMIN', label: 'All Admins' });
      if (teamAssignees.length > 0) opts.push({ value: 'ALL_TEAM', label: 'All Team Members' });
      adminAssignees.forEach(u => opts.push({ value: u._id, label: `${u.name} (Admin)` }));
      teamAssignees.forEach(u => opts.push({ value: u._id, label: `${u.name} (Team)` }));
    } else if (isAdmin) {
      if (teamAssignees.length > 0) opts.push({ value: 'ALL_TEAM', label: 'All Team Members' });
      teamAssignees.forEach(u => opts.push({ value: u._id, label: `${u.name} (Team)` }));
    }
    return opts;
  }, [isSuperadmin, isAdmin, adminAssignees, teamAssignees, currentUserId]);

  const modalstatusOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Done', label: 'Done' },
    { value: 'Overdue', label: 'Overdue' }
  ];

  const isAnyFilterActive = Boolean(
    selectedYear ||
    selectedMonth ||
    selectedstatus !== 'all' ||
    selectedAssignee !== 'all' ||
    searchQuery.trim() ||
    (selectedCalendarDate && selectedCalendarDate !== formatDateToISO(new Date()))
  );

  const renderMetricsCard = (customStyle = {}) => (
    <div className="task-metrics-card" style={customStyle}>
      <div className="task-metrics-header">
        <span className="task-metrics-title">TASKS OVERVIEW</span>
        <span className="task-metrics-badge">
          {selectedCalendarDate ? formatLongDate(selectedCalendarDate) : 'All Dates'}
        </span>
      </div>
      <div className="task-metrics-grid" style={customStyle.gridStyle ? customStyle.gridStyle : {}}>
        <div className="task-metric-box total">
          <div className="metric-icon-wrap"><CheckSquareIcon size={16} /></div>
          <div className="metric-info">
            <span className="metric-label">TOTAL</span>
            <strong className="metric-val">{metrics.total}</strong>
          </div>
        </div>
        <div className="task-metric-box done">
          <div className="metric-icon-wrap"><CheckCircleIcon size={16} /></div>
          <div className="metric-info">
            <span className="metric-label">DONE</span>
            <strong className="metric-val">{metrics.done}</strong>
          </div>
        </div>
        <div className="task-metric-box pending">
          <div className="metric-icon-wrap"><ClockIcon size={16} /></div>
          <div className="metric-info">
            <span className="metric-label">PENDING</span>
            <strong className="metric-val">{metrics.pending}</strong>
          </div>
        </div>
        <div className="task-metric-box overdue">
          <div className="metric-icon-wrap"><AlertTriangleIcon size={16} /></div>
          <div className="metric-info">
            <span className="metric-label">OVERDUE</span>
            <strong className="metric-val">{metrics.overdue}</strong>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="task-page-container" style={isEmbedded ? { padding: 0 } : {}}>
      {/* Top Page Header */}
      {!isEmbedded && (
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <h2>Task Management</h2>
        {!isTeam && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="crm-btn crm-btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={openBulkModal}
            >
              Bulk Add
            </button>
            <button
              type="button"
              className="crm-btn crm-btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={openCreateModal}
            >
              <PlusIcon size={16} /> {addButtonLabel}
            </button>
          </div>
        )}
      </div>
      )}

      {/* Role Navigation Tabs */}
      <div className="task-tabs-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
        <div className="custom-pill-tabs">
          {availableTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`pill-tab-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedAssignee('all');
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isTeam && (
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginLeft: '10px' }}>
            <div className="task-metric-box total" style={{ padding: '8px 12px', minHeight: 'auto', minWidth: '130px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="metric-icon-wrap" style={{ width: '32px', height: '32px' }}><CheckSquareIcon size={16} /></div>
              <div className="metric-info">
                <span className="metric-label" style={{ fontSize: '11px' }}>TOTAL</span>
                <strong className="metric-val" style={{ fontSize: '18px' }}>{metrics.total}</strong>
              </div>
            </div>
            
            <div className="task-metric-box done" style={{ padding: '8px 12px', minHeight: 'auto', minWidth: '130px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="metric-icon-wrap" style={{ width: '32px', height: '32px' }}><CheckCircleIcon size={16} /></div>
              <div className="metric-info">
                <span className="metric-label" style={{ fontSize: '11px' }}>DONE</span>
                <strong className="metric-val" style={{ fontSize: '18px' }}>{metrics.done}</strong>
              </div>
            </div>

            <div className="task-metric-box pending" style={{ padding: '8px 12px', minHeight: 'auto', minWidth: '130px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="metric-icon-wrap" style={{ width: '32px', height: '32px' }}><ClockIcon size={16} /></div>
              <div className="metric-info">
                <span className="metric-label" style={{ fontSize: '11px' }}>PENDING</span>
                <strong className="metric-val" style={{ fontSize: '18px' }}>{metrics.pending}</strong>
              </div>
            </div>

            <div className="task-metric-box overdue" style={{ padding: '8px 12px', minHeight: 'auto', minWidth: '130px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="metric-icon-wrap" style={{ width: '32px', height: '32px' }}><AlertTriangleIcon size={16} /></div>
              <div className="metric-info">
                <span className="metric-label" style={{ fontSize: '11px' }}>OVERDUE</span>
                <strong className="metric-val" style={{ fontSize: '18px' }}>{metrics.overdue}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2-Column Split Layout */}
      <div className="task-split-layout">
        {/* Left Main Column */}
        <div className="task-main-column">
          {/* Controls Card: Search + CustomSelect Filters */}
          <div className="task-controls-card">
            {/* Search Input Row */}
            <div className="task-search-row">
              <div className="task-search-input-box">
                <SearchIcon size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search tasks, assignees, creators, priorities, categories..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            {/* CustomSelect Filters Row */}
            <div className="task-secondary-filter-bar">
              {/* Year Filter */}
              <div className="filter-item-wrapper" style={{ minWidth: '130px', flex: '1 1 120px' }}>
                <CustomSelect
                  value={selectedYear}
                  onChange={setSelectedYear}
                  options={yearSelectOptions}
                  placeholder="Select Year"
                />
              </div>

              {/* Month Filter */}
              <div className="filter-item-wrapper" style={{ minWidth: '140px', flex: '1 1 130px' }}>
                <CustomSelect
                  value={selectedMonth}
                  onChange={val => {
                    setSelectedMonth(val);
                    if (val && !selectedYear) {
                      setSelectedYear(new Date().getFullYear().toString());
                    }
                  }}
                  options={monthSelectOptions}
                  placeholder="Select Month"
                />
              </div>

              {/* Status Filter */}
              <div className="filter-item-wrapper" style={{ minWidth: '130px', flex: '1 1 120px' }}>
                <CustomSelect
                  value={selectedstatus}
                  onChange={setSelectedstatus}
                  options={statusFilterOptions}
                  placeholder="All Status"
                />
              </div>

              {/* Assignee Filter (Hidden for 'my' tab) */}
              {activeTab !== 'my' && (
                <div className="filter-item-wrapper" style={{ minWidth: '160px', flex: '1 1 150px' }}>
                  <CustomSelect
                    value={selectedAssignee}
                    onChange={setSelectedAssignee}
                    options={assigneeFilterOptions}
                    placeholder="All Assignees"
                  />
                </div>
              )}

              {/* Reset Filters Action */}
              {isAnyFilterActive && (
                <button
                  type="button"
                  className="filter-clear-all-btn"
                  onClick={handleClearFilters}
                  title="Reset all filters to defaults"
                >
                  <FilterIcon size={13} /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Active Calendar Date Strip */}
          {selectedCalendarDate && (
            <div className="active-calendar-date-bar">
              <div className="date-bar-left">
                <CalendarIcon size={15} color="#2563eb" />
                <span>
                  Viewing tasks for <strong>{formatLongDate(selectedCalendarDate)}</strong>
                </span>
                {selectedCalendarDate === formatDateToISO(new Date()) && (
                  <span className="today-badge">Today</span>
                )}
              </div>

              <div className="date-bar-actions">
                {selectedCalendarDate !== formatDateToISO(new Date()) && (
                  <button
                    type="button"
                    className="date-bar-action-btn"
                    onClick={() => setSelectedCalendarDate(formatDateToISO(new Date()))}
                  >
                    Jump to Today
                  </button>
                )}
                <button
                  type="button"
                  className="date-bar-action-btn clear"
                  onClick={() => setSelectedCalendarDate('')}
                >
                  View All Dates
                </button>
              </div>
            </div>
          )}

          {/* Tasks Table */}
          <div className="custom-task-table-wrap">
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}><div className="global-loader-container"><div className="global-spinner"></div><div>Loading tasks...</div></div></div>
            ) : displayedTasks.length === 0 ? (
              <div className="task-empty-state">
                <div className="task-empty-icon-wrap">
                  <ClipboardListIcon size={32} color="#94a3b8" />
                </div>
                <h3 className="task-empty-title">
                  {selectedCalendarDate
                    ? `No tasks scheduled for ${formatLongDate(selectedCalendarDate)}`
                    : 'No tasks found matching your criteria'}
                </h3>
                <p className="task-empty-subtitle">
                  {selectedCalendarDate
                    ? 'Pick another date on the calendar to view tasks or schedule a new task for this day.'
                    : 'Try clearing your search query or adjusting your status filters.'}
                </p>
                {!isTeam && (
                  <button
                    type="button"
                    className="task-empty-btn"
                    onClick={openCreateModal}
                  >
                    <PlusIcon size={15} /> {addButtonLabel}
                  </button>
                )}
              </div>
            ) : (
              <>
                <table className="custom-task-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center' }}>Sr.no</th>
                      <th style={{ width: '32%' }}>Task</th>
                      <th style={{ width: '22%' }}>Assignee</th>
                      <th style={{ width: '16%' }}>Due Date</th>
                      <th style={{ width: '16%' }}>Status</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTasks.map((task, idx) => {
                      const assigneeInitial = (task.assignedTo?.name || 'U').charAt(0).toUpperCase();

                      return (
                        <tr key={task._id}>
                          <td style={{ textAlign: 'center' }}>
                            <span className="sr-num-pill">{indexOfFirstRecord + idx + 1}</span>
                          </td>
                          <td>
                            <div className="task-title-cell">
                              <span className="task-title-text">{task.title}</span>
                              {task.category && (
                                <span className="task-category-badge">
                                  #{task.category}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="task-assignee-cell">
                              <span
                                className="assignee-avatar"
                                title={task.assignedTo?.name || '-'}
                              >
                                {assigneeInitial}
                              </span>
                              <div className="assignee-details">
                                <span className="assignee-name">
                                  {task.assignedTo?.name || '-'}
                                </span>
                                <span className="assignee-role-tag">
                                  {task.assignedTo?.role || ''}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="task-due-cell">
                              <CalendarIcon size={14} />
                              <span>{formatShortDate(task.dueDate)}</span>
                            </div>
                          </td>
                          <td>
                            <div className="status-dropdown-container">
                              <StatusDropdown
                                value={task.status}
                                onChange={(newStatus) => handleStatusChange(task._id, newStatus)}
                              />
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="table-action-icons-wrap">
                              <button
                                type="button"
                                className="action-btn view tbl-icon-btn"
                                title="View Description"
                                aria-label="View Description"
                                onClick={() => setViewingTask(task)}
                              >
                                <EyeIcon size={16} />
                              </button>
                              {!isTeam && ( <><button
                                type="button"
                                className="action-btn edit tbl-icon-btn"
                                title="Edit Task"
                                aria-label="Edit Task"
                                onClick={() => openEditModal(task)}
                              >
                                <EditIcon size={16} />
                              </button>
                              <button
                                type="button"
                                className="action-btn delete tbl-icon-btn"
                                title="Delete Task"
                                aria-label="Delete Task"
                                onClick={() => handleDelete(task._id)}
                              >
                                <TrashIcon size={16} />
                              </button></> )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {displayedTasks.length > 0 && (
                  <div className="desktop-only-pagination">
                    <Pagination
                      currentPage={currentPage}
                      totalItems={displayedTasks.length}
                      itemsPerPage={recordsPerPage}
                      onPageChange={setCurrentPage}
                      itemName="tasks"
                    />
                  </div>
                )}

                {/* Mobile / Tablet Responsive Card View */}
                <div className="task-mobile-card-view">
                  {paginatedTasks.map((task, idx) => {
                    const isDone = task.status === 'Completed' || task.status === 'Done' || task.status === 'Approved';
                    const assigneeInitial = (task.assignedTo?.name || 'U').charAt(0).toUpperCase();

                    return (
                      <div key={task._id} className={`task-mobile-card ${isDone ? 'done' : ''}`}>
                        <div className="task-mobile-card-header">
                          <div className="task-mobile-left">
                            <span className="sr-num-pill">{indexOfFirstRecord + idx + 1}</span>
                            <div className="task-mobile-title-wrap">
                              <span className="task-mobile-title">{task.title}</span>
                              <div className="task-mobile-title-row2">
                                {task.category && (
                                  <span className="task-category-badge">#{task.category}</span>
                                )}
                                <StatusDropdown
                                  value={task.status}
                                  onChange={(newStatus) => handleStatusChange(task._id, newStatus)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="task-mobile-card-body">
                          <div className="task-mobile-info-item">
                            <span className="assignee-avatar" title={task.assignedTo?.name || '-'}>
                              {assigneeInitial}
                            </span>
                            <span className="task-mobile-assignee">{task.assignedTo?.name || '-'}</span>
                          </div>

                          <div className="task-mobile-info-item">
                            <CalendarIcon size={12} style={{ color: '#64748b' }} />
                            <span className="task-mobile-due">{formatShortDate(task.dueDate)}</span>
                          </div>

                          <div className="task-mobile-info-item" style={{ gap: '4px', marginLeft: 'auto' }}>
                            <button
                              type="button"
                              className="action-btn view tbl-icon-btn"
                              title="View Description"
                              onClick={() => setViewingTask(task)}
                            >
                              <EyeIcon size={14} />
                            </button>
                            {!isTeam && ( <><button
                              type="button"
                              className="action-btn edit tbl-icon-btn"
                              title="Edit Task"
                              onClick={() => openEditModal(task)}
                            >
                              <EditIcon size={14} />
                            </button>
                            <button
                              type="button"
                              className="action-btn delete tbl-icon-btn"
                              title="Delete Task"
                              onClick={() => handleDelete(task._id)}
                            >
                              <TrashIcon size={14} />
                            </button></> )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {displayedTasks.length > 0 && (
                  <div className="mobile-only-pagination" style={{ marginTop: '14px', width: '100%' }}>
                    <Pagination
                      currentPage={currentPage}
                      totalItems={displayedTasks.length}
                      itemsPerPage={recordsPerPage}
                      onPageChange={setCurrentPage}
                      itemName="tasks"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar Column */}
        <div className="task-side-column">
          {/* Modern 2x2 Overview Metrics Grid */}
          {!isTeam && renderMetricsCard()}

          {/* Embedded CALENDAR Widget */}
          <SidebarCalendar
            selectedDate={selectedCalendarDate}
            onSelectDate={setSelectedCalendarDate}
            tasks={tasks}
          />
        </div>
      </div>

      {/* View Task Description Modal */}
      {viewingTask && (
        <div className="modal-overlay" onClick={() => setViewingTask(null)}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                <EyeIcon size={18} style={{ color: '#0284c7' }} />
                Task Details
              </h3>
              <button
                className="modal-close"
                title="Close"
                aria-label="Close"
                onClick={() => setViewingTask(null)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: 600, lineHeight: 1.4 }}>
                {viewingTask.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {viewingTask.category && (
                  <span className="task-category-badge">#{viewingTask.category}</span>
                )}
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Due: <strong>{formatShortDate(viewingTask.dueDate)}</strong>
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Assignee: <strong>{viewingTask.assignedTo?.name || '-'}</strong>
                </span>
              </div>
            </div>

            <label className="compact-field-label">Description</label>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px 16px',
                color: '#334155',
                fontSize: '13.5px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                minHeight: '50px',
                maxHeight: '200px',
                overflowY: 'auto',
                marginBottom: viewingTask.checklistItems && viewingTask.checklistItems.length > 0 ? '14px' : '0'
              }}
            >
              {viewingTask.description && viewingTask.description.trim() ? (
                viewingTask.description
              ) : (
                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                  No description provided for this task.
                </span>
              )}
            </div>

            {viewingTask.checklistItems && viewingTask.checklistItems.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <label className="compact-field-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Checklist
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px' }}>
                    {viewingTask.checklistItems.filter(i => i.isCompleted).length} / {viewingTask.checklistItems.length} Completed
                  </span>
                </label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#fff' }}>
                  {viewingTask.checklistItems.map((item, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => toggleChecklistItem(viewingTask, idx)}
                      style={{ 
                        display: 'flex', alignItems: 'flex-start', gap: '10px', 
                        padding: '8px 0', borderBottom: idx < viewingTask.checklistItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ marginTop: '2px', color: item.isCompleted ? '#10b981' : '#cbd5e1' }}>
                        {item.isCompleted ? <CheckSquareIcon size={16} /> : <div style={{ width: '14px', height: '14px', border: '1.5px solid #cbd5e1', borderRadius: '3px' }}></div>}
                      </div>
                      <div style={{ 
                        fontSize: '13.5px', 
                        color: item.isCompleted ? '#94a3b8' : '#334155',
                        textDecoration: item.isCompleted ? 'line-through' : 'none',
                        lineHeight: 1.4,
                        userSelect: 'none'
                      }}>
                        {item.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-footer" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="crm-btn crm-btn-secondary"
                onClick={() => setViewingTask(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div
            className="modal-content task-modal-compact"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '520px' }}
          >
            <div className="modal-header">
              <h3 className="modal-title">Bulk Add Task</h3>
              <button
                className="modal-close"
                title="Close"
                onClick={() => setShowBulkModal(false)}
              >
                <XIcon size={20} />
              </button>
            </div>

            {message && (
              <div className="error-message" style={{ margin: '0 20px 15px', padding: '10px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', fontSize: '13px' }}>
                {message}
              </div>
            )}

            <form onSubmit={handleBulkSubmit}>
              <div style={{ marginBottom: '10px' }}>
                <FormInput
                  label="Task Title"
                  placeholder="Enter task title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Description (Optional) */}
              <div style={{ marginBottom: '10px' }}>
                <label className="compact-field-label">Description (Optional)</label>
                <textarea
                  className="modal-textarea-input"
                  rows="2"
                  placeholder="Enter task details..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div className="task-modal-grid">
                <div>
                  <label className="compact-field-label">Assign To</label>
                  <CustomSelect
                    value={assignedTo}
                    onChange={setAssignedTo}
                    options={bulkAssigneeOptions}
                    placeholder="Select Assignee"
                    searchable={true}
                  />
                </div>

                <div>
                  <label className="compact-field-label">Priority</label>
                  <CustomSelect
                    value={priority}
                    onChange={setPriority}
                    options={[
                      { value: 'Low', label: 'Low' },
                      { value: 'Medium', label: 'Medium' },
                      { value: 'High', label: 'High' }
                    ]}
                  />
                </div>
              </div>

              {/* Date Range Selection */}
              <div style={{ marginTop: '10px' }}>
                <label className="compact-field-label">Date Range (Click twice on same date for a single day)</label>
                <DateRangePicker
                  startDate={bulkStartDate}
                  endDate={bulkEndDate}
                  onChange={({ start, end }) => {
                    setBulkStartDate(start);
                    setBulkEndDate(end);
                  }}
                  openUp={true}
                />
              </div>

              {/* Category & Checklist */}
              <div className="task-modal-grid" style={{ marginTop: '10px' }}>
                <div>
                  <label className="compact-field-label">Category</label>
                  <CustomSelect
                    value={category}
                    onChange={setCategory}
                    options={[
                      ...DEFAULT_CATEGORIES.map(c => ({ value: c, label: c })),
                      { value: 'Checklist', label: 'Checklist' },
                      { value: 'Custom', label: 'Custom...' }
                    ]}
                  />
                  {category === 'Custom' && (
                    <div style={{ marginTop: '8px' }}>
                      <FormInput
                        placeholder="Enter custom category"
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>

                {category === 'Checklist' && (
                  <div>
                    <label className="compact-field-label">Checklist Template</label>
                    <CustomSelect
                      value={selectedChecklist}
                      onChange={setSelectedChecklist}
                      options={[
                        { value: '', label: 'Select Template' },
                        ...checklistTemplates.map(t => ({
                          value: t._id,
                          label: t.name
                        }))
                      ]}
                      searchable={true}
                      placeholder="Select Template"
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="crm-btn crm-btn-secondary"
                  onClick={() => setShowBulkModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="crm-btn crm-btn-primary"
                >
                  Create Bulk Tasks
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-content task-modal-compact"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '520px' }}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {isEditMode ? 'Edit Task' : addButtonLabel}
              </h3>
              <button
                className="modal-close"
                title="Close"
                aria-label="Close"
                onClick={() => setShowModal(false)}
              >
                <XIcon size={16} />
              </button>
            </div>

            {message && (
              <div
                style={{
                  marginBottom: '14px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: message.includes('success') ? '#f0fdf4' : '#fef2f2',
                  color: message.includes('success') ? '#166534' : '#991b1b',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: `1px solid ${message.includes('success') ? '#bbf7d0' : '#fecaca'}`
                }}
              >
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '10px' }}>
                <FormInput
                  label="Task Title"
                  placeholder="Enter task title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Description (Optional) */}
              <div style={{ marginBottom: '10px' }}>
                <label className="compact-field-label">Description (Optional)</label>
                <textarea
                  className="modal-textarea-input"
                  rows="2"
                  placeholder="Enter task details..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Row 2: Category & Priority with CustomSelect */}
              <div className="form-two-col-grid" style={{ marginBottom: '10px' }}>
                <div>
                  <label className="compact-field-label">Category</label>
                  <CustomSelect
                    value={category}
                    onChange={setCategory}
                    options={categorySelectOptions}
                    placeholder="Select Category"
                  />
                </div>

                <div>
                  <label className="compact-field-label">Priority</label>
                  <CustomSelect
                    value={priority}
                    onChange={setPriority}
                    options={prioritySelectOptions}
                    placeholder="Select Priority"
                  />
                </div>
              </div>

              {category === 'Other' && (
                <div style={{ marginBottom: '10px' }}>
                  <label className="compact-field-label">Custom Category Name</label>
                  <input
                    type="text"
                    className="modal-text-input"
                    placeholder="Enter custom category name"
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {/* Row 3: Assign To & Due Date */}
              <div className="form-two-col-grid" style={{ marginBottom: '10px' }}>
                <div>
                  <label className="compact-field-label">
                    {activeTab === 'team'
                      ? 'Assign To Team'
                      : activeTab === 'admin'
                      ? 'Assign To Admin'
                      : activeTab === 'superadmin'
                      ? 'Assign To Superadmin'
                      : 'Assign To'}
                  </label>

                  {activeTab === 'my' && !isEditMode ? (
                    <div className="self-assign-badge">
                      {currentUser.name || 'Myself'} (Myself)
                    </div>
                  ) : (
                    <>
                      <CustomSelect
                        value={assignedTo}
                        onChange={setAssignedTo}
                        options={modalAssigneeOptions}
                        placeholder="Select Assignee"
                      />
                      {assignedTo === 'ALL_TEAM' && (
                        <span style={{ fontSize: '11.5px', color: '#0284c7', marginTop: '4px', display: 'block', fontWeight: 500 }}>
                          ✓ Sabhi team members ko individual task assign hoga
                        </span>
                      )}
                      {assignedTo === 'ALL_ADMIN' && (
                        <span style={{ fontSize: '11.5px', color: '#0284c7', marginTop: '4px', display: 'block', fontWeight: 500 }}>
                          ✓ Sabhi admins ko individual task assign hoga
                        </span>
                      )}
                      {assignedTo && assignedTo !== 'ALL_TEAM' && assignedTo !== 'ALL_ADMIN' && (activeTab === 'team' || activeTab === 'admin') && (
                        <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                          ✓ Sirf selected member ko task assign hoga
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <label className="compact-field-label">Due Date</label>
                  {editingTaskData?.isBulkTask ? (
                      <DateRangePicker
                        startDate={bulkEditStartDate}
                        endDate={bulkEditEndDate}
                        onChange={({ start, end }) => {
                          setBulkEditStartDate(start);
                          setBulkEditEndDate(end);
                        }}
                        openUp={true}
                      />
                    ) : (
                      <CalendarPicker
                        selectedDate={dueDate}
                        onChange={d => setDueDate(d)}
                        placeholder="Select Due Date"
                        allowClear={false}
                        openUp={true}
                        disablePastDates={true}
                        className="w-100"
                      />
                    )}
                </div>
              </div>

              
              {/* Row: Checklist Template */}
              <div style={{ marginBottom: '10px' }}>
                <label className="compact-field-label">Checklist Template (Optional)</label>
                <CustomSelect
                  value={selectedChecklist}
                  onChange={setSelectedChecklist}
                  options={[
                    { value: '', label: 'No Checklist' },
                    ...checklistTemplates.map(t => ({ value: t._id, label: t.title }))
                  ]}
                  disabled={isEditMode}
                />
                {isEditMode && <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Checklist cannot be changed once task is created.</p>}
              </div>
              
              {/* Status if edit mode */}
              {isEditMode && (
                <div style={{ marginBottom: '14px' }}>
                  <label className="compact-field-label">Status</label>
                  <CustomSelect
                    value={status}
                    onChange={setstatus}
                    options={modalstatusOptions}
                    placeholder="Select Status"
                  />
                </div>
              )}

              <div className="modal-footer" style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="crm-btn crm-btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="crm-btn crm-btn-primary"
                >
                  {isEditMode ? 'Update Task' : 'Submit Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;

























