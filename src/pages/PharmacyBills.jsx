import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { PlusIcon, XIcon, TrashIcon, EditIcon, SearchIcon, PillIcon, WalletIcon, InfoIcon, ClipboardListIcon } from '../components/Icons';
import CustomSelect from '../components/CustomSelect';
import CalendarPicker, { formatDateToISO, formatDisplayDate } from '../components/CalendarPicker';
import DateRangePicker from '../components/DateRangePicker';
import MonthYearPicker from '../components/MonthYearPicker';
import usePermissions from '../permissions/usePermissions';
import MedicineStock from '../components/MedicineStock';
import Medicines from './Medicines';
import './PharmacyBills.css';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' }
];
// Bill date ka filter: dropdown se type chuno, us type ka picker khulta hai
const PERIOD_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'month', label: 'Month Wise' },
  { value: 'year', label: 'Year Wise' },
  { value: 'date', label: 'Date' },
  { value: 'range', label: 'Date Range' }
];
const STATUS_LABEL = { pending: 'Pending', partial: 'Partially Paid', paid: 'Paid' };
// Payment kis account se hua: Payments & Finances ke accounts, wahan Expense ban jata hai
const ACCOUNT_OPTIONS = [
  { value: 'Company Bank', label: 'Company Bank' },
  { value: 'Personal Bank', label: 'Personal Bank' },
  { value: 'Cash', label: 'Cash' }
];

const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const todayISO = () => formatDateToISO(new Date());
const isOverdue = (bill) => bill.pendingAmount > 0 && bill.dueDate && bill.dueDate < todayISO();
// Items ek hi field me comma se jude text me rehte hain
const splitItems = (text) => (text || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean);
// Bill ki medicines: stockItems ho to naam + qty, warna purane text wale items (qty nahi)
const billMedicines = (b) => (b.stockItems || []).length
  ? b.stockItems.map(i => ({ name: i.name, qty: i.qty }))
  : splitItems(b.items).map(name => ({ name, qty: null }));
// Table / card me itni medicines dikhti hain, baaki "+N more" popup me
const MED_PREVIEW = 2;
// Aakhri comma ke baad jo type ho raha hai
const currentItemToken = (text) => (text || '').split(/[,\n]/).pop().trim();
// Aakhri adhoora item hata kar naya item + ", " jod do
const appendItem = (text, name) => {
  const parts = (text || '').split(/[,\n]/);
  const done = parts.slice(0, -1).map(s => s.trim()).filter(Boolean);
  const last = name || parts[parts.length - 1].trim();
  return [...done, last].filter(Boolean).join(', ') + ', ';
};

// Bill popup me ek medicine row: category se list chhoti hoti hai, medicine = list ka id ya OTHER_MED (naam type karo)
const OTHER_MED = '__other';
let rowSeq = 0;
const emptyStockRow = () => ({ rowId: ++rowSeq, category: 'all', medicine: '', name: '', qty: '' });

const emptyBillForm = () => ({
  supplierName: '',
  billNumber: '',
  billDate: todayISO(),
  dueDate: '',
  items: '',
  stockRows: [emptyStockRow()],
  totalAmount: '',
  notes: '',
  paidAmount: '',
  paidFrom: ''
});

