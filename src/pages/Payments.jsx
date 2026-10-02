import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import moment from 'moment';
import Pagination from '../components/Pagination';
import CustomSelect from '../components/CustomSelect';
import { 
  CalendarIcon, 
  DownloadIcon, 
  InfoIcon, 
  EditIcon, 
  TrashIcon, 
  WalletIcon, 
  CreditCardIcon, 
  PlusIcon,
  SearchIcon 
} from '../components/Icons';
import '../App.css';
import './Payments.css';

const MONTH_LIST = [
  { val: 'All', label: 'All Months' },
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

const parseItemDate = (item) => {
  if (!item) return null;
  const raw = item.date || item.createdAt;
  if (!raw) return null;
  const str = String(raw).replace(/Sept/i, 'Sep').trim();
  const m = moment(str, [
    'D MMM YYYY',
    'DD MMM YYYY',
    'D MMMM YYYY',
    'DD MMMM YYYY',
    'YYYY-MM-DD',
    'DD/MM/YYYY',
    'D/M/YYYY',
    'DD-MM-YYYY',
    moment.ISO_8601
  ]);
  if (m.isValid()) return m;
  if (item.createdAt) {
    const mc = moment(item.createdAt);
    if (mc.isValid()) return mc;
  }
  return null;
};

const Payments = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(localStorage.getItem('paymentsActiveTab') || 'Sales Book');
  const [showNewSaleModal, setShowNewSaleModal] = useState(location.state?.openNewSale || false);

  const currentYearStr = new Date().getFullYear().toString();
  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, '0');

  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const [yearlyAnalyticsYear, setYearlyAnalyticsYear] = useState(currentYearStr);

  useEffect(() => {
    if (location.state?.openNewSale) {
      setShowNewSaleModal(true);
      if (location.state.patientName) setSalePatientName(location.state.patientName);
      if (location.state.patientMobile) setSaleMobile(location.state.patientMobile);
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  
  const [saleClientType, setSaleClientType] = useState('registered');
  const [searchCollection, setSearchCollection] = useState('');
  
  // Expenses State
  const [expenses, setExpenses] = useState([]);
  const [searchExpense, setSearchExpense] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalData, setInfoModalData] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseParty, setExpenseParty] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Operational');
  const [expenseAccount, setExpenseAccount] = useState('Cash');
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  // For Editing Collections
  const [showEditCollectionModal, setShowEditCollectionModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);

  useEffect(() => {
    localStorage.setItem('paymentsActiveTab', activeTab);
  }, [activeTab]);

  // API Data
  const [patientsList, setPatientsList] = useState([]);
  const [servicesList, setServicesList] = useState([]);

  // Form states
  const [saleMobile, setSaleMobile] = useState('');
  const [salePatientName, setSalePatientName] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [allPackages, setAllPackages] = useState([]);
  const [allMedicines, setAllMedicines] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [medicineDuration, setMedicineDuration] = useState(1);
  const [includeConsultationFee, setIncludeConsultationFee] = useState(true);
  const [consultationFeeAmount, setConsultationFeeAmount] = useState(0);
  const [saleNotes, setSaleNotes] = useState('');
  
  // Invoices & Collections State
  const [invoices, setInvoices] = useState([]);
  const [collections, setCollections] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectLoss, setCollectLoss] = useState('');
  const [collectAccount, setCollectAccount] = useState('Company Bank');
  
  // Custom Dropdown State
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [searchService, setSearchService] = useState('');
  const [showPackageDropdown, setShowPackageDropdown] = useState(false);
  const [searchPackage, setSearchPackage] = useState('');
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);
  const [searchMedicine, setSearchMedicine] = useState('');
  const dropdownRef = useRef(null);
  const serviceDropdownRef = useRef(null);
  const packageDropdownRef = useRef(null);
  const medicineDropdownRef = useRef(null);

  // Fetch real data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        // Fetch patients
        const patientsRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/patients`, config);
        // Map to standard format for our UI
        const loadedPatients = (patientsRes.data || []).map(p => ({
          id: p._id,
          mobile: p.mobileNumber || '',
          name: p.fullName || ''
        }));
        setPatientsList(loadedPatients);

        // Fetch services & packages
        const servicesRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/services`, config);
        const packagesRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/packages`, config);
        
        const loadedServices = (servicesRes.data || []).map(s => ({ id: s._id, name: s.name || '', price: s.price || 0 }));
        setServicesList(loadedServices);
        
        const loadedPackages = (packagesRes.data || []).map(p => ({ id: p._id, name: p.name || '', price: p.totalPrice || 0 }));
        setAllPackages(loadedPackages);
        
        const medsRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/medicines`, config);
        const loadedMedicines = (medsRes.data || []).map(m => ({ id: m._id, name: m.name || '', price: m.price || 0 }));
        setAllMedicines(loadedMedicines);
        
        const settingsRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/settings`, config);
        setConsultationFeeAmount(settingsRes.data?.consultationFee || 0);

        // Fetch Invoices
        const invoicesRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/invoices`, config);
        const mappedInvoices = (invoicesRes.data || []).map(inv => ({
          id: inv._id,
          date: inv.date,
          client: inv.client,
          work: inv.work,
          total: inv.total,
          balance: inv.balance,
          loss: inv.loss || 0,
          status: inv.status,
          createdAt: inv.createdAt
        }));
        setInvoices(mappedInvoices);

        // Fetch Collections
        const collectionsRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/collections`, config);
        setCollections(collectionsRes.data || []);

        // Fetch Expenses
        const expensesRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/expenses`, config);
        setExpenses(expensesRes.data || []);

      } catch (err) {
        console.error("Error fetching data for payments:", err);
      }
    };
    fetchData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMobileDropdown(false);
      }
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target)) {
        setShowServiceDropdown(false);
      }
      if (packageDropdownRef.current && !packageDropdownRef.current.contains(event.target)) {
        setShowPackageDropdown(false);
      }
      if (medicineDropdownRef.current && !medicineDropdownRef.current.contains(event.target)) {
        setShowMedicineDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMobileChange = (e) => {
    const val = e.target.value;
    setSaleMobile(val);
    setShowMobileDropdown(true);
    
    // Auto populate if exact match found
    const found = patientsList.find(p => p.mobile === val);
    if (found) {
      setSalePatientName(found.name);
    } else {
      setSalePatientName('');
    }
  };

  const handleSelectPatient = (patient) => {
    setSaleMobile(patient.mobile);
    setSalePatientName(patient.name);
    setShowMobileDropdown(false);
  };

  const toggleService = (srv) => {
    setSelectedServices(prev => {
      if (prev.find(s => s.id === srv.id)) return prev.filter(s => s.id !== srv.id);
      return [...prev, srv];
    });
  };

  const togglePackage = (pkg) => {
    setSelectedPackages(prev => {
      if (prev.find(p => p.id === pkg.id)) return prev.filter(p => p.id !== pkg.id);
      return [...prev, pkg];
    });
  };

  const toggleMedicine = (med) => {
    setSelectedMedicines(prev => {
        if (prev.find(m => m.id === med.id)) return prev.filter(m => m.id !== med.id);
        return [...prev, { ...med, dosage: med.defaultDosage || '' }];
    });
  };
const [saleTotalAmount, setSaleTotalAmount] = useState(0);

  useEffect(() => {
    const sum = selectedServices.reduce((acc, srv) => acc + srv.price, 0) + selectedPackages.reduce((acc, p) => acc + p.price, 0) + selectedMedicines.reduce((acc, m) => acc + (m.price || 0), 0);
    setSaleTotalAmount(sum);
  }, [selectedServices, selectedPackages, selectedMedicines, includeConsultationFee, consultationFeeAmount]);

  const R = "\u20B9";

  const handleCreateEntry = async () => {
    if (!salePatientName) {
      alert("Please select a patient.");
      return;
    }
    if (selectedServices.length === 0 && Number(saleTotalAmount) === 0) {
      alert("Please select a service or enter an amount.");
      return;
    }
    
    const finalAmount = Number(saleTotalAmount) || 0;

    
    const workItems = [];
      if (includeConsultationFee) workItems.push(`Consultation (₹${consultationFeeAmount})`);
      if (selectedServices.length > 0) workItems.push(...selectedServices.map(s => `${s.name} (₹${s.price})`));
      if (selectedPackages.length > 0) workItems.push(...selectedPackages.map(p => `${p.name} (₹${p.price})`));
      if (selectedMedicines.length > 0) workItems.push(...selectedMedicines.map(m => `${m.name} (${medicineDuration} days${m.dosage ? ', ' + m.dosage : ''} - ₹${m.price || 0})`));
      const workStr = workItems.length > 0 ? workItems.join(', ') : 'Manual Entry';

    const newInvoice = {
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      client: salePatientName,
      mobile: saleMobile,
      work: workStr,
      total: finalAmount,
      balance: finalAmount,
      status: 'Pending',
      notes: saleNotes
    };
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/invoices`, newInvoice, { headers: { Authorization: `Bearer ${token}` } });
      const created = res.data;
      setInvoices([{
        id: created._id,
        date: created.date,
        client: created.client,
        work: created.work,
        total: created.total,
        balance: created.balance,
        loss: created.loss || 0,
        status: created.status
      }, ...invoices]);
      
      // Reset form
      setSaleMobile('');
      setSalePatientName('');
      setSelectedServices([]);
      setSelectedPackages([]);
      setSelectedMedicines([]);
      setMedicineDuration(1);
      setIncludeConsultationFee(true);
      setSaleNotes('');
      setSaleTotalAmount(0);
      setShowNewSaleModal(false);
    } catch (err) {
      alert("Error creating entry");
    }
  };

  const filteredServices = servicesList.filter(s => (s.name || '').toLowerCase().includes((searchService || '').toLowerCase()));
  const filteredPackages = allPackages.filter(p => (p.name || '').toLowerCase().includes((searchPackage || '').toLowerCase()));
  const filteredMedicines = allMedicines.filter(m => (m.name || '').toLowerCase().includes((searchMedicine || '').toLowerCase()));
  const filteredPatients = patientsList.filter(p => (p.mobile || '').includes(saleMobile || '') || (p.name || '').toLowerCase().includes((saleMobile || '').toLowerCase()));

  // Generate dynamic Year options
  const YEAR_OPTIONS = React.useMemo(() => {
    const currentYearNum = new Date().getFullYear();
    const yearsSet = new Set();
    yearsSet.add(currentYearNum.toString());

    [...invoices, ...collections, ...expenses].forEach(item => {
      const m = parseItemDate(item);
      if (m && m.isValid()) {
        yearsSet.add(m.format('YYYY'));
      }
    });

    for (let y = currentYearNum - 2; y <= currentYearNum + 2; y++) {
      yearsSet.add(y.toString());
    }

    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [invoices, collections, expenses]);

  // Filter items by selectedMonth and selectedYear
  const isItemInPeriod = (item) => {
    const m = parseItemDate(item);
    if (!m) return true;
    if (selectedYear && selectedYear !== 'All' && m.format('YYYY') !== selectedYear) {
      return false;
    }
    if (selectedMonth && selectedMonth !== 'All' && m.format('MM') !== selectedMonth) {
      return false;
    }
    return true;
  };

  const filteredInvoices = invoices.filter(isItemInPeriod);
  const filteredCollections = collections.filter(isItemInPeriod);
  const filteredExpenses = expenses.filter(isItemInPeriod);

  const [salesPage, setSalesPage] = useState(1);
  const salesPerPage = 10;
  const [collectionsPage, setCollectionsPage] = useState(1);
  const collectionsPerPage = 10;
  const [expensesPage, setExpensesPage] = useState(1);
  const expensesPerPage = 10;

  useEffect(() => {
    setSalesPage(1);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    setCollectionsPage(1);
  }, [selectedYear, selectedMonth, searchCollection]);

  useEffect(() => {
    setExpensesPage(1);
  }, [selectedYear, selectedMonth, searchExpense]);

  const currentInvoices = filteredInvoices.slice((salesPage - 1) * salesPerPage, salesPage * salesPerPage);

  const displayedCollections = React.useMemo(() => {
    return filteredCollections.filter(c => (c.party || '').toLowerCase().includes(searchCollection.toLowerCase()));
  }, [filteredCollections, searchCollection]);
  const currentCollections = displayedCollections.slice((collectionsPage - 1) * collectionsPerPage, collectionsPage * collectionsPerPage);

  const displayedExpenses = React.useMemo(() => {
    return filteredExpenses.filter(e => (e.party || '').toLowerCase().includes(searchExpense.toLowerCase()));
  }, [filteredExpenses, searchExpense]);
  const currentExpenses = displayedExpenses.slice((expensesPage - 1) * expensesPerPage, expensesPage * expensesPerPage);

  const selectedMonthObj = MONTH_LIST.find(m => m.val === selectedMonth);
  const selectedPeriodLabel = selectedMonth === 'All'
    ? (selectedYear === 'All' ? 'All Time' : `Year ${selectedYear}`)
    : `${selectedMonthObj ? selectedMonthObj.label : ''} ${selectedYear === 'All' ? '' : selectedYear}`.trim();

  // Dynamic card totals based on filtered invoices
  const totalSales = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalCollection = filteredInvoices.reduce((sum, inv) => sum + (inv.total - inv.balance - (inv.loss || 0)), 0);
  const totalOutstanding = filteredInvoices.reduce((sum, inv) => sum + inv.balance, 0);
  const totalLoss = filteredInvoices.reduce((sum, inv) => sum + (inv.loss || 0), 0);

  // Collections Tab Totals (filtered by period)
  const totalNetCollection = filteredCollections.reduce((sum, c) => sum + c.amount, 0);
  const companyCollection = filteredCollections.filter(c => c.account === 'Company Bank').reduce((sum, c) => sum + c.amount, 0);
  const personalCollection = filteredCollections.filter(c => c.account === 'Personal Bank').reduce((sum, c) => sum + c.amount, 0);
  const cashCollection = filteredCollections.filter(c => c.account === 'Cash').reduce((sum, c) => sum + c.amount, 0);

  // Expenses Tab Totals (filtered by period)
  const totalOutflow = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const operationalExpense = filteredExpenses.filter(e => e.category === 'Operational').reduce((sum, e) => sum + e.amount, 0);
  const salaryExpense = filteredExpenses.filter(e => e.category === 'Salary / Payout').reduce((sum, e) => sum + e.amount, 0);
  const purchaseExpense = filteredExpenses.filter(e => e.category === 'Purchase').reduce((sum, e) => sum + e.amount, 0);

  // Available Balances for this period
  const companyAvailable = companyCollection - filteredExpenses.filter(e => e.account === 'Company Bank').reduce((sum, e) => sum + e.amount, 0);
  const personalAvailable = personalCollection - filteredExpenses.filter(e => e.account === 'Personal Bank').reduce((sum, e) => sum + e.amount, 0);
  const cashAvailable = cashCollection - filteredExpenses.filter(e => e.account === 'Cash').reduce((sum, e) => sum + e.amount, 0);

  // All-time available balances for validation when creating an expense
  const allTimeCompanyAvailable = collections.filter(c => c.account === 'Company Bank').reduce((sum, c) => sum + c.amount, 0) - expenses.filter(e => e.account === 'Company Bank').reduce((sum, e) => sum + e.amount, 0);
  const allTimePersonalAvailable = collections.filter(c => c.account === 'Personal Bank').reduce((sum, c) => sum + c.amount, 0) - expenses.filter(e => e.account === 'Personal Bank').reduce((sum, e) => sum + e.amount, 0);
  const allTimeCashAvailable = collections.filter(c => c.account === 'Cash').reduce((sum, c) => sum + c.amount, 0) - expenses.filter(e => e.account === 'Cash').reduce((sum, e) => sum + e.amount, 0);

  // Yearly Analytics computation
  const yearlyStats = React.useMemo(() => {
    const targetYear = yearlyAnalyticsYear || selectedYear || currentYearStr;
    const monthsData = Array.from({ length: 12 }, (_, i) => {
      const mNum = String(i + 1).padStart(2, '0');
      const mLabel = moment(`${targetYear}-${mNum}-01`).format('MMMM');

      const mInvoices = invoices.filter(item => {
        const m = parseItemDate(item);
        return m && m.format('YYYY') === targetYear && m.format('MM') === mNum;
      });
      const mCollections = collections.filter(item => {
        const m = parseItemDate(item);
        return m && m.format('YYYY') === targetYear && m.format('MM') === mNum;
      });
      const mExpenses = expenses.filter(item => {
        const m = parseItemDate(item);
        return m && m.format('YYYY') === targetYear && m.format('MM') === mNum;
      });

      const sales = mInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const collected = mCollections.reduce((sum, col) => sum + col.amount, 0);
      const exp = mExpenses.reduce((sum, e) => sum + e.amount, 0);
      const net = collected - exp;

      return {
        monthNum: mNum,
        monthName: mLabel,
        sales,
        collected,
        expenses: exp,
        net
      };
    });

    const totalSalesYear = monthsData.reduce((s, m) => s + m.sales, 0);
    const totalCollectedYear = monthsData.reduce((s, m) => s + m.collected, 0);
    const totalExpensesYear = monthsData.reduce((s, m) => s + m.expenses, 0);
    const totalNetYear = totalCollectedYear - totalExpensesYear;

    return {
      targetYear,
      monthsData,
      totalSalesYear,
      totalCollectedYear,
      totalExpensesYear,
      totalNetYear
    };
  }, [yearlyAnalyticsYear, selectedYear, invoices, collections, expenses]);

  const handleDeleteCollection = async (id) => {
    if (!window.confirm("Are you sure you want to delete this collection entry? This will reverse the payment.")) return;
    try {
      const token = localStorage.getItem('token');
      // Wait, deleting a collection should ideally restore the invoice balance!
      // For simplicity, we just delete the collection record here as an admin override.
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/collections/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setCollections(collections.filter(i => i._id !== id));
    } catch (err) {
      alert("Error deleting collection");
    }
  };

  const openEditCollection = (col) => {
    setEditingCollection(col);
    setShowEditCollectionModal(true);
  };

  const handleEditCollectionSubmit = async (e) => {
    e.preventDefault();
    if (!editingCollection) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/collections/${editingCollection._id}`, {
        party: editingCollection.party,
        amount: editingCollection.amount,
        account: editingCollection.account
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setCollections(collections.map(c => c._id === editingCollection._id ? { ...c, ...res.data } : c));
      setShowEditCollectionModal(false);
      setEditingCollection(null);
    } catch (err) {
      alert("Error updating collection");
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    const amt = Number(expenseAmount);
    if (!expenseParty || amt <= 0) return;

    let available = 0;
    if (expenseAccount === 'Cash') available = allTimeCashAvailable;
    else if (expenseAccount === 'Company Bank') available = allTimeCompanyAvailable;
    else if (expenseAccount === 'Personal Bank') available = allTimePersonalAvailable;

    // If editing, add back the old amount to available balance to avoid false insufficient error
    if (editingExpenseId) {
       const oldExp = expenses.find(x => x._id === editingExpenseId);
       if (oldExp && oldExp.account === expenseAccount) {
           available += oldExp.amount;
       }
    }

    if (amt > available) {
      alert(`Insufficient balance in ${expenseAccount}! You only have ₹${available} available.`);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        party: expenseParty,
        amount: amt,
        category: expenseCategory,
        account: expenseAccount
      };

      if (editingExpenseId) {
        const res = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/expenses/${editingExpenseId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        setExpenses(expenses.map(exp => exp._id === editingExpenseId ? { ...exp, ...res.data } : exp));
      } else {
        payload.date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/expenses`, payload, { headers: { Authorization: `Bearer ${token}` } });
        setExpenses([res.data, ...expenses]);
      }
      
      setShowExpenseModal(false);
      setEditingExpenseId(null);
      setExpenseParty('');
      setExpenseAmount('');
    } catch (err) {
      alert("Error saving expense");
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/expenses/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setExpenses(expenses.filter(i => i._id !== id));
    } catch (err) {
      alert("Error deleting expense");
    }
  };

  const openEditExpense = (exp) => {
    setEditingExpenseId(exp._id);
    setExpenseParty(exp.party);
    setExpenseAmount(exp.amount);
    setExpenseCategory(exp.category);
    setExpenseAccount(exp.account);
    setShowExpenseModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedInvoice) return;
    const amount = Number(collectAmount) || 0;
    const loss = Number(collectLoss) || 0;
    
    const newBalance = selectedInvoice.balance - amount - loss;
    const finalBalance = newBalance < 0 ? 0 : newBalance;
    const finalLoss = (selectedInvoice.loss || 0) + loss;
    const finalStatus = finalBalance <= 0 ? 'Cleared' : 'Pending';

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/invoices/${selectedInvoice.id}`, {
        balance: finalBalance,
        loss: finalLoss,
        status: finalStatus
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setInvoices(invoices.map(inv => {
        if (inv.id === selectedInvoice.id) {
          return { ...inv, balance: finalBalance, loss: finalLoss, status: finalStatus };
        }
        return inv;
      }));

      if (amount > 0) {
        const newCol = {
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          party: selectedInvoice.client,
          amount: amount,
          category: 'Sale',
          account: collectAccount,
          invoiceId: selectedInvoice.id
        };
        const colRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/collections`, newCol, { headers: { Authorization: `Bearer ${token}` } });
        setCollections([colRes.data, ...collections]);
      }
      
      setShowCollectModal(false);
      setSelectedInvoice(null);
      setCollectAmount('');
      setCollectLoss('');
      setCollectAccount('Company Bank');
    } catch (err) {
      alert("Error updating payment");
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/invoices/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setInvoices(invoices.filter(i => i.id !== id));
    } catch (err) {
      alert("Error deleting invoice");
    }
  };

  const getPeriodReportInfo = () => {
    const currentYearNum = new Date().getFullYear();
    const y = selectedYear && selectedYear !== 'All' ? selectedYear : currentYearNum.toString();
    if (selectedMonth && selectedMonth !== 'All') {
      const startM = moment(`${y}-${selectedMonth}-01`, 'YYYY-MM-DD');
      const endM = startM.clone().endOf('month');
      return {
        dateRangeLabel: `(1 ${startM.format('MMMM YYYY')} - ${endM.format('D MMMM YYYY')})`,
        openingDateLabel: `1\n${startM.format('MMMM')}`,
        startMoment: startM.clone().startOf('month'),
        endMoment: endM
      };
    } else {
      return {
        dateRangeLabel: `(1 January ${y} - 31 December ${y})`,
        openingDateLabel: `1\nJanuary`,
        startMoment: moment(`${y}-01-01`, 'YYYY-MM-DD').startOf('year'),
        endMoment: moment(`${y}-12-31`, 'YYYY-MM-DD').endOf('year')
      };
    }
  };

  const formatShortDate = (rawDate) => {
    if (!rawDate) return '-';
    const m = moment(String(rawDate).replace(/Sept/i, 'Sep').trim(), [
      'D MMM YYYY', 'DD MMM YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'D/M/YYYY', moment.ISO_8601
    ]);
    return m.isValid() ? m.format('DD\nMMM') : String(rawDate);
  };

  const formatFullDate = (rawDate) => {
    if (!rawDate) return '-';
    const m = moment(String(rawDate).replace(/Sept/i, 'Sep').trim(), [
      'D MMM YYYY', 'DD MMM YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'D/M/YYYY', moment.ISO_8601
    ]);
    return m.isValid() ? m.format('DD MMM YYYY') : String(rawDate);
  };

  // 1. Sales Report PDF (Matching User Template 1)
  const handleDownloadSalesReport = () => {
    const doc = new jsPDF();
    const { dateRangeLabel } = getPeriodReportInfo();

    // Title & Period
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("Satguru Clinic Sales Report", 105, 18, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(dateRangeLabel, 105, 25, { align: 'center' });

    // Top Summary Boxes (4 Columns)
    autoTable(doc, {
      startY: 32,
      head: [['Total Sales', 'Total Collected', 'Total Pending', 'Total Loss']],
      body: [[
        `Rs. ${totalSales.toLocaleString()}`,
        `Rs. ${totalCollection.toLocaleString()}`,
        `Rs. ${totalOutstanding.toLocaleString()}`,
        `Rs. ${totalLoss.toLocaleString()}`
      ]],
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [100, 116, 139],
        halign: 'center',
        fontSize: 9,
        fontStyle: 'normal',
        lineWidth: 0.1,
        lineColor: [226, 232, 240]
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        halign: 'center',
        fontSize: 11,
        fontStyle: 'bold',
        lineWidth: 0.1,
        lineColor: [226, 232, 240]
      },
      columnStyles: {
        0: { textColor: [15, 23, 42] },
        1: { textColor: [16, 185, 129] },
        2: { textColor: [239, 68, 68] },
        3: { textColor: [15, 23, 42] }
      }
    });

    // Invoices Table
    const tableStartY = doc.lastAutoTable.finalY + 8;
    const tableRows = filteredInvoices.map((inv, idx) => {
      const colAmt = inv.total - inv.balance - (inv.loss || 0);
      const lossAmt = inv.loss || 0;
      const statusText = inv.status === 'Cleared' ? 'Paid' : (inv.balance < inv.total ? 'Partial' : 'Pending');

      return [
        String(idx + 1),
        formatShortDate(inv.date),
        inv.client || '-',
        inv.work || '-',
        inv.total.toLocaleString(),
        { content: colAmt.toLocaleString(), styles: { fillColor: [240, 253, 244], textColor: [22, 101, 52] } },
        { content: inv.balance.toLocaleString(), styles: { fillColor: [254, 242, 242], textColor: [185, 28, 28] } },
        { content: lossAmt.toLocaleString(), styles: { fillColor: [254, 252, 232], textColor: [161, 98, 7] } },
        statusText
      ];
    });

    // Grand Total Row
    tableRows.push([
      { content: '', styles: { lineWidth: 0.1 } },
      { content: '', styles: { lineWidth: 0.1 } },
      { content: '', styles: { lineWidth: 0.1 } },
      { content: 'Grand Total', styles: { fontStyle: 'bold', halign: 'right', lineWidth: 0.1 } },
      { content: totalSales.toLocaleString(), styles: { fontStyle: 'bold', halign: 'center', lineWidth: 0.1 } },
      { content: totalCollection.toLocaleString(), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 253, 244], textColor: [22, 101, 52], lineWidth: 0.1 } },
      { content: totalOutstanding.toLocaleString(), styles: { fontStyle: 'bold', halign: 'center', fillColor: [254, 242, 242], textColor: [185, 28, 28], lineWidth: 0.1 } },
      { content: totalLoss.toLocaleString(), styles: { fontStyle: 'bold', halign: 'center', fillColor: [254, 252, 232], textColor: [161, 98, 7], lineWidth: 0.1 } },
      { content: '', styles: { lineWidth: 0.1 } }
    ]);

    autoTable(doc, {
      startY: tableStartY,
      head: [['#', 'Sale\nDate', 'Client Name', 'Work /\nProject', 'Total\nSales', 'Collected\n(Rs.)', 'Pending\n(Rs.)', 'Loss\n(Rs.)', 'Status']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        lineWidth: 0.1,
        lineColor: [226, 232, 240]
      },
      bodyStyles: {
        fontSize: 8,
        halign: 'center',
        textColor: [15, 23, 42],
        lineWidth: 0.1,
        lineColor: [226, 232, 240]
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 16 },
        2: { halign: 'left', cellWidth: 32 },
        3: { halign: 'left', cellWidth: 28 },
        4: { halign: 'center', cellWidth: 22 },
        5: { halign: 'center', cellWidth: 22 },
        6: { halign: 'center', cellWidth: 22 },
        7: { halign: 'center', cellWidth: 16 },
        8: { cellWidth: 16 }
      }
    });

    const finalY = doc.lastAutoTable.finalY || 200;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Report Generated: ${moment().format('D MMM YYYY, h:mm a')}`, 14, Math.min(finalY + 10, 285));

    doc.save(`Satguru_Clinic_Sales_Report_${selectedPeriodLabel.replace(/ /g, '_')}.pdf`);
  };

  // 2. Profit Report PDF (Matching User Template 2)
  const handleDownloadProfitReport = () => {
    const doc = new jsPDF();
    const { dateRangeLabel } = getPeriodReportInfo();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("Satguru Clinic Profit Report", 105, 18, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(dateRangeLabel, 105, 25, { align: 'center' });

    const combinedTx = [
      ...filteredCollections.map(c => ({
        date: c.date,
        momentDate: parseItemDate(c),
        party: c.party || 'Client',
        purpose: c.category || 'Collection',
        credit: c.amount,
        debit: null
      })),
      ...filteredExpenses.map(e => ({
        date: e.date,
        momentDate: parseItemDate(e),
        party: e.party || 'Vendor',
        purpose: e.category || 'Operational',
        credit: null,
        debit: e.amount
      }))
    ].sort((a, b) => {
      if (a.momentDate && b.momentDate) return a.momentDate.diff(b.momentDate);
      return 0;
    });

    const rows = combinedTx.map(tx => [
      formatFullDate(tx.date),
      tx.party,
      tx.purpose,
      tx.credit 
        ? { content: tx.credit.toLocaleString(), styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244], textColor: [22, 101, 52] } }
        : { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
      tx.debit 
        ? { content: tx.debit.toLocaleString(), styles: { fontStyle: 'bold', halign: 'right', fillColor: [254, 242, 242], textColor: [185, 28, 28] } }
        : { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } }
    ]);

    if (combinedTx.length > 0) {
      rows.push([
        { content: 'Total', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.1 } },
        { content: totalNetCollection.toLocaleString(), styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244], textColor: [22, 101, 52], lineWidth: 0.1 } },
        { content: totalOutflow.toLocaleString(), styles: { fontStyle: 'bold', halign: 'right', fillColor: [254, 242, 242], textColor: [185, 28, 28], lineWidth: 0.1 } }
      ]);
    }

    autoTable(doc, {
      startY: 32,
      head: [['Date', 'Party', 'Purpose/Category', 'Credit (In)', 'Debit (Out)']],
      body: rows.length > 0 ? rows : [['-', '-', 'No records found for period', '-', '-']],
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
        lineWidth: 0.1,
        lineColor: [203, 213, 225]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [15, 23, 42],
        lineWidth: 0.1,
        lineColor: [226, 232, 240],
        cellPadding: { top: 3.5, bottom: 3.5, left: 3.5, right: 3.5 }
      },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 42 },
        2: { cellWidth: 46 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 35 }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Summary", 14, finalY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Collections (Credit): Rs. ${totalNetCollection.toLocaleString()}`, 14, finalY + 7);
    doc.text(`Total Expenses (Debit): Rs. ${totalOutflow.toLocaleString()}`, 14, finalY + 14);

    const netProfit = totalNetCollection - totalOutflow;
    doc.setFont("helvetica", "bold");
    if (netProfit >= 0) {
      doc.setTextColor(22, 101, 52);
      doc.text(`Net Profit: Rs. ${netProfit.toLocaleString()}`, 14, finalY + 23);
    } else {
      doc.setTextColor(220, 38, 38);
      doc.text(`Net Loss: Rs. ${Math.abs(netProfit).toLocaleString()}`, 14, finalY + 23);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Report Generated: ${moment().format('D MMM YYYY, h:mm a')}`, 14, Math.min(finalY + 36, 285));

    doc.save(`Satguru_Clinic_Profit_Report_${selectedPeriodLabel.replace(/ /g, '_')}.pdf`);
  };

  // 3. Expense Report PDF (Matching User Template 3)
  const handleDownloadExpenseReport = () => {
    const doc = new jsPDF();
    const { dateRangeLabel } = getPeriodReportInfo();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("Satguru Clinic Expense Report", 105, 18, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(dateRangeLabel, 105, 25, { align: 'center' });

    const personalExp = filteredExpenses.filter(e => e.account === 'Personal Bank').reduce((s, e) => s + e.amount, 0);
    const bankExp = filteredExpenses.filter(e => e.account === 'Company Bank').reduce((s, e) => s + e.amount, 0);
    const cashExp = filteredExpenses.filter(e => e.account === 'Cash').reduce((s, e) => s + e.amount, 0);

    const opExp = filteredExpenses.filter(e => e.category === 'Operational').reduce((s, e) => s + e.amount, 0);
    const salExp = filteredExpenses.filter(e => e.category === 'Salary / Payout').reduce((s, e) => s + e.amount, 0);
    const purExp = filteredExpenses.filter(e => e.category === 'Purchase').reduce((s, e) => s + e.amount, 0);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Expense Source Breakdown:", 14, 34);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Personal: Rs. ${personalExp.toLocaleString()}        Bank: Rs. ${bankExp.toLocaleString()}        Cash: Rs. ${cashExp.toLocaleString()}`, 14, 40);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Category Breakdown:", 14, 48);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Operational: Rs. ${opExp.toLocaleString()}        Salary: Rs. ${salExp.toLocaleString()}        Purchase: Rs. ${purExp.toLocaleString()}`, 14, 54);

    const rows = filteredExpenses.map((exp, idx) => [
      String(idx + 1),
      formatShortDate(exp.date).replace('\n', ' '),
      exp.party || '-',
      exp.category || '-',
      exp.description || 'Expense',
      exp.account || '-',
      { content: exp.amount.toLocaleString(), styles: { fillColor: [254, 242, 242], textColor: [185, 28, 28], halign: 'right', fontStyle: 'bold' } }
    ]);

    rows.push([
      { content: '', styles: { lineWidth: 0.1 } },
      { content: '', styles: { lineWidth: 0.1 } },
      { content: '', styles: { lineWidth: 0.1 } },
      { content: '', styles: { lineWidth: 0.1 } },
      { content: '', styles: { lineWidth: 0.1 } },
      { content: 'Grand Total', styles: { fontStyle: 'bold', halign: 'right', lineWidth: 0.1 } },
      { content: totalOutflow.toLocaleString(), styles: { fontStyle: 'bold', halign: 'right', fillColor: [254, 242, 242], textColor: [185, 28, 28], lineWidth: 0.1 } }
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['#', 'Date', 'Paid To', 'Category', 'Description', 'Paid From', 'Amount']],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left',
        lineWidth: 0.1,
        lineColor: [226, 232, 240]
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [15, 23, 42],
        lineWidth: 0.1,
        lineColor: [226, 232, 240]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 20 },
        2: { cellWidth: 36 },
        3: { cellWidth: 32 },
        4: { cellWidth: 34 },
        5: { cellWidth: 26 },
        6: { cellWidth: 25, halign: 'right' }
      }
    });

    const finalY = doc.lastAutoTable.finalY || 200;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Report Generated: ${moment().format('D MMM YYYY, h:mm a')}`, 14, Math.min(finalY + 10, 285));

    doc.save(`Satguru_Clinic_Expense_Report_${selectedPeriodLabel.replace(/ /g, '_')}.pdf`);
  };

  // 4. Collection Statement PDF (Matching User Template 4)
  const handleDownloadCollectionStatement = () => {
    const doc = new jsPDF();
    const { dateRangeLabel, openingDateLabel, startMoment } = getPeriodReportInfo();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("Satguru Clinic Collection Statement", 105, 18, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(dateRangeLabel, 105, 25, { align: 'center' });

    const beforeStart = (item) => {
      const m = parseItemDate(item);
      return m && m.isBefore(startMoment, 'day');
    };

    const opPersonal = collections.filter(beforeStart).filter(c => c.account === 'Personal Bank').reduce((s, c) => s + c.amount, 0)
                     - expenses.filter(beforeStart).filter(e => e.account === 'Personal Bank').reduce((s, e) => s + e.amount, 0);
    const opBank = collections.filter(beforeStart).filter(c => c.account === 'Company Bank').reduce((s, c) => s + c.amount, 0)
                 - expenses.filter(beforeStart).filter(e => e.account === 'Company Bank').reduce((s, e) => s + e.amount, 0);
    const opCash = collections.filter(beforeStart).filter(c => c.account === 'Cash').reduce((s, c) => s + c.amount, 0)
                 - expenses.filter(beforeStart).filter(e => e.account === 'Cash').reduce((s, e) => s + e.amount, 0);
    const opTotal = opPersonal + opBank + opCash;

    const currPersonal = opPersonal + personalAvailable;
    const currBank = opBank + companyAvailable;
    const currCash = opCash + cashAvailable;
    const currTotal = opTotal + totalNetCollection - totalOutflow;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("Opening Balance: ", 14, 33);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Personal: Rs. ${opPersonal.toLocaleString()}      Bank: Rs. ${opBank.toLocaleString()}      Cash: Rs. ${opCash.toLocaleString()}      Total: Rs. ${opTotal.toLocaleString()}`, 44, 33);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Current Balance: ", 14, 39);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Personal: Rs. ${currPersonal.toLocaleString()}      Bank: Rs. ${currBank.toLocaleString()}      Cash: Rs. ${currCash.toLocaleString()}      Total: Rs. ${currTotal.toLocaleString()}`, 44, 39);

    const netStatementBalance = currTotal;
    const netBalLabel = `Rs. ${Math.abs(netStatementBalance).toLocaleString()} ${netStatementBalance >= 0 ? 'Cr' : 'Dr'}`;

    autoTable(doc, {
      startY: 44,
      head: [['Opening Balance', 'Total Debit(-)', 'Total Credit(+)', 'Net Balance']],
      body: [[
        `Rs. ${opTotal.toLocaleString()}`,
        `Rs. ${totalOutflow.toLocaleString()}`,
        `Rs. ${totalNetCollection.toLocaleString()}`,
        netBalLabel
      ]],
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [100, 116, 139],
        halign: 'center',
        fontSize: 9,
        fontStyle: 'normal',
        lineWidth: 0.1,
        lineColor: [226, 232, 240]
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        halign: 'center',
        fontSize: 11,
        fontStyle: 'bold',
        lineWidth: 0.1,
        lineColor: [226, 232, 240]
      },
      columnStyles: {
        0: { textColor: [15, 23, 42] },
        1: { textColor: [15, 23, 42] },
        2: { textColor: [15, 23, 42] },
        3: { textColor: netStatementBalance >= 0 ? [16, 185, 129] : [220, 38, 38] }
      }
    });

    const combinedTx = [
      ...filteredCollections.map(c => ({
        date: c.date,
        momentDate: parseItemDate(c),
        details: c.party || c.category || 'Collection',
        type: c.account,
        credit: c.amount,
        debit: null
      })),
      ...filteredExpenses.map(e => ({
        date: e.date,
        momentDate: parseItemDate(e),
        details: e.party || e.category || 'Expense',
        type: e.account,
        credit: null,
        debit: e.amount
      }))
    ].sort((a, b) => {
      if (a.momentDate && b.momentDate) return a.momentDate.diff(b.momentDate);
      return 0;
    });

    const entriesY = doc.lastAutoTable.finalY + 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`No. of Entries: ${combinedTx.length} (All)`, 14, entriesY);

    let runningBal = opTotal;
    const statementRows = [];

    statementRows.push([
      `(${openingDateLabel.replace('\n', ' ')})`,
      '',
      '',
      '',
      '',
      `(Opening Balance: ${opTotal.toLocaleString()})`
    ]);

    combinedTx.forEach(tx => {
      if (tx.credit) runningBal += tx.credit;
      if (tx.debit) runningBal -= tx.debit;

      statementRows.push([
        formatShortDate(tx.date).replace('\n', ' '),
        tx.details,
        tx.type,
        tx.credit 
          ? { content: tx.credit.toLocaleString(), styles: { fillColor: [240, 253, 244], textColor: [22, 101, 52], halign: 'right', fontStyle: 'bold' } } 
          : { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        tx.debit 
          ? { content: tx.debit.toLocaleString(), styles: { fillColor: [254, 242, 242], textColor: [185, 28, 28], halign: 'right', fontStyle: 'bold' } } 
          : { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        `${Math.abs(runningBal).toLocaleString()} ${runningBal >= 0 ? 'Cr' : 'Dr'}`
      ]);
    });

    statementRows.push([
      { content: 'Grand\nTotal', styles: { fontStyle: 'bold', lineWidth: 0.1 } },
      { content: '', styles: { lineWidth: 0.1 } },
      { content: '', styles: { lineWidth: 0.1 } },
      { content: totalNetCollection.toLocaleString(), styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244], textColor: [22, 101, 52], lineWidth: 0.1 } },
      { content: totalOutflow.toLocaleString(), styles: { fontStyle: 'bold', halign: 'right', fillColor: [254, 242, 242], textColor: [185, 28, 28], lineWidth: 0.1 } },
      { content: `${Math.abs(runningBal).toLocaleString()} ${runningBal >= 0 ? 'Cr' : 'Dr'}`, styles: { fontStyle: 'bold', halign: 'right', textColor: runningBal >= 0 ? [22, 101, 52] : [220, 38, 38], lineWidth: 0.1 } }
    ]);

    autoTable(doc, {
      startY: entriesY + 3,
      head: [['Date', 'Details', 'Type', 'Credit(+)', 'Debit(-)', 'Balance']],
      body: statementRows,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8.5,
        lineWidth: 0.1,
        lineColor: [226, 232, 240]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [15, 23, 42],
        lineWidth: 0.1,
        lineColor: [226, 232, 240]
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 45 },
        2: { cellWidth: 32 },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 26, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' }
      }
    });

    const finalY = doc.lastAutoTable.finalY || 200;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Report Generated: ${moment().format('D MMM YYYY, h:mm a')}`, 14, Math.min(finalY + 10, 285));

    doc.save(`Satguru_Clinic_Collection_Statement_${selectedPeriodLabel.replace(/ /g, '_')}.pdf`);
  };

  // Master handler that dispatches based on active tab
  const handleDownloadReport = () => {
    if (activeTab === 'Sales Book') {
      handleDownloadSalesReport();
    } else if (activeTab === 'Collections') {
      handleDownloadCollectionStatement();
    } else if (activeTab === 'Expenses') {
      handleDownloadExpenseReport();
    }
  };


  const handleDownloadExpenseReceipt = (exp) => {
    const doc = new jsPDF();
    const primaryColor = [15, 23, 42]; 
    const secondaryColor = [100, 116, 139]; 

    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("SATGURU CLINIC", 14, 22);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("Professional Healthcare & Wellness", 14, 30);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("EXPENSE VOUCHER", 120, 26);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 45, 196, 45);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Paid To:", 14, 55);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Name/Party: ${exp.party || 'N/A'}`, 14, 62);
    doc.text(`Account: ${exp.account}`, 14, 68);

    doc.setFont("helvetica", "bold");
    doc.text("Voucher Details:", 130, 55);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${exp.date}`, 130, 62);
    doc.text(`Category: ${exp.category}`, 130, 68);
    doc.text(`Voucher No: ${exp._id ? exp._id.substring(exp._id.length - 6).toUpperCase() : 'NA'}`, 130, 74);

    autoTable(doc, {
      startY: 85,
      head: [['Expense Purpose / Details', 'Amount Paid']],
      body: [
        [exp.category, `Rs. ${exp.amount}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { textColor: 50, halign: 'center' },
      columnStyles: { 0: { halign: 'left' } },
      margin: { left: 14, right: 14 }
    });

    const finalY = doc.lastAutoTable.finalY || 100;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`Total Paid: Rs. ${exp.amount}`, 130, finalY + 15);

    doc.save(`Expense_${exp.party}_${exp.date.replace(/ /g, '_')}.pdf`);
  };

  const handleDownloadCollectionReceipt = (col) => {
    const doc = new jsPDF();
    const primaryColor = [15, 23, 42]; 
    const secondaryColor = [100, 116, 139]; 

    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("SATGURU CLINIC", 14, 22);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("Professional Healthcare & Wellness", 14, 30);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("PAYMENT RECEIPT", 125, 26);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 45, 196, 45);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Received From:", 14, 55);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Name/Party: ${col.party || 'N/A'}`, 14, 62);
    doc.text(`Account: ${col.account}`, 14, 68);

    doc.setFont("helvetica", "bold");
    doc.text("Receipt Details:", 130, 55);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${col.date}`, 130, 62);
    doc.text(`Category: ${col.category}`, 130, 68);
    doc.text(`Receipt No: ${col._id ? col._id.substring(col._id.length - 6).toUpperCase() : 'NA'}`, 130, 74);

    autoTable(doc, {
      startY: 85,
      head: [['Payment Purpose / Details', 'Amount Received']],
      body: [
        [col.category, `Rs. ${col.amount}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { textColor: 50, halign: 'center' },
      columnStyles: { 0: { halign: 'left' } },
      margin: { left: 14, right: 14 }
    });

    const finalY = doc.lastAutoTable.finalY || 100;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`Total Received: Rs. ${col.amount}`, 130, finalY + 15);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("Thank you for choosing Satguru Clinic. Wishing you good health!", 105, 280, { align: 'center' });

    doc.save(`Receipt_${col.party}_${col.date.replace(/ /g, '_')}.pdf`);
  };

  const handleDownloadPDF = (inv) => {
    const doc = new jsPDF();
    const primaryColor = [15, 23, 42]; // #0f172a
    const secondaryColor = [100, 116, 139]; // #64748b

    // Header Background
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 40, 'F');

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("SATGURU CLINIC", 14, 22);
    
    // Subtitle / Tagline
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("Professional Healthcare & Wellness", 14, 30);

    // Invoice Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("INVOICE", 150, 26);

    // Separator line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 45, 196, 45);

    // Bill To Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Billed To:", 14, 55);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Client Name: ${inv.client}`, 14, 62);
    // You can add Mobile/Email here if they exist

    // Invoice Details Section
    doc.setFont("helvetica", "bold");
    doc.text("Invoice Details:", 130, 55);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${inv.date}`, 130, 62);
    doc.text(`Status: ${inv.status.toUpperCase()}`, 130, 68);
    // Shorten ID for display
    doc.text(`Receipt No: ${inv.id.substring(inv.id.length - 6).toUpperCase()}`, 130, 74);

    // Table
    autoTable(doc, {
      startY: 85,
      head: [['Description', 'Total Amount', 'Balance Due']],
      body: [
        [inv.work, `Rs. ${inv.total}`, `Rs. ${inv.balance}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { textColor: 50, halign: 'center' },
      columnStyles: { 0: { halign: 'left' } },
      margin: { left: 14, right: 14 }
    });

    // Summary Section
    const finalY = doc.lastAutoTable.finalY || 100;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`Total Amount: Rs. ${inv.total}`, 130, finalY + 15);
    doc.text(`Balance Due: Rs. ${inv.balance}`, 130, finalY + 23);

    // Footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("Thank you for choosing Satguru Clinic. Wishing you good health!", 105, 280, { align: 'center' });

    doc.save(`Invoice_${inv.client}_${inv.date.replace(/ /g, '_')}.pdf`);
  };

  const openEditModal = (inv) => {
    setEditingInvoice(inv);
    // Populate form states here if editing services/amounts was fully supported,
    // but for simplicity we will just let them edit the total and work string
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingInvoice) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/invoices/${editingInvoice.id}`, {
        client: editingInvoice.client,
        work: editingInvoice.work,
        total: editingInvoice.total
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setInvoices(invoices.map(i => i.id === editingInvoice.id ? { ...i, ...res.data, id: res.data._id } : i));
      setShowEditModal(false);
      setEditingInvoice(null);
    } catch (err) {
      alert("Error updating invoice");
    }
  };
  return (
    <div className="payments-page-container">
      {/* Top Header Card */}
      <div className="payments-header-card">
        <div className="payments-header-left">
          <div className="payments-icon-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
          </div>
          <div>
            <h2 className="payments-title">Payment Management</h2>
          </div>
        </div>

        <div className="payments-header-controls">
          <div className="payments-filter-select-wrap payments-filter-month-wrap">
            <CustomSelect 
              value={selectedMonth} 
              onChange={(val) => setSelectedMonth(val)}
              options={MONTH_LIST.map(m => ({ value: m.val, label: m.label }))}
              placeholder="Select Month"
            />
          </div>
          <div className="payments-filter-select-wrap payments-filter-year-wrap">
            <CustomSelect 
              value={selectedYear} 
              onChange={(val) => { 
                setSelectedYear(val); 
                if (val !== 'All') setYearlyAnalyticsYear(val); 
              }}
              options={[{ value: 'All', label: 'All Years' }, ...YEAR_OPTIONS.map(y => ({ value: y, label: y }))]}
              placeholder="Select Year"
            />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="payments-tabs-nav">
        {['Sales Book', 'Collections', 'Expenses'].map(tab => (
          <button 
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`payments-tab-btn ${activeTab === tab ? 'active' : ''}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Sales Book' && (
        <div>
          {/* 4 KPI Cards */}
          <div className="payments-kpi-grid">
            <div className="payments-kpi-card kpi-theme-sales">
              <div className="payments-kpi-header">
                <span className="payments-kpi-label">Total Sales</span>
                <div className="payments-kpi-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                </div>
              </div>
              <div className="payments-kpi-value">{R}{totalSales}</div>
            </div>

            <div className="payments-kpi-card kpi-theme-collection">
              <div className="payments-kpi-header">
                <span className="payments-kpi-label">Collection</span>
                <div className="payments-kpi-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
              </div>
              <div className="payments-kpi-value">{R}{totalCollection}</div>
            </div>

            <div className="payments-kpi-card kpi-theme-outstanding">
              <div className="payments-kpi-header">
                <span className="payments-kpi-label">Outstanding</span>
                <div className="payments-kpi-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
              </div>
              <div className="payments-kpi-value">{R}{totalOutstanding}</div>
            </div>

            <div className="payments-kpi-card kpi-theme-loss">
              <div className="payments-kpi-header">
                <span className="payments-kpi-label">Loss</span>
                <div className="payments-kpi-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </div>
              </div>
              <div className="payments-kpi-value">{R}{totalLoss}</div>
            </div>
          </div>
          
          {/* Section Header */}
          <div className="payments-section-header">
            <div>
              <h3 className="payments-section-title">Recent Invoices</h3>
            </div>
            <div className="payments-action-buttons">
              <button 
                type="button"
                onClick={handleDownloadReport} 
                className="payments-btn-outline"
              >
                <DownloadIcon size={14} /> 
                <span>Download Report</span>
              </button>
              <button 
                type="button"
                onClick={() => setShowNewSaleModal(true)} 
                className="payments-btn-primary"
              >
                <span>+ New Sale</span>
              </button>
            </div>
          </div>

          <div className="mobile-cards payments-mobile-cards-grid">
            {filteredInvoices.length === 0 ? (
              <div className="payments-cards-empty">
                No invoices found for {selectedPeriodLabel}
              </div>
            ) : (
              currentInvoices.map((inv) => {
                const isCleared = inv.balance === 0 || inv.status === 'Cleared';
                const isPartial = !isCleared && inv.balance < inv.total;
                const clientInitials = (inv.client || 'P').substring(0, 2).toUpperCase();

                return (
                  <div key={inv.id} className="payment-invoice-card">
                    {/* Top Row: Avatar + Client Name & ID + Status Pill */}
                    <div className="pay-card-top-row">
                      <div className="pay-card-client-wrap">
                        <div className="pay-card-avatar">
                          {clientInitials}
                        </div>
                        <div className="pay-card-client-info">
                          <h4 className="pay-card-client-name" title={inv.client}>{inv.client}</h4>
                          <span className="pay-card-id-badge">#{inv.id.substring(inv.id.length - 6).toUpperCase()}</span>
                        </div>
                      </div>
                      <span className={`pay-status-pill ${isCleared ? 'pill-paid' : (isPartial ? 'pill-partial' : 'pill-pending')}`}>
                        {isCleared ? 'PAID' : (isPartial ? 'PARTIAL' : 'UNPAID')}
                      </span>
                    </div>

                    {/* Services/Work Description */}
                    {inv.work && (
                      <div className="pay-card-work-desc" title={inv.work}>
                        {inv.work}
                      </div>
                    )}

                    {/* Metrics Row: Date | Total | Balance */}
                    <div className="pay-card-metrics-row">
                      <div className="pay-card-metric-col">
                        <span className="pay-card-metric-label">DATE</span>
                        <span className="pay-card-metric-val pay-card-date-val">
                          <CalendarIcon size={12} color="#64748b" />
                          <span>{inv.date}</span>
                        </span>
                      </div>
                      <div className="pay-card-metric-col">
                        <span className="pay-card-metric-label">TOTAL</span>
                        <span className="pay-card-metric-val pay-card-total-val">{R}{inv.total.toLocaleString()}</span>
                      </div>
                      <div className="pay-card-metric-col">
                        <span className="pay-card-metric-label">BALANCE</span>
                        <span className={`pay-card-metric-val ${isCleared ? 'pay-bal-cleared' : 'pay-bal-due'}`}>
                          {isCleared ? 'Cleared' : `${R}${inv.balance.toLocaleString()}`}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer: Collect Button (if pending) + Action Icons */}
                    <div className="pay-card-footer">
                      {!isCleared ? (
                        <button 
                          type="button" 
                          onClick={() => { 
                            setSelectedInvoice(inv); 
                            setCollectAmount(inv.balance); 
                            setCollectLoss(0); 
                            setShowCollectModal(true); 
                          }}
                          className="pay-card-btn-collect"
                        >
                          <WalletIcon size={13} />
                          <span>Collect {R}{inv.balance}</span>
                        </button>
                      ) : (
                        <div className="pay-card-cleared-tag">
                          <span>Fully Settled</span>
                        </div>
                      )}

                      <div className="pay-card-actions">
                        <button 
                          type="button" 
                          onClick={() => handleDownloadPDF(inv)} 
                          className="pay-card-icon-btn btn-download" 
                          title="Download PDF Invoice"
                        >
                          <DownloadIcon size={17} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => { setInfoModalData(inv); setShowInfoModal(true); }} 
                          className="pay-card-icon-btn btn-info" 
                          title="View Details"
                        >
                          <InfoIcon size={17} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => openEditModal(inv)} 
                          className="pay-card-icon-btn btn-edit" 
                          title="Edit Invoice"
                        >
                          <EditIcon size={17} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleDeleteInvoice(inv.id)} 
                          className="pay-card-icon-btn btn-delete" 
                          title="Delete Invoice"
                        >
                          <TrashIcon size={17} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {filteredInvoices.length > 0 && (
              <div className="pay-mobile-pagination-wrap">
                <Pagination
                  currentPage={salesPage}
                  totalItems={filteredInvoices.length}
                  itemsPerPage={salesPerPage}
                  onPageChange={setSalesPage}
                  itemName="invoices"
                />
              </div>
            )}
          </div>
          <div className="desktop-table-container payments-table-card">
            <table className="payments-data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Total</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      No invoices found for {selectedPeriodLabel}
                    </td>
                  </tr>
                ) : (
                  currentInvoices.map((inv, index) => (
                    <tr key={inv.id}>
                      <td style={{ color: '#64748b' }}>{(salesPage - 1) * salesPerPage + index + 1}.</td>
                      <td style={{ color: '#64748b' }}>{inv.date}</td>
                      <td style={{ fontWeight: 700 }}>{inv.client}</td>
                      <td style={{ fontWeight: 700 }}>{R}{inv.total}</td>
                      <td style={{ color: inv.balance === 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                        {inv.balance === 0 ? 'Paid' : `${R}${inv.balance}`}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {inv.status === 'Cleared' ? (
                            <span className="status-badge-cleared">Cleared</span>
                          ) : (
                            <>
                              <span className="status-badge-pending">Pending</span>
                              <button 
                                type="button"
                                onClick={() => { setSelectedInvoice(inv); setCollectAmount(inv.balance); setCollectLoss(0); setShowCollectModal(true); }} 
                                className="payments-btn-collect"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                                <span>Collect</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                         <div className="payments-table-actions">
                             <button type="button" onClick={() => handleDownloadPDF(inv)} className="payments-icon-action-btn" title="Download Invoice"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>
                             <button type="button" onClick={() => { setInfoModalData(inv); setShowInfoModal(true); }} className="payments-icon-action-btn btn-info" title="Info"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></button>
                             <button type="button" onClick={() => openEditModal(inv)} className="payments-icon-action-btn" title="Edit"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
                             <button type="button" onClick={() => handleDeleteInvoice(inv.id)} className="payments-icon-action-btn btn-delete" title="Delete"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filteredInvoices.length > 0 && (
              <Pagination
                currentPage={salesPage}
                totalItems={filteredInvoices.length}
                itemsPerPage={salesPerPage}
                onPageChange={setSalesPage}
                itemName="invoices"
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'Collections' && (
        <div>
          {/* KPI Cards */}
          <div className="payments-kpi-grid">
            <div className="payments-kpi-card kpi-theme-collection">
              <div className="payments-kpi-header">
                <span className="payments-kpi-label">Net Collection</span>
                <div className="payments-kpi-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
              </div>
              <div className="payments-kpi-value">{R}{totalNetCollection - totalOutflow}</div>
            </div>

            <div className="payments-kpi-card">
              <div className="payments-kpi-header">
                <span className="payments-kpi-label">Company Acc</span>
                <div className="payments-kpi-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="14" x="2" y="5" rx="2"></rect><line x1="2" x2="22" y1="10" y2="10"></line></svg>
                </div>
              </div>
              <div className="payments-kpi-value">{R}{companyAvailable}</div>
            </div>

            <div className="payments-kpi-card">
              <div className="payments-kpi-header">
                <span className="payments-kpi-label">Personal Acc</span>
                <div className="payments-kpi-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
              </div>
              <div className="payments-kpi-value">{R}{personalAvailable}</div>
            </div>

            <div className="payments-kpi-card">
              <div className="payments-kpi-header">
                <span className="payments-kpi-label">Cash</span>
                <div className="payments-kpi-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="12" x="2" y="6" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
                </div>
              </div>
              <div className="payments-kpi-value">{R}{cashAvailable}</div>
            </div>
          </div>

          {/* Section Header */}
          <div className="payments-section-header">
            <div>
              <h3 className="payments-section-title">Collection History</h3>
            </div>
            <div className="payments-action-buttons">
              <button 
                type="button"
                onClick={handleDownloadReport} 
                className="payments-btn-outline"
              >
                <DownloadIcon size={14} /> 
                <span>Download Report</span>
              </button>
              <button 
                type="button"
                onClick={handleDownloadProfitReport} 
                className="payments-btn-outline"
              >
                <DownloadIcon size={14} /> 
                <span>Download Profit Report</span>
              </button>
            </div>
          </div>

          <div className="payments-search-wrap">
            <SearchIcon size={15} color="#94a3b8" className="payments-search-icon" />
            <input 
              type="text" 
              placeholder="Search by payer name..." 
              value={searchCollection}
              onChange={(e) => setSearchCollection(e.target.value)}
              className="payments-search-input"
            />
          </div>

          <div className="mobile-cards payments-mobile-cards-grid">
            {displayedCollections.length === 0 ? (
              <div className="payments-cards-empty">
                No collections found for {selectedPeriodLabel}
              </div>
            ) : (
              currentCollections.map(col => {
                const partyInitials = (col.party || 'C').substring(0, 2).toUpperCase();
                return (
                  <div key={col._id} className="payment-invoice-card payment-col-card">
                    <div className="pay-card-top-row">
                      <div className="pay-card-client-wrap">
                        <div className="pay-card-avatar avatar-collection">
                          {partyInitials}
                        </div>
                        <div className="pay-card-client-info">
                          <h4 className="pay-card-client-name" title={col.party}>{col.party}</h4>
                          <span className="pay-card-id-badge">{col.category || 'Sale'}</span>
                        </div>
                      </div>
                      <span className="pay-col-amount-pill">
                        +{R}{col.amount.toLocaleString()}
                      </span>
                    </div>

                    <div className="pay-card-metrics-row">
                      <div className="pay-card-metric-col">
                        <span className="pay-card-metric-label">DATE</span>
                        <span className="pay-card-metric-val pay-card-date-val">
                          <CalendarIcon size={12} color="#64748b" />
                          <span>{col.date}</span>
                        </span>
                      </div>
                      <div className="pay-card-metric-col">
                        <span className="pay-card-metric-label">ACCOUNT</span>
                        <span className="pay-card-metric-val" style={{ color: col.account === 'Cash' ? '#10b981' : (col.account === 'Personal Bank' ? '#7c3aed' : '#2563eb'), fontWeight: 700 }}>
                          {col.account}
                        </span>
                      </div>
                    </div>

                    <div className="pay-card-footer">
                      <span className="pay-card-receipt-tag">Incoming Receipt</span>
                      <div className="pay-card-actions">
                        <button type="button" onClick={() => handleDownloadCollectionReceipt(col)} className="pay-card-icon-btn btn-download" title="Download Receipt">
                          <DownloadIcon size={17} />
                        </button>
                        <button type="button" onClick={() => openEditCollection(col)} className="pay-card-icon-btn btn-edit" title="Edit Collection">
                          <EditIcon size={17} />
                        </button>
                        <button type="button" onClick={() => handleDeleteCollection(col._id)} className="pay-card-icon-btn btn-delete" title="Delete Collection">
                          <TrashIcon size={17} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {displayedCollections.length > 0 && (
              <div className="pay-mobile-pagination-wrap">
                <Pagination
                  currentPage={collectionsPage}
                  totalItems={displayedCollections.length}
                  itemsPerPage={collectionsPerPage}
                  onPageChange={setCollectionsPage}
                  itemName="collections"
                />
              </div>
            )}
          </div>

          <div className="desktop-table-container payments-table-card">
            <table className="payments-data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Purpose</th>
                  <th>Amount</th>
                  <th>Type/Category</th>
                  <th>Account</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedCollections.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      No collections found for {selectedPeriodLabel}
                    </td>
                  </tr>
                ) : (
                  currentCollections.map(col => (
                    <tr key={col._id}>
                      <td style={{ color: '#64748b' }}>{col.date}</td>
                      <td style={{ fontWeight: 700, textTransform: 'uppercase' }}>{col.party}</td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>{R}{col.amount}</td>
                      <td style={{ color: '#2563eb', fontWeight: 500 }}>{col.category}</td>
                      <td style={{ color: col.account === 'Cash' ? '#10b981' : (col.account === 'Personal Bank' ? '#7c3aed' : '#2563eb'), fontWeight: 600 }}>{col.account}</td>
                      <td className="text-right">
                         <div className="payments-table-actions">
                             <button type="button" onClick={() => handleDownloadCollectionReceipt(col)} className="payments-icon-action-btn" title="Download Receipt"><DownloadIcon size={15} /></button>
                             <button type="button" onClick={() => openEditCollection(col)} className="payments-icon-action-btn" title="Edit"><EditIcon size={15} /></button>
                             <button type="button" onClick={() => handleDeleteCollection(col._id)} className="payments-icon-action-btn btn-delete" title="Delete"><TrashIcon size={15} /></button>
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {displayedCollections.length > 0 && (
              <Pagination
                currentPage={collectionsPage}
                totalItems={displayedCollections.length}
                itemsPerPage={collectionsPerPage}
                onPageChange={setCollectionsPage}
                itemName="collections"
              />
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'Expenses' && (
        <div>
          {/* KPI Cards */}
          <div className="payments-kpi-grid">
            <div className="payments-kpi-card kpi-theme-outflow">
              <div className="payments-kpi-header">
                <span className="payments-kpi-label">Total Outflow</span>
                <div className="payments-kpi-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
                </div>
              </div>
              <div className="payments-kpi-value">{R}{totalOutflow}</div>
            </div>

            <div className="payments-kpi-card">
              <div className="payments-kpi-header">
                <span className="payments-kpi-label">Operational</span>
                <div className="payments-kpi-icon" style={{ background: '#f1f5f9', color: '#475569' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                </div>
              </div>
              <div className="payments-kpi-value">{R}{operationalExpense}</div>
            </div>

            <div className="payments-kpi-card">
              <div className="payments-kpi-header">
                <span className="payments-kpi-label">Salary / Payout</span>
                <div className="payments-kpi-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
              </div>
              <div className="payments-kpi-value">{R}{salaryExpense}</div>
            </div>

            <div className="payments-kpi-card">
              <div className="payments-kpi-header">
                <span className="payments-kpi-label">Purchase</span>
                <div className="payments-kpi-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                </div>
              </div>
              <div className="payments-kpi-value">{R}{purchaseExpense}</div>
            </div>
          </div>

          {/* Section Header */}
          <div className="payments-section-header">
            <div>
              <h3 className="payments-section-title">Expense Journal</h3>
            </div>
            <div className="payments-action-buttons">
              <button 
                type="button"
                onClick={handleDownloadReport} 
                className="payments-btn-outline"
              >
                <DownloadIcon size={14} /> 
                <span>Download Report</span>
              </button>
              <button 
                type="button"
                onClick={() => setShowExpenseModal(true)} 
                className="payments-btn-primary"
              >
                <PlusIcon size={14} />
                <span>+ Record Expense</span>
              </button>
            </div>
          </div>

          <div className="payments-search-wrap">
            <SearchIcon size={15} color="#94a3b8" className="payments-search-icon" />
            <input 
              type="text" 
              placeholder="Search by payer name..." 
              value={searchExpense}
              onChange={(e) => setSearchExpense(e.target.value)}
              className="payments-search-input"
            />
          </div>

          <div className="mobile-cards payments-mobile-cards-grid">
            {displayedExpenses.length === 0 ? (
              <div className="payments-cards-empty">
                No expenses found for {selectedPeriodLabel}
              </div>
            ) : (
              currentExpenses.map(exp => {
                const partyInitials = (exp.party || 'E').substring(0, 2).toUpperCase();
                return (
                  <div key={exp._id} className="payment-invoice-card payment-col-card">
                    <div className="pay-card-top-row">
                      <div className="pay-card-client-wrap">
                        <div className="pay-card-avatar avatar-expense">
                          {partyInitials}
                        </div>
                        <div className="pay-card-client-info">
                          <h4 className="pay-card-client-name" title={exp.party}>{exp.party}</h4>
                          <span className="pay-card-id-badge">{exp.category}</span>
                        </div>
                      </div>
                      <span className="pay-exp-amount-pill">
                        -{R}{exp.amount.toLocaleString()}
                      </span>
                    </div>

                    <div className="pay-card-metrics-row">
                      <div className="pay-card-metric-col">
                        <span className="pay-card-metric-label">DATE</span>
                        <span className="pay-card-metric-val pay-card-date-val">
                          <CalendarIcon size={12} color="#64748b" />
                          <span>{exp.date}</span>
                        </span>
                      </div>
                      <div className="pay-card-metric-col">
                        <span className="pay-card-metric-label">ACCOUNT</span>
                        <span className="pay-card-metric-val" style={{ color: exp.account === 'Cash' ? '#10b981' : (exp.account === 'Personal Bank' ? '#7c3aed' : '#2563eb'), fontWeight: 700 }}>
                          {exp.account}
                        </span>
                      </div>
                    </div>

                    <div className="pay-card-footer">
                      <span className="pay-card-receipt-tag">Outflow Expense</span>
                      <div className="pay-card-actions">
                        <button type="button" onClick={() => handleDownloadExpenseReceipt(exp)} className="pay-card-icon-btn btn-download" title="Download Receipt">
                          <DownloadIcon size={17} />
                        </button>
                        <button type="button" onClick={() => openEditExpense(exp)} className="pay-card-icon-btn btn-edit" title="Edit Expense">
                          <EditIcon size={17} />
                        </button>
                        <button type="button" onClick={() => handleDeleteExpense(exp._id)} className="pay-card-icon-btn btn-delete" title="Delete Expense">
                          <TrashIcon size={17} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {displayedExpenses.length > 0 && (
              <div className="pay-mobile-pagination-wrap">
                <Pagination
                  currentPage={expensesPage}
                  totalItems={displayedExpenses.length}
                  itemsPerPage={expensesPerPage}
                  onPageChange={setExpensesPage}
                  itemName="expenses"
                />
              </div>
            )}
          </div>

          <div className="desktop-table-container payments-table-card">
            <table className="payments-data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Purpose</th>
                  <th>Amount</th>
                  <th>Type/Category</th>
                  <th>Account</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      No expenses found for {selectedPeriodLabel}
                    </td>
                  </tr>
                ) : (
                  currentExpenses.map(exp => (
                    <tr key={exp._id}>
                      <td style={{ color: '#64748b' }}>{exp.date}</td>
                      <td style={{ fontWeight: 700 }}>{exp.party}</td>
                      <td style={{ fontWeight: 700, color: '#ef4444' }}>{R}{exp.amount}</td>
                      <td style={{ color: '#64748b', fontWeight: 500 }}>{exp.category}</td>
                      <td style={{ color: exp.account === 'Cash' ? '#10b981' : (exp.account === 'Personal Bank' ? '#7c3aed' : '#2563eb'), fontWeight: 600 }}>{exp.account}</td>
                      <td className="text-right">
                         <div className="payments-table-actions">
                             <button type="button" onClick={() => handleDownloadExpenseReceipt(exp)} className="payments-icon-action-btn" title="Download Receipt"><DownloadIcon size={15} /></button>
                             <button type="button" onClick={() => openEditExpense(exp)} className="payments-icon-action-btn" title="Edit"><EditIcon size={15} /></button>
                             <button type="button" onClick={() => handleDeleteExpense(exp._id)} className="payments-icon-action-btn btn-delete" title="Delete"><TrashIcon size={15} /></button>
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {displayedExpenses.length > 0 && (
              <Pagination
                currentPage={expensesPage}
                totalItems={displayedExpenses.length}
                itemsPerPage={expensesPerPage}
                onPageChange={setExpensesPage}
                itemName="expenses"
              />
            )}
          </div>
        </div>
      )}

      {/* NEW SALE ENTRY MODAL */}
      {showNewSaleModal && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={() => setShowNewSaleModal(false)}></div>
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '500px', zIndex: 1001, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>New Sale Entry</h3>
              <button onClick={() => setShowNewSaleModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            
            {/* Custom Searchable Dropdown */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Search Patient Mobile</label>
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <input 
                  type="text"
                  value={saleMobile}
                  onChange={handleMobileChange}
                  onFocus={() => setShowMobileDropdown(true)}
                  placeholder="Type or select mobile number..." 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', color: '#1e293b', background: '#ffffff', boxSizing: 'border-box' }} 
                />
                
                {/* Custom Dropdown List */}
                {showMobileDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', zIndex: 50, maxHeight: '160px', overflowY: 'auto' }}>
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map(p => (
                        <div 
                          key={p.mobile}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectPatient(p);
                          }}
                          style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#1e293b', display: 'flex', justifyContent: 'space-between' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span style={{ fontWeight: 'bold' }}>{p.mobile}</span>
                          <span style={{ color: '#64748b' }}>{p.name}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '10px 12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>No patient found</div>
                    )}
                  </div>
                )}
              </div>
              
              {salePatientName && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#059669', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Patient: {salePatientName}
                </div>
              )}
            </div>

            {/* Custom Searchable Multi-Select for Services */}
            
              {/* Custom Searchable Multi-Select for Packages */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Packages Selection</label>
                
                {selectedPackages.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    {selectedPackages.map(pkg => (
                      <div key={pkg.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' }}>
                        {pkg.name} ({R}{pkg.price})
                        <button onClick={() => togglePackage(pkg)} style={{ background: 'transparent', border: 'none', color: '#0369a1', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
  
                <div style={{ position: 'relative' }} ref={packageDropdownRef}>
                  <input type="text" value={searchPackage} onChange={(e) => { setSearchPackage(e.target.value); setShowPackageDropdown(true); }} onFocus={() => setShowPackageDropdown(true)} placeholder="Search to add packages..." style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', color: '#1e293b', background: '#ffffff', boxSizing: 'border-box' }} />
                  {showPackageDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 50, maxHeight: '160px', overflowY: 'auto' }}>
                      {allPackages.length === 0 && <div style={{ padding: '10px 12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>Loading...</div>}
                      {filteredPackages.length > 0 ? (
                        filteredPackages.map(pkg => {
                          const isSelected = !!selectedPackages.find(p => p.id === pkg.id);
                          return (
                            <div key={pkg.id} onMouseDown={(e) => { e.preventDefault(); togglePackage(pkg); setSearchPackage(''); }} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: isSelected ? '#0369a1' : '#1e293b', background: isSelected ? '#f0f9ff' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#f8fafc')} onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isSelected ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> : <div style={{ width: '14px', height: '14px', border: '1px solid #cbd5e1', borderRadius: '3px' }}></div>}
                                <span>{pkg.name}</span>
                              </div>
                              <span style={{ fontWeight: 'bold' }}>{R}{pkg.price}</span>
                            </div>
                          );
                        })
                      ) : (
                        allPackages.length > 0 && <div style={{ padding: '10px 12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>No packages found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Searchable Multi-Select for Medicines */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Medicines Selection</label>
                
                {selectedMedicines.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    {selectedMedicines.map(med => (
                      <div key={med.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' }}>
                        {med.name} ({R}{med.price})
                        <button onClick={() => toggleMedicine(med)} style={{ background: 'transparent', border: 'none', color: '#0369a1', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
  
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }} ref={medicineDropdownRef}>
                    <input type="text" value={searchMedicine} onChange={(e) => { setSearchMedicine(e.target.value); setShowMedicineDropdown(true); }} onFocus={() => setShowMedicineDropdown(true)} placeholder="Search to add medicines..." style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', color: '#1e293b', background: '#ffffff', boxSizing: 'border-box' }} />
                    {showMedicineDropdown && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 50, maxHeight: '160px', overflowY: 'auto' }}>
                        {allMedicines.length === 0 && <div style={{ padding: '10px 12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>Loading...</div>}
                        {filteredMedicines.length > 0 ? (
                          filteredMedicines.map(med => {
                            const isSelected = !!selectedMedicines.find(m => m.id === med.id);
                            return (
                              <div key={med.id} onMouseDown={(e) => { e.preventDefault(); toggleMedicine(med); setSearchMedicine(''); }} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: isSelected ? '#0369a1' : '#1e293b', background: isSelected ? '#f0f9ff' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#f8fafc')} onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {isSelected ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> : <div style={{ width: '14px', height: '14px', border: '1px solid #cbd5e1', borderRadius: '3px' }}></div>}
                                  <span>{med.name}</span>
                                </div>
                                <span style={{ fontWeight: 'bold' }}>{R}{med.price}</span>
                              </div>
                            );
                          })
                        ) : (
                          allMedicines.length > 0 && <div style={{ padding: '10px 12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>No medicines found</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Days:</span>
                    <input type="number" min="1" value={medicineDuration} onChange={(e) => setMedicineDuration(e.target.value)} style={{ width: '60px', padding: '10px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', color: '#1e293b', background: '#ffffff', boxSizing: 'border-box' }} title="Duration (Days)" />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Services Selection</label>
              
              {/* Selected Tags */}
              {selectedServices.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  {selectedServices.map(srv => (
                    <div key={srv.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' }}>
                      {srv.name} ({R}{srv.price})
                      <button 
                        onClick={() => toggleService(srv)}
                        style={{ background: 'transparent', border: 'none', color: '#0369a1', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ position: 'relative' }} ref={serviceDropdownRef}>
                <input 
                  type="text"
                  value={searchService}
                  onChange={(e) => { setSearchService(e.target.value); setShowServiceDropdown(true); }}
                  onFocus={() => setShowServiceDropdown(true)}
                  placeholder="Search to add services..." 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', color: '#1e293b', background: '#ffffff', boxSizing: 'border-box' }} 
                />
                
                {showServiceDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 50, maxHeight: '160px', overflowY: 'auto' }}>
                    {servicesList.length === 0 && <div style={{ padding: '10px 12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>Loading...</div>}
                    {filteredServices.length > 0 ? (
                      filteredServices.map(srv => {
                        const isSelected = !!selectedServices.find(s => s.id === srv.id);
                        return (
                          <div 
                            key={srv.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              toggleService(srv);
                              setSearchService('');
                              // Keep dropdown open for multiple selections
                            }}
                            style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: isSelected ? '#0369a1' : '#1e293b', background: isSelected ? '#f0f9ff' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#f8fafc')}
                            onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {isSelected ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              ) : (
                                <div style={{ width: '14px', height: '14px', border: '1px solid #cbd5e1', borderRadius: '3px' }}></div>
                              )}
                              <span>{srv.name} <span style={{fontSize: '11px', color: '#94a3b8'}}>({srv.type})</span></span>
                            </div>
                            <span style={{ fontWeight: 'bold' }}>{R}{srv.price}</span>
                          </div>
                        );
                      })
                    ) : (
                      servicesList.length > 0 && <div style={{ padding: '10px 12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>No services found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Total Amount ({R})</label>
                <input 
                  type="number" 
                  value={saleTotalAmount} 
                  onChange={(e) => setSaleTotalAmount(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', background: '#ffffff', color: '#1e293b', fontWeight: 'bold' }} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Date</label>
                <input type="text" defaultValue="28 Sep 2026, 12:00 AM" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', background: '#ffffff', color: '#1e293b' }} />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Description</label>
              <textarea 
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                placeholder="Enter sale description or notes..." 
                rows="3" 
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical', background: '#ffffff', color: '#1e293b' }}
              ></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowNewSaleModal(false)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', color: '#1e293b', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreateEntry} className="crm-btn crm-btn-primary" style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '6px' }}>Create Entry</button>
            </div>
          </div>
        </>
      )}

      {/* COLLECT PAYMENT MODAL */}
      {showCollectModal && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={() => setShowCollectModal(false)}></div>
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '450px', zIndex: 1001, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Collect Payment</h3>
              <button onClick={() => setShowCollectModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>Recording payment for <span style={{fontWeight: 'bold', color: '#1e293b'}}>{selectedInvoice?.client}</span></p>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '13px' }}>
              <div><span style={{color: '#64748b'}}>Total Pending:</span> <span style={{fontWeight: 'bold', color: '#1e293b'}}>{R}{selectedInvoice?.balance}</span></div>
              <div><span style={{color: '#64748b'}}>Total Deal:</span> <span style={{fontWeight: 'bold', color: '#1e293b'}}>{R}{selectedInvoice?.total}</span></div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Amount Received ({R})</label>
                <input 
                  type="number" 
                  value={collectAmount} 
                  onChange={(e) => setCollectAmount(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', background: '#ffffff', color: '#1e293b' }} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Loss / Discount ({R})</label>
                <input 
                  type="number" 
                  value={collectLoss}
                  onChange={(e) => setCollectLoss(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', background: '#ffffff', color: '#1e293b' }} 
                />
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Amount you won't recover.</div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg> Account Type
              </label>
              <CustomSelect 
                value={collectAccount} 
                onChange={(val) => setCollectAccount(val)}
                options={[
                  { value: 'Company Bank', label: 'Company Bank' },
                  { value: 'Personal Bank', label: 'Personal Bank' },
                  { value: 'Cash', label: 'Cash' }
                ]}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <textarea placeholder="Transaction ID, etc." rows="2" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical', background: '#ffffff', color: '#1e293b' }}></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowCollectModal(false)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', color: '#1e293b', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleConfirmPayment} className="crm-btn crm-btn-primary" style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '6px' }}>Confirm Payment</button>
            </div>
          </div>
        </>
      )}

      {/* INFO MODAL */}
        {showInfoModal && infoModalData && (
          <>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={() => setShowInfoModal(false)}></div>
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', zIndex: 1001, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Invoice Details</h3>
                <button onClick={() => setShowInfoModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div style={{ fontSize: '14px', color: '#1e293b', lineHeight: '1.6' }}>
                <div style={{ marginBottom: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 8px 0' }}><strong>Client:</strong> {infoModalData.client}</p>
                  <p style={{ margin: 0 }}><strong>Date:</strong> {infoModalData.date}</p>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>Items Added:</strong>
                  <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '6px', fontSize: '13px' }}>
                    {infoModalData.work ? infoModalData.work.split(',').map((item, idx) => {
                      let name = item.trim();
                      let price = '';
                      const rupeeIdx = name.lastIndexOf('₹');
                      if (rupeeIdx !== -1) {
                          price = name.substring(rupeeIdx).replace(')', '');
                          name = name.substring(0, rupeeIdx).trim();
                          if (name.endsWith(' -')) name = name.substring(0, name.length - 2).trim() + ')';
                          if (name.endsWith('(')) name = name.substring(0, name.length - 1).trim();
                      } else {
                          const s = servicesList.find(x => x.name === name);
                          if (s) price = `₹${s.price}`;
                          const p = allPackages.find(x => x.name === name);
                          if (p) price = `₹${p.price}`;
                          if (!price && name.includes(' days)')) {
                              const medName = name.split(' (')[0];
                              const m = allMedicines.find(x => x.name === medName);
                              if (m) {
                                  const daysStr = name.match(/\((\d+) days\)/);
                                  const days = daysStr ? parseInt(daysStr[1]) : 1;
                                  price = `₹${m.price}`;
                              }
                          }
                          if (!price && name === 'Consultation') price = `₹${consultationFeeAmount}`;
                      }
                      
                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: idx !== infoModalData.work.split(',').length - 1 ? '1px dashed #cbd5e1' : 'none' }}>
                          <span>• {name}</span>
                          <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{price}</span>
                        </div>
                      );
                    }) : '-'}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '12px' }}>
                  <strong>Total Amount:</strong>
                  <strong style={{ color: '#0f172a' }}>{R}{infoModalData.total}</strong>
                </div>
              </div>
            </div>
          </>
        )}

        {/* EDIT MODAL */}
      {showEditModal && editingInvoice && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={() => setShowEditModal(false)}></div>
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '450px', zIndex: 1001, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Edit Invoice</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Client Name</label>
                <input type="text" value={editingInvoice.client || ''} onChange={e => setEditingInvoice({ ...editingInvoice, client: e.target.value })} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#ffffff', color: '#1e293b', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Work / Services (Comma separated)</label>
                <textarea value={editingInvoice.work || ''} onChange={e => setEditingInvoice({ ...editingInvoice, work: e.target.value })} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#ffffff', color: '#1e293b', boxSizing: 'border-box', minHeight: '80px', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', color: '#1e293b', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="crm-btn crm-btn-primary" style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '6px' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </>
      )}
        {/* EDIT COLLECTION MODAL */}
      {showEditCollectionModal && editingCollection && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={() => setShowEditCollectionModal(false)}></div>
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '450px', zIndex: 1001, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Edit Collection</h3>
              <button onClick={() => setShowEditCollectionModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <form onSubmit={handleEditCollectionSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Purpose / Party</label>
                <input type="text" value={editingCollection.party || ''} onChange={e => setEditingCollection({ ...editingCollection, party: e.target.value })} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#ffffff', color: '#1e293b', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Amount</label>
                <input type="number" value={editingCollection.amount || 0} onChange={e => setEditingCollection({ ...editingCollection, amount: Number(e.target.value) })} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#ffffff', color: '#1e293b', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Account</label>
                <CustomSelect 
                  value={editingCollection.account} 
                  onChange={val => setEditingCollection({ ...editingCollection, account: val })}
                  options={[
                    { value: 'Cash', label: 'Cash' },
                    { value: 'Company Bank', label: 'Company Bank' },
                    { value: 'Personal Bank', label: 'Personal Bank' }
                  ]}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowEditCollectionModal(false)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', color: '#1e293b', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="crm-btn crm-btn-primary" style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '6px' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </>
      )}

        {/* EXPENSE MODAL */}
      {showExpenseModal && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={() => setShowExpenseModal(false)}></div>
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '450px', zIndex: 1001, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Record Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <form onSubmit={handleCreateExpense}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Purpose</label>
                <input type="text" value={expenseParty} onChange={e => setExpenseParty(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#ffffff', color: '#1e293b', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Amount</label>
                <input type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#ffffff', color: '#1e293b', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Category</label>
                <CustomSelect 
                  value={expenseCategory} 
                  onChange={val => setExpenseCategory(val)}
                  options={[
                    { value: 'Operational', label: 'Operational' },
                    { value: 'Salary / Payout', label: 'Salary / Payout' },
                    { value: 'Purchase', label: 'Purchase' }
                  ]}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>
                  Account (Available: {R}{expenseAccount === 'Cash' ? allTimeCashAvailable : expenseAccount === 'Company Bank' ? allTimeCompanyAvailable : allTimePersonalAvailable})
                </label>
                <CustomSelect 
                  value={expenseAccount} 
                  onChange={val => setExpenseAccount(val)}
                  options={[
                    { value: 'Cash', label: 'Cash' },
                    { value: 'Company Bank', label: 'Company Bank' },
                    { value: 'Personal Bank', label: 'Personal Bank' }
                  ]}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowExpenseModal(false)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', color: '#1e293b', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '6px', background: '#ef4444', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Save Expense</button>
              </div>
            </form>
          </div>
        </>
      )}

      

    </div>
  );
};

export default Payments;