const PharmacyBills = () => {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  const { can } = usePermissions();
  const perm = (action) => can('pharmacy-bills:' + action);

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  // 'bills' = bills list, 'stock' = medicine stock tracking, 'medicines' = medicine master list (packages bhi yahi use karte hain)
  const [activeTab, setActiveTab] = useState('bills');
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodType, setPeriodType] = useState('all');
  const [periodMonth, setPeriodMonth] = useState(todayISO().slice(5, 7));
  const [periodYear, setPeriodYear] = useState(todayISO().slice(0, 4));
  const [periodDate, setPeriodDate] = useState(todayISO());
  const [periodRange, setPeriodRange] = useState({ start: '', end: '' });

  // Add / Edit bill popup
  const [showBillModal, setShowBillModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyBillForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const itemsRef = useRef(null);
  const [itemMenuPos, setItemMenuPos] = useState({ top: 0, left: 0, width: 0 });

  // Payments popup (history + add payment)
  const [paymentBill, setPaymentBill] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', date: todayISO(), note: '', account: '' });
  const [payError, setPayError] = useState('');
  const [paying, setPaying] = useState(false);

  // Account ka bacha balance (Paid From dropdown me dikhta hai)
  const [balances, setBalances] = useState({});
  // Paid ke bagal wale info icon se khulne wala popup: us bill ke saare payments
  const [paidInfo, setPaidInfo] = useState(null);
  // "+N more" se khulne wala popup: us bill ki saari medicines
  const [medInfo, setMedInfo] = useState(null);

  useEffect(() => {
    fetchBills();
    fetchBalances();
    if (perm('stock-add')) fetchMedicines();
  }, []);

  const fetchBalances = async () => {
    try {
      const res = await axios.get(`${API_URL}/pharmacy-bills/account-balances`, authHeader());
      setBalances(res.data || {});
    } catch (err) {
      console.error('Error fetching account balances', err);
    }
  };

  const accountOptions = ACCOUNT_OPTIONS.map(o => ({
    ...o,
    label: balances[o.value] !== undefined ? `${o.label} (Balance ${money(balances[o.value])})` : o.label
  }));

  // Account me itna paisa nahi to sirf note, payment phir bhi ho jayega
  const balanceNote = (account, amount) => {
    const amt = Number(amount);
    if (!account || !(amt > 0) || balances[account] === undefined || amt <= balances[account]) return null;
    return (
      <div className="pb-balance-note">
        Note: Insufficient balance in {account} (available {money(balances[account])}). The payment will still be saved.
      </div>
    );
  };

  const fetchMedicines = async () => {
    try {
      const res = await axios.get(`${API_URL}/medicines`, authHeader());
      setMedicines(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching medicines', err);
    }
  };

  // ---------- Medicine rows (bill popup) ----------
  const medicineCategories = useMemo(
    () => [...new Set(medicines.map(m => m.category || 'Other'))].sort(),
    [medicines]
  );
  const categorySelectOptions = useMemo(() => [
    { value: 'all', label: 'All Categories' },
    ...medicineCategories.map(c => ({ value: c, label: c }))
  ], [medicineCategories]);

  const medicineOptionsFor = (row) => [
    { value: '', label: 'Select medicine' },
    ...medicines
      .filter(m => row.category === 'all' || (m.category || 'Other') === row.category)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(m => ({ value: m._id, label: m.name })),
    { value: OTHER_MED, label: '+ Other (type name)' }
  ];

  const updateStockRow = (rowId, changes) => {
    setForm(prev => ({ ...prev, stockRows: prev.stockRows.map(r => (r.rowId === rowId ? { ...r, ...changes } : r)) }));
    setFormError('');
  };
  const addStockRow = () => setForm(prev => ({ ...prev, stockRows: [...prev.stockRows, emptyStockRow()] }));
  const removeStockRow = (rowId) => setForm(prev => {
    const rest = prev.stockRows.filter(r => r.rowId !== rowId);
    return { ...prev, stockRows: rest.length ? rest : [emptyStockRow()] };
  });
  const stockRowName = (row) => {
    if (row.medicine === OTHER_MED) return row.name.trim();
    return medicines.find(m => m._id === row.medicine)?.name || '';
  };
  const totalStockQty = form.stockRows.reduce((sum, r) => sum + (Number(r.qty) > 0 ? Number(r.qty) : 0), 0);

  const fetchBills = async () => {
    try {
      const res = await axios.get(`${API_URL}/pharmacy-bills`, authHeader());
      setBills(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching pharmacy bills', err);
    } finally {
      setLoading(false);
    }
  };

  const replaceBill = (bill) => {
    setBills(prev => prev.map(b => (b._id === bill._id ? bill : b)));
    setPaymentBill(prev => (prev && prev._id === bill._id ? bill : prev));
  };

  // ---------- Summary ----------
  const totals = useMemo(() => bills.reduce((acc, b) => ({
    billed: acc.billed + (b.totalAmount || 0),
    paid: acc.paid + (b.paidAmount || 0),
    pending: acc.pending + (b.pendingAmount || 0),
    pendingBills: acc.pendingBills + (b.pendingAmount > 0 ? 1 : 0)
  }), { billed: 0, paid: 0, pending: 0, pendingBills: 0 }), [bills]);

  // Har supplier ka total / paid / pending (sabse zyada pending upar)
  const supplierSummary = useMemo(() => {
    const map = {};
    bills.forEach(b => {
      const key = b.supplierName.trim().toLowerCase();
      if (!map[key]) map[key] = { name: b.supplierName, bills: 0, total: 0, paid: 0, pending: 0 };
      map[key].bills += 1;
      map[key].total += b.totalAmount || 0;
      map[key].paid += b.paidAmount || 0;
      map[key].pending += b.pendingAmount || 0;
    });
    return Object.values(map).sort((a, b) => b.pending - a.pending || a.name.localeCompare(b.name));
  }, [bills]);

  // Pichhle bills me aaye alag-alag items (comma / new line se split), sabse zyada use wale upar
  const itemSuggestions = useMemo(() => {
    const map = {};
    bills.forEach(b => {
      splitItems(b.items).forEach(name => {
        const key = name.toLowerCase();
        if (!map[key]) map[key] = { name, count: 0 };
        map[key].count += 1;
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [bills]);

  const supplierOptions = useMemo(() => [
    { value: 'all', label: 'All Suppliers' },
    ...supplierSummary.map(s => ({ value: s.name.toLowerCase(), label: s.name }))
  ], [supplierSummary]);

  // billDate 'YYYY-MM-DD' hai, isliye string compare se hi filter ho jata hai
  const inPeriod = (billDate = '') => {
    if (periodType === 'month') return billDate.slice(0, 7) === `${periodYear}-${periodMonth}`;
    if (periodType === 'year') return billDate.slice(0, 4) === periodYear;
    if (periodType === 'date') return !periodDate || billDate === periodDate;
    if (periodType === 'range') {
      const { start, end } = periodRange;
      if (start && billDate < start) return false;
      if (end && billDate > end) return false;
    }
    return true;
  };

  // Status ke alawa baaki saare filters
  const filteredBills = bills.filter(b => {
    if (supplierFilter !== 'all' && b.supplierName.trim().toLowerCase() !== supplierFilter) return false;
    if (!inPeriod(b.billDate)) return false;
    const q = search.trim().toLowerCase();
    if (q && ![b.supplierName, b.billNumber, b.items].some(v => (v || '').toLowerCase().includes(q))) return false;
    return true;
  });

  // Status slider pe har option ka count
  const statusCounts = filteredBills.reduce((acc, b) => {
    acc[b.paymentStatus] = (acc[b.paymentStatus] || 0) + 1;
    return acc;
  }, { all: filteredBills.length });

  const visibleBills = statusFilter === 'all' ? filteredBills : filteredBills.filter(b => b.paymentStatus === statusFilter);

  // ---------- Add / Edit bill ----------
  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyBillForm());
    setFormError('');
    setShowBillModal(true);
  };

  const openEditModal = (bill) => {
    setEditingId(bill._id);
    setForm({
      supplierName: bill.supplierName,
      billNumber: bill.billNumber || '',
      billDate: bill.billDate,
      dueDate: bill.dueDate || '',
      items: splitItems(bill.items).join(', '),
      stockRows: (bill.stockItems || []).length
        ? bill.stockItems.map(i => ({
          rowId: ++rowSeq,
          category: 'all',
          medicine: i.medicine && medicines.some(m => m._id === String(i.medicine)) ? String(i.medicine) : OTHER_MED,
          name: i.name,
          qty: String(i.qty)
        }))
        : [emptyStockRow()],
      totalAmount: String(bill.totalAmount),
      notes: bill.notes || '',
      paidAmount: ''
    });
    setFormError('');
    setShowBillModal(true);
  };

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setFormError('');
  };

  // ---------- Items (comma wali ek field) ----------
  // Suggestion menu field ke theek niche (screen ke hisaab se) khulta hai
  const openItemsMenu = () => {
    const el = itemsRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setItemMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setItemsOpen(true);
  };

  const handleSaveBill = async (e) => {
    e.preventDefault();
    if (!form.supplierName.trim()) return setFormError('Please enter the supplier / pharma name.');
    if (!form.billDate) return setFormError('Please select the bill date.');
    const total = Number(form.totalAmount);
    if (form.totalAmount === '' || !Number.isFinite(total) || total < 0) return setFormError('Please enter a valid bill amount.');
    const paidNow = Number(form.paidAmount || 0);
    if (!editingId && (paidNow < 0 || paidNow > total)) return setFormError('Amount paid cannot be more than the bill amount.');
    if (!editingId && paidNow > 0 && !form.paidFrom) return setFormError('Please select the account the payment was made from.');

    // Medicine rows: puri khali row chhod do, baaki me naam + qty zaroori
    let stockItems;
    if (perm('stock-add')) {
      stockItems = [];
      for (const row of form.stockRows) {
        const name = stockRowName(row);
        const isEmpty = !row.medicine && !row.name.trim() && !row.qty;
        if (isEmpty) continue;
        if (!name) return setFormError('Please select or type the medicine name in every row.');
        const qty = Number(row.qty);
        if (!Number.isFinite(qty) || qty <= 0) return setFormError(`Please enter the quantity for ${name}.`);
        const med = row.medicine !== OTHER_MED ? medicines.find(m => m._id === row.medicine) : null;
        stockItems.push({
          medicine: med ? med._id : null,
          name,
          category: med ? (med.category || '') : (row.category === 'all' ? '' : row.category),
          qty: Math.round(qty)
        });
      }
    }

    setSaving(true);
    try {
      const body = {
        supplierName: form.supplierName.trim(),
        billNumber: form.billNumber.trim(),
        billDate: form.billDate,
        dueDate: form.dueDate,
        items: splitItems(form.items).join(', '),
        totalAmount: total,
        notes: form.notes.trim()
      };
      if (stockItems) body.stockItems = stockItems;
      if (editingId) {
        const res = await axios.put(`${API_URL}/pharmacy-bills/${editingId}`, body, authHeader());
        replaceBill(res.data);
      } else {
        const res = await axios.post(`${API_URL}/pharmacy-bills`, {
          ...body,
          paidAmount: paidNow,
          paymentDate: form.billDate,
          paymentAccount: form.paidFrom
        }, authHeader());
        setBills(prev => [res.data, ...prev].sort((a, b) => b.billDate.localeCompare(a.billDate)));
        if (paidNow > 0) fetchBalances();
      }
      // "+ Other" se likhi medicine backend me list me ban jaati hai, list taaza karo
      if (stockItems?.some(i => !i.medicine)) fetchMedicines();
      setShowBillModal(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not save the bill.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBill = async (bill) => {
    if (!window.confirm(`Delete bill${bill.billNumber ? ' ' + bill.billNumber : ''} from ${bill.supplierName}? Its payments will also be removed.`)) return;
    try {
      await axios.delete(`${API_URL}/pharmacy-bills/${bill._id}`, authHeader());
      setBills(prev => prev.filter(b => b._id !== bill._id));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete the bill.');
    }
  };

  // ---------- Payments ----------
  const openPayments = (bill) => {
    setPaymentBill(bill);
    setPayForm({ amount: bill.pendingAmount > 0 ? String(bill.pendingAmount) : '', date: todayISO(), note: '', account: '' });
    setPayError('');
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    const amount = Number(payForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) return setPayError('Please enter a valid amount.');
    if (amount > paymentBill.pendingAmount) return setPayError(`Amount cannot be more than the pending ${money(paymentBill.pendingAmount)}.`);
    if (!payForm.date) return setPayError('Please select the payment date.');
    if (!payForm.account) return setPayError('Please select the account the payment was made from.');

    setPaying(true);
    try {
      const res = await axios.post(`${API_URL}/pharmacy-bills/${paymentBill._id}/payments`, { ...payForm, amount }, authHeader());
      replaceBill(res.data);
      fetchBalances();
      // Payment ho gaya to popup band, table me Paid / Pending update dikh jata hai
      setPaymentBill(null);
      setPayError('');
    } catch (err) {
      setPayError(err.response?.data?.message || 'Could not add the payment.');
    } finally {
      setPaying(false);
    }
  };

  const handleRemovePayment = async (payment) => {
    const fromFinance = payment.expense ? ' It will also be removed from Payments & Finances.' : '';
    if (!window.confirm(`Remove payment of ${money(payment.amount)} on ${formatDisplayDate(payment.date)}?${fromFinance}`)) return;
    try {
      const res = await axios.delete(`${API_URL}/pharmacy-bills/${paymentBill._id}/payments/${payment._id}`, authHeader());
      replaceBill(res.data);
      fetchBalances();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not remove the payment.');
    }
  };

  // Bill ke payments pehle se aakhri tak (date, phir entry ka time)
  const paymentsInOrder = (bill) => [...(bill.payments || [])].sort((a, b) =>
    a.date.localeCompare(b.date) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));

  const paidInfoButton = (b) => (b.payments?.length > 0 && (
    <button type="button" className="pb-info-btn" title="Payment details" onClick={() => setPaidInfo(b)}>
      <InfoIcon size={14} />
    </button>
  ));

  // Medicine chips (naam × qty); zyada ho to "+N more" button popup kholta hai
  const medicineChips = (b) => {
    const list = billMedicines(b);
    if (!list.length) return <span className="pb-muted">-</span>;
    return (
      <div className="pb-med-chips">
        {list.slice(0, MED_PREVIEW).map((m, i) => (
          <span key={i} className="pb-med-chip" title={m.qty ? `${m.name} × ${m.qty}` : m.name}>
            <span className="pb-med-chip-name">{m.name}</span>
            {m.qty && <span className="pb-med-chip-qty">× {m.qty}</span>}
          </span>
        ))}
        {list.length > MED_PREVIEW && (
          <button type="button" className="pb-med-more" title="View all medicines" onClick={() => setMedInfo(b)}>
            +{list.length - MED_PREVIEW} more
          </button>
        )}
      </div>
    );
  };

  const statusBadge = (bill) => (
    <span className={`pb-status pb-status-${bill.paymentStatus}`}>
      {STATUS_LABEL[bill.paymentStatus]}
    </span>
  );

  return (
    <div className="task-page-container pharmacy-page">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h2>Pharmacy Bills</h2>
        </div>
        {perm('create') && activeTab === 'bills' && (
          <button type="button" onClick={openAddModal} className="crm-btn crm-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusIcon size={16} /> Add Bill
          </button>
        )}
      </div>

      {/* Teen hisse: Bills (add / payments), Medicine Stock (tracking) aur Medicines (master list) */}
      <div className="pb-page-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bills'}
            className={`pb-page-tab${activeTab === 'bills' ? ' active' : ''}`}
            onClick={() => {
              setActiveTab('bills');
              // Medicines tab me naya add / edit hua ho to bill popup ki list bhi taaza ho
              if (perm('stock-add')) fetchMedicines();
            }}
          >
            <WalletIcon size={16} />
            <span>Bills</span>
          </button>
          {perm('stock-tracking') && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'stock'}
            className={`pb-page-tab${activeTab === 'stock' ? ' active' : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            <PillIcon size={16} />
            <span>Medicine Stock</span>
          </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'medicines'}
            className={`pb-page-tab${activeTab === 'medicines' ? ' active' : ''}`}
            onClick={() => setActiveTab('medicines')}
          >
            <ClipboardListIcon size={16} />
            <span>Medicines</span>
          </button>
      </div>

      {activeTab === 'medicines' ? (
        <Medicines />
      ) : activeTab === 'stock' && perm('stock-tracking') ? (
        <MedicineStock />
      ) : (
      <>
      {/* Summary */}
      <div className="pb-summary">
        <div className="pb-summary-card">
          <span className="pb-summary-label">Total Billed</span>
          <strong>{money(totals.billed)}</strong>
          <small>{bills.length} bills</small>
        </div>
        <div className="pb-summary-card paid">
          <span className="pb-summary-label">Total Paid</span>
          <strong>{money(totals.paid)}</strong>
        </div>
        <div className="pb-summary-card pending">
          <span className="pb-summary-label">Total Pending</span>
          <strong>{money(totals.pending)}</strong>
          <small>{totals.pendingBills} bills pending</small>
        </div>
      </div>

      {/* Bills list */}
      <div className="pb-section">
        <div className="pb-section-head">
          <h3>All Bills</h3>
        </div>
        <div className="pb-filters">
          <div className="pb-search">
            <SearchIcon size={15} />
            <input
              type="text"
              placeholder="Search supplier, bill no. or medicine..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="pb-filter-select">
            <CustomSelect value={supplierFilter} onChange={setSupplierFilter} options={supplierOptions} />
          </div>
          <div className="pb-filter-select">
            <CustomSelect value={periodType} onChange={setPeriodType} options={PERIOD_OPTIONS} />
          </div>

          {/* Jo period type chuna, uska picker */}
          {periodType === 'month' && (
            <div className="pb-filter-select">
              <MonthYearPicker
                mode="month"
                value={`${periodYear}-${periodMonth}`}
                onChange={v => { setPeriodYear(v.slice(0, 4)); setPeriodMonth(v.slice(5, 7)); }}
              />
            </div>
          )}
          {periodType === 'year' && (
            <div className="pb-filter-select small">
              <MonthYearPicker mode="year" value={periodYear} onChange={setPeriodYear} />
            </div>
          )}
          {periodType === 'date' && (
            <div className="pb-filter-select">
              <CalendarPicker selectedDate={periodDate} onChange={setPeriodDate} placeholder="Select date" />
            </div>
          )}
          {periodType === 'range' && (
            <div className="pb-filter-select wide">
              <DateRangePicker
                startDate={periodRange.start}
                endDate={periodRange.end}
                onChange={setPeriodRange}
                placeholder="Select date range"
              />
            </div>
          )}
        </div>

        {/* Status slider */}
        <div className="pb-status-slider">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`pb-status-tab ${opt.value}${statusFilter === opt.value ? ' active' : ''}`}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
              <span className="pb-status-count">{statusCounts[opt.value] || 0}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="pb-empty">Loading bills...</div>
        ) : visibleBills.length === 0 ? (
          <div className="pb-empty">
            <PillIcon size={40} color="#cbd5e1" />
            <h4>{bills.length === 0 ? 'No bills added yet' : 'No bills match these filters'}</h4>
            {perm('create') && bills.length === 0 && (
              <button type="button" onClick={openAddModal} className="crm-btn crm-btn-primary">Add Bill</button>
            )}
          </div>
        ) : (
          <div className="pb-table-wrap">
            <table className="pb-table">
              <thead>
                <tr>
                  <th>Bill Date</th>
                  <th>Supplier / Pharma</th>
                  <th>Bill No.</th>
                  <th>Medicine</th>
                  <th className="num">Amount</th>
                  <th className="num">Paid</th>
                  <th className="num">Pending</th>
                  <th>Status</th>
                  <th className="center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleBills.map(b => (
                  <tr key={b._id}>
                    <td>
                      {formatDisplayDate(b.billDate)}
                      {b.dueDate && (
                        <div className={`pb-due ${isOverdue(b) ? 'overdue' : ''}`}>
                          {isOverdue(b) ? 'Overdue' : 'Due'} {formatDisplayDate(b.dueDate)}
                        </div>
                      )}
                    </td>
                    <td className="pb-strong">{b.supplierName}</td>
                    <td>{b.billNumber || '-'}</td>
                    <td className="pb-items">{medicineChips(b)}</td>
                    <td className="num">{money(b.totalAmount)}</td>
                    <td className="num pb-green">
                      <span className="pb-paid-cell">{money(b.paidAmount)}{paidInfoButton(b)}</span>
                    </td>
                    <td className={`num ${b.pendingAmount > 0 ? 'pb-red pb-strong' : 'pb-muted'}`}>{money(b.pendingAmount)}</td>
                    <td>{statusBadge(b)}</td>
                    <td className="center">
                      <div className="pb-actions">
                        <button type="button" className="pb-icon-btn pay" title="Payments" onClick={() => openPayments(b)}>
                          <WalletIcon size={15} />
                        </button>
                        {perm('edit') && (
                          <button type="button" className="pb-icon-btn edit" title="Edit Bill" onClick={() => openEditModal(b)}>
                            <EditIcon size={15} />
                          </button>
                        )}
                        {perm('delete') && (
                          <button type="button" className="pb-icon-btn delete" title="Delete Bill" onClick={() => handleDeleteBill(b)}>
                            <TrashIcon size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tablet / mobile: table ki jagah cards */}
        {!loading && visibleBills.length > 0 && (
          <div className="pb-cards">
            {visibleBills.map(b => (
              <div key={b._id} className={`pb-card ${b.paymentStatus}`}>
                <div className="pb-card-top">
                  <div className="pb-card-title">
                    <h4 title={b.supplierName}>{b.supplierName}</h4>
                    <span>
                      {formatDisplayDate(b.billDate)}
                      {b.billNumber && <> · #{b.billNumber}</>}
                    </span>
                  </div>
                  {statusBadge(b)}
                </div>

                {b.dueDate && (
                  <div className={`pb-due ${isOverdue(b) ? 'overdue' : ''}`}>
                    {isOverdue(b) ? 'Overdue' : 'Due'} {formatDisplayDate(b.dueDate)}
                  </div>
                )}

                {billMedicines(b).length > 0 && <div className="pb-card-meds">{medicineChips(b)}</div>}

                <div className="pb-card-amounts">
                  <div>
                    <span>Amount</span>
                    <strong>{money(b.totalAmount)}</strong>
                  </div>
                  <div>
                    <span>Paid</span>
                    <strong className="pb-green pb-paid-cell">{money(b.paidAmount)}{paidInfoButton(b)}</strong>
                  </div>
                  <div>
                    <span>Pending</span>
                    <strong className={b.pendingAmount > 0 ? 'pb-red' : 'pb-muted'}>{money(b.pendingAmount)}</strong>
                  </div>
                </div>

                <div className="pb-card-actions">
                  <button type="button" className="pb-card-btn pay" onClick={() => openPayments(b)}>
                    <WalletIcon size={14} /> Payments
                  </button>
                  {perm('edit') && (
                    <button type="button" className="pb-icon-btn edit" title="Edit Bill" onClick={() => openEditModal(b)}>
                      <EditIcon size={15} />
                    </button>
                  )}
                  {perm('delete') && (
                    <button type="button" className="pb-icon-btn delete" title="Delete Bill" onClick={() => handleDeleteBill(b)}>
                      <TrashIcon size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      )}

      {/* Add / Edit Bill popup */}
      {showBillModal && (
        <div className="modal-overlay" onClick={() => !saving && setShowBillModal(false)}>
          <div className="modal-content pb-modal" onClick={e => e.stopPropagation()} onScroll={() => setItemsOpen(false)}>
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Edit Bill' : 'Add Bill'}</h3>
              <button className="modal-close" onClick={() => setShowBillModal(false)} disabled={saving} aria-label="Close">
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveBill}>
              <div className="pb-form-grid">
                <div className="pb-field full">
                  <label>Supplier / Pharma Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Sun Pharma Distributors"
                    value={form.supplierName}
                    onChange={e => setField('supplierName', e.target.value)}
                    name="pb-supplier-name"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-form-type="other"
                    autoFocus
                  />
                </div>

                <div className="pb-field">
                  <label>Bill No.</label>
                  <input type="text" placeholder="e.g. INV-1024" value={form.billNumber} onChange={e => setField('billNumber', e.target.value)} />
                </div>

                <div className="pb-field">
                  <label>Bill Amount (₹) *</label>
                  <input type="number" min="0" step="0.01" placeholder="0" value={form.totalAmount} onChange={e => setField('totalAmount', e.target.value)} />
                </div>

                <div className="pb-field">
                  <label>Bill Date *</label>
                  <CalendarPicker
                    selectedDate={form.billDate}
                    onChange={d => setField('billDate', d)}
                    placeholder="Select Bill Date"
                    allowClear={false}
                    showPresets={false}
                  />
                </div>

                <div className="pb-field">
                  <label>Payment Due Date</label>
                  <CalendarPicker
                    selectedDate={form.dueDate}
                    onChange={d => setField('dueDate', d || '')}
                    placeholder="Optional"
                    showPresets={false}
                  />
                </div>

                {perm('stock-add') ? (
                  <div className="pb-field full">
                    <label>Medicines Received</label>
                    <div className="pb-stock-rows">
                      <div className="pb-stock-row pb-stock-row-head">
                        <span>Category</span>
                        <span>Medicine</span>
                        <span>Quantity</span>
                        <span></span>
                      </div>
                      {form.stockRows.map(row => (
                        <div key={row.rowId} className="pb-stock-row">
                          <CustomSelect
                            value={row.category}
                            onChange={v => updateStockRow(row.rowId, {
                              category: v,
                              // Category badli aur chuni medicine us category ki nahi to hata do
                              medicine: row.medicine && row.medicine !== OTHER_MED && v !== 'all'
                                && (medicines.find(m => m._id === row.medicine)?.category || 'Other') !== v ? '' : row.medicine
                            })}
                            options={categorySelectOptions}
                          />
                          <div className="pb-stock-med">
                            <CustomSelect
                              value={row.medicine}
                              onChange={v => updateStockRow(row.rowId, { medicine: v })}
                              options={medicineOptionsFor(row)}
                            />
                            {row.medicine === OTHER_MED && (
                              <input
                                type="text"
                                placeholder="Type medicine name"
                                value={row.name}
                                onChange={e => updateStockRow(row.rowId, { name: e.target.value })}
                              />
                            )}
                          </div>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Qty"
                            value={row.qty}
                            onChange={e => updateStockRow(row.rowId, { qty: e.target.value })}
                          />
                          <button
                            type="button"
                            className="pb-icon-btn delete"
                            title="Remove row"
                            onClick={() => removeStockRow(row.rowId)}
                          >
                            <XIcon size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="pb-stock-footer">
                      <button type="button" className="pb-add-row-btn" onClick={addStockRow}>
                        <PlusIcon size={14} /> Add Medicine
                      </button>
                      {totalStockQty > 0 && (
                        <span className="pb-stock-total">
                          {form.stockRows.filter(r => Number(r.qty) > 0).length} medicines · {totalStockQty} units
                        </span>
                      )}
                    </div>
                    {editingId && form.items && !bills.find(b => b._id === editingId)?.stockItems?.length && (
                      <div className="pb-stock-old">Old items (text): {form.items}</div>
                    )}
                  </div>
                ) : (
                <div className="pb-field full">
                  <label>Items Received</label>
                  {/* Ek hi field: item chunne / Enter dabane par comma ke saath jud jata hai */}
                  <div className="pb-combo">
                    <textarea
                      ref={itemsRef}
                      rows="3"
                      className="pb-items-input"
                      placeholder={itemSuggestions.length ? 'Select or type items, comma se alag karein' : 'e.g. Paracetamol, Crocin, Dolo 650'}
                      value={form.items}
                      onChange={e => { setField('items', e.target.value); openItemsMenu(); }}
                      onFocus={openItemsMenu}
                      onBlur={() => setItemsOpen(false)}
                      onScroll={() => setItemsOpen(false)}
                      onKeyDown={e => {
                        if (e.key === 'Escape') setItemsOpen(false);
                        // Enter = current item ke baad comma
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (currentItemToken(form.items)) setField('items', appendItem(form.items, ''));
                        }
                      }}
                    />
                    {itemSuggestions.length > 0 && (
                      <button
                        type="button"
                        className="pb-combo-toggle"
                        tabIndex={-1}
                        onMouseDown={e => {
                          e.preventDefault();
                          if (itemsOpen) setItemsOpen(false);
                          else { itemsRef.current?.focus(); openItemsMenu(); }
                        }}
                        aria-label="Show items"
                      >▾</button>
                    )}
                  </div>

                  {/* Suggestion menu body me render hota hai taaki popup ke scroll me kat na jaye */}
                  {itemsOpen && (() => {
                    const q = currentItemToken(form.items).toLowerCase();
                    const added = splitItems(form.items).map(s => s.toLowerCase());
                    const matches = itemSuggestions.filter(s => {
                      const key = s.name.toLowerCase();
                      return key.includes(q) && !added.includes(key);
                    });
                    if (!matches.length) return null;
                    return createPortal(
                      <div className="pb-combo-menu pb-combo-menu-floating" style={itemMenuPos}>
                        {matches.map(s => (
                          <div
                            key={s.name}
                            className="pb-combo-option"
                            onMouseDown={e => { e.preventDefault(); setField('items', appendItem(form.items, s.name)); }}
                          >
                            <span>{s.name}</span>
                            <span className="pb-combo-meta">{s.count} bill{s.count > 1 ? 's' : ''}</span>
                          </div>
                        ))}
                      </div>,
                      document.body
                    );
                  })()}
                </div>
                )}

                {!editingId && (
                  <>
                    <div className="pb-field">
                      <label>Amount Paid Now (₹)</label>
                      <input type="number" min="0" step="0.01" placeholder="0 if not paid yet" value={form.paidAmount} onChange={e => setField('paidAmount', e.target.value)} autoComplete="off" />
                    </div>
                    <div className="pb-field">
                      <label>Paid From</label>
                      <CustomSelect value={form.paidFrom} onChange={v => setField('paidFrom', v)} options={accountOptions} placeholder="Cash / Bank" />
                    </div>
                    {balanceNote(form.paidFrom, form.paidAmount) && (
                      <div className="pb-field full">{balanceNote(form.paidFrom, form.paidAmount)}</div>
                    )}
                    {Number(form.totalAmount) > 0 && (
                      <div className="pb-field full">
                        <div className="pb-pending-preview">
                          {Number(form.paidAmount) > 0 && (
                            <>Paid now: <strong className="pb-green">{money(form.paidAmount)}</strong>{form.paidFrom ? ` from ${form.paidFrom}` : ''} · </>
                          )}
                          Pending after save: <strong>{money(Math.max(0, Number(form.totalAmount) - Number(form.paidAmount || 0)))}</strong>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="pb-field full">
                  <label>Notes</label>
                  <input type="text" placeholder="Optional" value={form.notes} onChange={e => setField('notes', e.target.value)} />
                </div>
              </div>

              {formError && <div className="pb-form-error">{formError}</div>}

              <div className="modal-footer" style={{ marginTop: '16px' }}>
                <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setShowBillModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="crm-btn crm-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payments popup */}
      {paymentBill && (
        <div className="modal-overlay" onClick={() => !paying && setPaymentBill(null)}>
          <div className="modal-content pb-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Payments</h3>
              <button className="modal-close" onClick={() => setPaymentBill(null)} disabled={paying} aria-label="Close">
                <XIcon size={16} />
              </button>
            </div>

            <div className="pb-bill-info">
              <div>
                <div className="pb-strong">{paymentBill.supplierName}</div>
                <div className="pb-muted">
                  {paymentBill.billNumber ? `Bill ${paymentBill.billNumber} · ` : ''}{formatDisplayDate(paymentBill.billDate)}
                </div>
              </div>
              {statusBadge(paymentBill)}
            </div>

            <div className="pb-amount-row">
              <div><span>Bill Amount</span><strong>{money(paymentBill.totalAmount)}</strong></div>
              <div><span>Paid</span><strong className="pb-green">{money(paymentBill.paidAmount)}</strong></div>
              <div><span>Pending</span><strong className={paymentBill.pendingAmount > 0 ? 'pb-red' : 'pb-muted'}>{money(paymentBill.pendingAmount)}</strong></div>
            </div>

            <div className="pb-history-title">Payment History</div>
            {paymentBill.payments.length === 0 ? (
              <div className="pb-empty-small">No payment made yet.</div>
            ) : (
              <ul className="pb-history">
                {paymentBill.payments.map(p => (
                  <li key={p._id}>
                    <div>
                      <strong>{money(p.amount)}</strong>
                      <span className="pb-muted"> · {formatDisplayDate(p.date)}</span>
                      {p.account && <span className="pb-pay-account"> · {p.account}</span>}
                      {p.note && <div className="pb-muted pb-note">{p.note}</div>}
                    </div>
                    {perm('payment') && (
                      <button type="button" className="pb-icon-btn delete" title="Remove payment" onClick={() => handleRemovePayment(p)}>
                        <XIcon size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {perm('payment') && paymentBill.pendingAmount > 0 && (
              <form className="pb-pay-form" onSubmit={handleAddPayment}>
                <div className="pb-history-title">Add Payment</div>
                <div className="pb-form-grid">
                  <div className="pb-field">
                    <label>Amount (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={payForm.amount}
                      onChange={e => { setPayForm({ ...payForm, amount: e.target.value }); setPayError(''); }}
                    />
                  </div>
                  <div className="pb-field">
                    <label>Payment Date *</label>
                    <CalendarPicker
                      selectedDate={payForm.date}
                      onChange={d => { setPayForm({ ...payForm, date: d }); setPayError(''); }}
                      allowClear={false}
                      showPresets={false}
                      openUp={true}
                    />
                  </div>
                  <div className="pb-field full">
                    <label>Paid From *</label>
                    <CustomSelect
                      value={payForm.account}
                      onChange={v => { setPayForm({ ...payForm, account: v }); setPayError(''); }}
                      options={accountOptions}
                      placeholder="Select bank / cash"
                    />
                    {balanceNote(payForm.account, payForm.amount)}
                  </div>
                  <div className="pb-field full">
                    <label>Note</label>
                    <input type="text" placeholder="Optional" value={payForm.note} onChange={e => setPayForm({ ...payForm, note: e.target.value })} />
                  </div>
                </div>
                {payError && <div className="pb-form-error">{payError}</div>}
                <div className="modal-footer" style={{ marginTop: '14px' }}>
                  <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setPaymentBill(null)} disabled={paying}>Close</button>
                  <button type="submit" className="crm-btn crm-btn-primary" disabled={paying}>
                    {paying ? 'Saving...' : 'Add Payment'}
                  </button>
                </div>
              </form>
            )}

            {!(perm('payment') && paymentBill.pendingAmount > 0) && (
              <div className="modal-footer" style={{ marginTop: '16px' }}>
                <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setPaymentBill(null)}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
      {medInfo && (() => {
        const bill = medInfo;
        const list = billMedicines(bill);
        const totalQty = list.reduce((sum, m) => sum + (m.qty || 0), 0);
        return (
          <div className="modal-overlay" onClick={() => setMedInfo(null)}>
            <div className="modal-content pb-pi-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Medicines</h3>
                  <div className="pb-pi-sub">
                    <strong>{bill.supplierName}</strong>
                    {bill.billNumber && <> · Bill {bill.billNumber}</>}
                    {' · '}{formatDisplayDate(bill.billDate)}
                  </div>
                </div>
                <button className="modal-close" onClick={() => setMedInfo(null)} aria-label="Close">
                  <XIcon size={16} />
                </button>
              </div>

              <div className="pb-pi-heading">
                All Medicines <span>({list.length}{totalQty > 0 ? ` · ${totalQty} units` : ''})</span>
              </div>
              <div className="pb-med-list">
                {list.map((m, i) => (
                  <div key={i} className="pb-med-row">
                    <span className="pb-med-row-no">{i + 1}</span>
                    <span className="pb-med-row-name">{m.name}</span>
                    {m.qty && <strong className="pb-med-row-qty">× {m.qty}</strong>}
                  </div>
                ))}
              </div>

              <div className="modal-footer">
                <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setMedInfo(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
      {paidInfo && (() => {
        const bill = paidInfo;
        const list = paymentsInOrder(bill);
        const percent = bill.totalAmount > 0 ? Math.min(100, Math.round((bill.paidAmount / bill.totalAmount) * 100)) : 100;
        const accountClass = (acc) => ({ 'Cash': 'cash', 'Company Bank': 'company', 'Personal Bank': 'personal' }[acc] || 'none');
        return (
          <div className="modal-overlay" onClick={() => setPaidInfo(null)}>
            <div className="modal-content pb-pi-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Payment Details</h3>
                  <div className="pb-pi-sub">
                    <strong>{bill.supplierName}</strong>
                    {bill.billNumber && <> · Bill {bill.billNumber}</>}
                    {' · '}{formatDisplayDate(bill.billDate)}
                  </div>
                </div>
                <button className="modal-close" onClick={() => setPaidInfo(null)} aria-label="Close">
                  <XIcon size={16} />
                </button>
              </div>

              <div className="pb-pi-summary">
                <div className="pb-pi-card">
                  <span>Bill Amount</span>
                  <strong>{money(bill.totalAmount)}</strong>
                </div>
                <div className="pb-pi-card paid">
                  <span>Total Paid</span>
                  <strong>{money(bill.paidAmount)}</strong>
                </div>
                <div className={`pb-pi-card ${bill.pendingAmount > 0 ? 'pending' : 'clear'}`}>
                  <span>Pending</span>
                  <strong>{money(bill.pendingAmount)}</strong>
                </div>
              </div>

              <div className="pb-pi-progress">
                <div className="pb-pi-progress-bar"><div style={{ width: `${percent}%` }} /></div>
                <span>{percent}% paid · {statusBadge(bill)}</span>
              </div>

              <div className="pb-pi-heading">
                All Payments <span>({list.length})</span>
              </div>
              <div className="pb-pi-timeline">
                {list.map((pay, i) => (
                  <div key={pay._id} className="pb-pi-row">
                    <div className="pb-pi-dot">{i + 1}</div>
                    <div className="pb-pi-body">
                      <div className="pb-pi-top">
                        <span className="pb-pi-date">{formatDisplayDate(pay.date)}</span>
                        <strong className="pb-pi-amount">{money(pay.amount)}</strong>
                      </div>
                      <div className="pb-pi-meta">
                        <span className={`pb-pi-account ${accountClass(pay.account)}`}>{pay.account || 'Account not set'}</span>
                        {pay.note && <span className="pb-pi-note">{pay.note}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-footer">
                <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setPaidInfo(null)}>Close</button>
                {perm('payment') && bill.pendingAmount > 0 && (
                  <button type="button" className="crm-btn crm-btn-primary" onClick={() => { setPaidInfo(null); openPayments(bill); }}>
                    Add Payment
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default PharmacyBills;
