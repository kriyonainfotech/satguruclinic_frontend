import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { SearchIcon, PillIcon, EyeIcon, XIcon, PlusIcon, TrashIcon, InfoIcon } from './Icons';
import CustomSelect from './CustomSelect';
import CalendarPicker, { formatDisplayDate, formatDateToISO } from './CalendarPicker';
import usePermissions from '../permissions/usePermissions';

// Pharmacy Bills -> "Medicine Stock" tab.
// Upar Today / This Week / This Month chuno: us period ki bikri (pichhle period se tulna ke saath)
// aur neeche saari medicines ki list.
const LOW_STOCK = 10; // itni ya kam bachi ho to "Low Stock"

const PERIODS = [
  { value: 'today', label: 'Today', prev: 'yesterday' },
  { value: 'week', label: 'This Week', prev: 'last week' },
  { value: 'month', label: 'This Month', prev: 'last month' }
];

const STOCK_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'in', label: 'In Stock' },
  { value: 'low', label: 'Low Stock' },
  { value: 'out', label: 'Out of Stock' }
];

const stockStatus = (r) => {
  if (r.received === 0 && r.sold === 0) return 'none';
  if (r.inStock <= 0) return 'out';
  if (r.inStock <= LOW_STOCK) return 'low';
  return 'in';
};

const STATUS_TEXT = { in: 'In Stock', low: 'Low Stock', out: 'Out of Stock', none: 'No Entry' };

const ROLE_LABEL = { superadmin: 'Super Admin', admin: 'Admin', team: 'Team' };

// Manual entry popup ki medicine row (Pharmacy Bill jaisi): category -> medicine (ya OTHER_MED pe naam type) -> qty
const OTHER_MED = '__other';
let manualRowSeq = 0;
const emptyManualRow = () => ({ rowId: ++manualRowSeq, category: 'all', medicine: '', name: '', qty: '' });
const emptyManualForm = () => ({
  date: formatDateToISO(new Date()),
  reason: 'Sold manually',
  person: '',
  note: '',
  rows: [emptyManualRow()]
});

// ---------- Period helpers ----------
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// offset 0 = abhi wala period, 1 = pichhla (kal / pichhla hafta / pichhla mahina)
const periodRange = (period, offset = 0) => {
  const today = dayStart(new Date());
  if (period === 'today') {
    const start = new Date(today);
    start.setDate(start.getDate() - offset);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  if (period === 'week') {
    const start = new Date(today);
    start.setDate(start.getDate() - ((today.getDay() + 6) % 7) - 7 * offset); // Monday se
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }
  const start = new Date(today.getFullYear(), today.getMonth() - offset, 1);
  const end = new Date(today.getFullYear(), today.getMonth() - offset + 1, 1);
  return { start, end };
};

const periodSubtitle = (period) => {
  const { start, end } = periodRange(period);
  if (period === 'today') return start.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  if (period === 'week') {
    const last = new Date(end);
    last.setDate(last.getDate() - 1);
    const f = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return `${f(start)} – ${f(last)} (Mon – Sun)`;
  }
  return start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const formatDateTime = (iso) => new Date(iso).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
});

// Naam + role badge (Team / Admin / Super Admin)
const ByCell = ({ name, role }) => (
  <span className="ms-by">
    <span>{name || 'Unknown'}</span>
    {role && <span className={`ms-role ms-role-${role}`}>{ROLE_LABEL[role] || role}</span>}
  </span>
);

// "+4 vs yesterday" (bikri badhna achha = green, ghatna = red; text ke saath arrow, sirf rang nahi)
const Delta = ({ current, previous, prevLabel }) => {
  const diff = current - previous;
  if (diff === 0) return <span className="ms2-delta flat">Same as {prevLabel}</span>;
  return (
    <span className={`ms2-delta ${diff > 0 ? 'up' : 'down'}`}>
      {diff > 0 ? '▲' : '▼'} {Math.abs(diff)} vs {prevLabel}
    </span>
  );
};

const MedicineStock = () => {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  const { can } = usePermissions();
  const canManual = can('pharmacy-bills:stock-manual');
  const [rows, setRows] = useState([]);
  const [events, setEvents] = useState({ sold: [], received: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('today');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  // View popup: kis medicine ki history, aur uska data
  const [viewRow, setViewRow] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState('');
  const [soldPeriod, setSoldPeriod] = useState('all');
  // Manual entries (Sale Entry ke bina nikali medicine)
  const [outs, setOuts] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState(emptyManualForm());
  const [manualError, setManualError] = useState('');
  const [savingManual, setSavingManual] = useState(false);
  // Info icon se khulne wali manual entries ki list (period: today / week / month / all)
  const [showOuts, setShowOuts] = useState(false);
  const [outsPeriod, setOutsPeriod] = useState('today');

  useEffect(() => {
    fetchStock();
    fetchOuts();
  }, []);

  const fetchOuts = async () => {
    try {
      const res = await axios.get(`${API_URL}/pharmacy-bills/stock-outs`, authHeader());
      setOuts(res.data?.entries || []);
      setReasons(res.data?.reasons || []);
    } catch (err) {
      console.error('Error fetching manual entries', err);
    }
  };

  const openManual = async () => {
    setManualForm(emptyManualForm());
    setManualError('');
    setShowManual(true);
    if (medicines.length === 0) {
      try {
        const res = await axios.get(`${API_URL}/medicines`, authHeader());
        setMedicines(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Error fetching medicines', err);
      }
    }
  };

  const medCategories = useMemo(() => [...new Set(medicines.map(m => m.category || 'Other'))].sort(), [medicines]);
  const medOptionsFor = (row) => [
    { value: '', label: 'Select medicine' },
    ...medicines
      .filter(m => row.category === 'all' || (m.category || 'Other') === row.category)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(m => ({ value: m._id, label: m.name })),
    { value: OTHER_MED, label: '+ Other (type name)' }
  ];
  const updateManualRow = (rowId, changes) => {
    setManualForm(prev => ({ ...prev, rows: prev.rows.map(r => (r.rowId === rowId ? { ...r, ...changes } : r)) }));
    setManualError('');
  };
  const manualRowName = (row) => (row.medicine === OTHER_MED ? row.name.trim() : medicines.find(m => m._id === row.medicine)?.name || '');

  const saveManual = async (e) => {
    e.preventDefault();
    if (!manualForm.date) return setManualError('Please select the date.');
    const items = [];
    for (const row of manualForm.rows) {
      if (!row.medicine && !row.name.trim() && !row.qty) continue;
      const name = manualRowName(row);
      if (!name) return setManualError('Please select or type the medicine name in every row.');
      const qty = Number(row.qty);
      if (!Number.isFinite(qty) || qty <= 0) return setManualError(`Please enter the quantity for ${name}.`);
      const med = row.medicine !== OTHER_MED ? medicines.find(m => m._id === row.medicine) : null;
      items.push({ medicine: med ? med._id : null, name, category: med ? (med.category || '') : (row.category === 'all' ? '' : row.category), qty: Math.round(qty) });
    }
    if (!items.length) return setManualError('Please add at least one medicine.');

    setSavingManual(true);
    try {
      await axios.post(`${API_URL}/pharmacy-bills/stock-outs`, {
        date: manualForm.date,
        reason: manualForm.reason,
        person: manualForm.person.trim(),
        note: manualForm.note.trim(),
        items
      }, authHeader());
      setShowManual(false);
      fetchStock();
      fetchOuts();
    } catch (err) {
      setManualError(err.response?.data?.message || 'Could not save the entry.');
    } finally {
      setSavingManual(false);
    }
  };

  const deleteOut = async (o) => {
    const what = o.items.map(i => `${i.name} x ${i.qty}`).join(', ');
    if (!window.confirm(`Delete this manual entry (${what})? The quantity will be added back to stock.`)) return;
    try {
      await axios.delete(`${API_URL}/pharmacy-bills/stock-outs/${o._id}`, authHeader());
      fetchStock();
      fetchOuts();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete the entry.');
    }
  };

  const fetchStock = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/pharmacy-bills/stock`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRows(res.data?.rows || []);
      setEvents(res.data?.events || { sold: [], received: [] });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load medicine stock.');
    } finally {
      setLoading(false);
    }
  };

  const openView = async (row) => {
    setViewRow(row);
    setHistory(null);
    setHistoryError('');
    setSoldPeriod(period);
    try {
      const res = await axios.get(`${API_URL}/pharmacy-bills/stock/history`, {
        params: { key: row.key },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setHistory(res.data);
    } catch (err) {
      setHistoryError(err.response?.data?.message || 'Could not load history.');
    }
  };

  const periodInfo = PERIODS.find(p => p.value === period);
  const rowByKey = useMemo(() => Object.fromEntries(rows.map(r => [r.key, r])), [rows]);

  // Chuna hua period (aur pichhla) - events se sab ginti
  const stats = useMemo(() => {
    const calc = (offset) => {
      const { start, end } = periodRange(period, offset);
      const sold = events.sold.filter(e => { const d = new Date(e.at); return d >= start && d < end; });
      const received = events.received.filter(e => { const d = new Date(e.date + 'T00:00:00'); return d >= start && d < end; });
      const perMed = {};
      sold.forEach(e => { perMed[e.key] = (perMed[e.key] || 0) + e.qty; });
      return {
        start,
        sold,
        units: sold.reduce((sum, e) => sum + e.qty, 0),
        entries: new Set(sold.map(e => String(e.invoiceId))).size,
        medicines: Object.keys(perMed).length,
        received: received.reduce((sum, e) => sum + e.qty, 0),
        perMed
      };
    };
    return { current: calc(0), previous: calc(1) };
  }, [events, period]);

  // Clinic me abhi kitni units bachi (sab medicines)
  const unitsInClinic = rows.reduce((sum, r) => sum + Math.max(0, r.inStock), 0);

  // ---------- Neeche ki list ----------
  const categoryOptions = useMemo(() => {
    const cats = [...new Set(rows.map(r => r.category || 'Other'))].sort();
    return [{ value: 'all', label: 'All Categories' }, ...cats.map(c => ({ value: c, label: c }))];
  }, [rows]);

  const baseRows = rows.filter(r => {
    if (category !== 'all' && (r.category || 'Other') !== category) return false;
    const q = search.trim().toLowerCase();
    return !q || r.name.toLowerCase().includes(q);
  });
  const counts = baseRows.reduce((acc, r) => {
    const s = stockStatus(r);
    if (s !== 'none') acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, { all: baseRows.length });
  const visibleRows = (stockFilter === 'all' ? baseRows : baseRows.filter(r => stockStatus(r) === stockFilter))
    // Is period me jo zyada biki wo upar
    .slice()
    .sort((a, b) => (stats.current.perMed[b.key] || 0) - (stats.current.perMed[a.key] || 0) || a.name.localeCompare(b.name));

  const soldFrom = soldPeriod === 'all' ? null : periodRange(soldPeriod).start;
  const visibleSold = (history?.sold || []).filter(s => !soldFrom || new Date(s.at) >= soldFrom);

  if (loading) return <div className="pb-section"><div className="pb-empty">Loading stock...</div></div>;
  if (error) return <div className="pb-section"><div className="pb-empty"><h4>{error}</h4></div></div>;

  const inStockCount = rows.filter(r => r.inStock > 0).length;
  const periodWord = period === 'today' ? 'today' : `this ${period}`;
  const outsInPeriod = (p) => {
    if (p === 'all') return outs;
    const { start, end } = periodRange(p);
    return outs.filter(o => { const d = new Date(o.at); return d >= start && d < end; });
  };
  const periodOuts = outsInPeriod(period);
  const listedOuts = outsInPeriod(outsPeriod);

  return (
    <div className="ms2">
      {/* Toolbar: period + date + Manual Entry */}
      <div className="ms2-toolbar">
        <div className="ms2-seg" role="tablist">
          {PERIODS.map(p => (
            <button
              key={p.value}
              type="button"
              role="tab"
              aria-selected={period === p.value}
              className={`ms2-seg-btn${period === p.value ? ' active' : ''}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="ms2-toolbar-date">{periodSubtitle(period)}</span>
        <div className="ms2-toolbar-actions">
          {canManual && (
            <button type="button" className="ms2-btn-primary" onClick={openManual}>
              <PlusIcon size={14} /> Manual Entry
            </button>
          )}
          <button
            type="button"
            className="ms2-info-btn"
            title="Manual entries list"
            aria-label="Manual entries list"
            onClick={() => { setOutsPeriod(period); setShowOuts(true); }}
          >
            <InfoIcon size={16} />
            {periodOuts.length > 0 && <span className="ms2-info-count">{periodOuts.length}</span>}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="ms2-kpis">
        <div className="ms2-kpi">
          <span className="ms2-kpi-label">Units sold</span>
          <div className="ms2-kpi-row">
            <strong>{stats.current.units}</strong>
            <Delta current={stats.current.units} previous={stats.previous.units} prevLabel={periodInfo.prev} />
          </div>
        </div>
        <div className="ms2-kpi">
          <span className="ms2-kpi-label">Sale entries</span>
          <div className="ms2-kpi-row">
            <strong>{stats.current.entries}</strong>
            <small>{stats.previous.entries} {periodInfo.prev}</small>
          </div>
        </div>
        <div className="ms2-kpi">
          <span className="ms2-kpi-label">Medicines sold</span>
          <div className="ms2-kpi-row">
            <strong>{stats.current.medicines}</strong>
            <small>different</small>
          </div>
        </div>
        <div className="ms2-kpi">
          <span className="ms2-kpi-label">Units received</span>
          <div className="ms2-kpi-row">
            <strong>{stats.current.received}</strong>
            <small>from bills</small>
          </div>
        </div>
        <div className="ms2-kpi">
          <span className="ms2-kpi-label">In clinic now</span>
          <div className="ms2-kpi-row">
            <strong>{unitsInClinic}</strong>
            <small>{inStockCount} {inStockCount === 1 ? 'medicine' : 'medicines'}</small>
          </div>
        </div>
      </div>

      {/* All medicines */}
      <section className="ms2-card ms2-table-card">
        <header className="ms2-table-head">
          <div>
            <h3>All medicines</h3>
            <span>Received from pharmacy bills · Sold from sale & manual entries</span>
          </div>
          <div className="ms2-table-tools">
            <div className="ms2-search">
              <SearchIcon size={14} />
              <input type="text" placeholder="Search medicine" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="ms2-cat-select">
              <CustomSelect value={category} onChange={setCategory} options={categoryOptions} />
            </div>
          </div>
        </header>

        <div className="ms2-filter-row">
          {STOCK_FILTERS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`ms2-filter-btn${stockFilter === opt.value ? ' active' : ''}`}
              onClick={() => setStockFilter(opt.value)}
            >
              {opt.label} <span>{counts[opt.value] || 0}</span>
            </button>
          ))}
        </div>

        {visibleRows.length === 0 ? (
          <div className="ms2-table-empty">
            <PillIcon size={32} color="#cbd5e1" />
            <span>{rows.length === 0 ? 'No medicines yet. Add medicine quantity in a pharmacy bill.' : 'No medicines match these filters'}</span>
          </div>
        ) : (
          <div className="ms2-table" role="table">
            <div className="ms2-tr ms2-thead" role="row">
              <span role="columnheader">Medicine</span>
              <span role="columnheader">In clinic</span>
              <span role="columnheader">Status</span>
              {PERIODS.map(p => (
                <span key={p.value} role="columnheader" className={`num${p.value === period ? ' active' : ''}`}>{p.label}</span>
              ))}
              <span role="columnheader" className="num">Received</span>
              <span role="columnheader" aria-label="View"></span>
            </div>
            {visibleRows.map(r => {
              const status = stockStatus(r);
              const fill = r.received > 0 ? Math.max(0, Math.min(1, r.inStock / r.received)) : 0;
              const soldBy = { today: r.soldToday, week: r.soldWeek, month: r.soldMonth };
              return (
                <div key={r.key} className="ms2-tr" role="row">
                  <div className="ms2-td-name" role="cell">
                    <span className="ms2-med-name">{r.name}</span>
                    <span className="ms2-med-sub">{r.category || 'Other'}{r.lastReceived ? ` · last in ${formatDisplayDate(r.lastReceived)}` : ''}</span>
                  </div>
                  <div className="ms2-td-stock" role="cell">
                    <strong>{r.inStock}</strong>
                    <div className={`ms2-meter ${status}`}><div style={{ width: `${fill * 100}%` }} /></div>
                  </div>
                  <div role="cell">
                    <span className={`ms2-pill ${status}`}>{STATUS_TEXT[status]}</span>
                  </div>
                  {PERIODS.map(p => (
                    <div key={p.value} role="cell" data-label={p.label} className={`num ms2-td-period${p.value === period ? ' active' : ''}`}>
                      {soldBy[p.value] || <span className="ms2-zero">0</span>}
                    </div>
                  ))}
                  <div role="cell" data-label="Received" className="num ms2-td-period">{r.received}</div>
                  <div role="cell" className="ms2-td-action">
                    <button type="button" className="ms2-view-btn" title="View details" onClick={() => openView(r)}>
                      <EyeIcon size={14} /> <span>View</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {rows.some(r => r.inStock < 0) && (
          <p className="ms-note">
            Negative stock means more was sold than added in pharmacy bills. Add the missing quantity in a bill to fix it.
          </p>
        )}
      </section>

      {/* Manual entries list (info icon) */}
      {showOuts && (
        <div className="modal-overlay" onClick={() => setShowOuts(false)}>
          <div className="modal-content pb-modal ms-view-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Manual entries</h3>
                <div className="ms-category">Medicines sold or given without a Sale Entry</div>
              </div>
              <button className="modal-close" onClick={() => setShowOuts(false)} aria-label="Close">
                <XIcon size={16} />
              </button>
            </div>

            <div className="ms-view-head">
              <div className="pb-history-title">
                {listedOuts.length} {listedOuts.length === 1 ? 'entry' : 'entries'} · {listedOuts.reduce((sum, o) => sum + o.items.reduce((s2, i) => s2 + i.qty, 0), 0)} units
              </div>
              <div className="pb-status-slider ms-period-tabs">
                {[...PERIODS, { value: 'all', label: 'All' }].map(p => (
                  <button
                    key={p.value}
                    type="button"
                    className={`pb-status-tab${outsPeriod === p.value ? ' active' : ''}`}
                    onClick={() => setOutsPeriod(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {listedOuts.length === 0 ? (
              <div className="pb-empty-small">
                No manual entry {outsPeriod === 'all' ? 'yet' : outsPeriod === 'today' ? 'today' : `this ${outsPeriod}`}.
              </div>
            ) : (
              <div className="ms2 ms2-outs-wrap">
                <ul className="ms2-outs">
                  {listedOuts.map(o => (
                    <li key={o._id}>
                      <div className="ms2-out-main">
                        <div className="ms2-out-items">
                          {o.items.map((i, idx) => (
                            <span key={idx}>{i.name} <strong>× {i.qty}</strong></span>
                          ))}
                        </div>
                        <div className="ms2-out-meta">
                          <span className="ms2-reason">{o.reason}</span>
                          {o.person && <span>To <strong>{o.person}</strong></span>}
                          <span>{formatDateTime(o.at)}</span>
                          <ByCell name={o.createdBy?.name} role={o.createdBy?.role} />
                        </div>
                        {o.note && <div className="ms-category">{o.note}</div>}
                      </div>
                      {canManual && (
                        <button type="button" className="pb-icon-btn delete" title="Delete entry" onClick={() => deleteOut(o)}>
                          <TrashIcon size={14} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="modal-footer" style={{ marginTop: '16px' }}>
              <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setShowOuts(false)}>Close</button>
              {canManual && (
                <button type="button" className="crm-btn crm-btn-primary" onClick={() => { setShowOuts(false); openManual(); }}>
                  Add Manual Entry
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry popup */}
      {showManual && (
        <div className="modal-overlay" onClick={() => !savingManual && setShowManual(false)}>
          <div className="modal-content pb-modal ms-view-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Manual Entry</h3>
                <div className="ms-category">Medicine sold or given without a Sale Entry. It will be removed from stock.</div>
              </div>
              <button className="modal-close" onClick={() => setShowManual(false)} disabled={savingManual} aria-label="Close">
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={saveManual}>
              <div className="pb-form-grid">
                <div className="pb-field">
                  <label>Reason *</label>
                  <CustomSelect
                    value={manualForm.reason}
                    onChange={v => setManualForm(prev => ({ ...prev, reason: v }))}
                    options={(reasons.length ? reasons : ['Sold manually', 'Other']).map(r => ({ value: r, label: r }))}
                  />
                </div>
                <div className="pb-field">
                  <label>Date *</label>
                  <CalendarPicker
                    selectedDate={manualForm.date}
                    onChange={d => setManualForm(prev => ({ ...prev, date: d }))}
                    allowClear={false}
                    showPresets={false}
                    maxDate={formatDateToISO(new Date())}
                  />
                </div>
                <div className="pb-field full">
                  <label>{manualForm.reason === 'Sold manually' ? 'Sold To (Patient / Person)' : 'Given To'}</label>
                  <input
                    type="text"
                    placeholder="Optional - name of patient / person"
                    value={manualForm.person}
                    onChange={e => setManualForm(prev => ({ ...prev, person: e.target.value }))}
                  />
                </div>

                <div className="pb-field full">
                  <label>Medicines *</label>
                  <div className="pb-stock-rows">
                    <div className="pb-stock-row pb-stock-row-head">
                      <span>Category</span>
                      <span>Medicine</span>
                      <span>Quantity</span>
                      <span></span>
                    </div>
                    {manualForm.rows.map(row => {
                      const inClinic = row.medicine && row.medicine !== OTHER_MED ? rowByKey[row.medicine]?.inStock : undefined;
                      const tooMany = inClinic !== undefined && Number(row.qty) > inClinic;
                      return (
                        <div key={row.rowId} className="pb-stock-row">
                          <CustomSelect
                            value={row.category}
                            onChange={v => updateManualRow(row.rowId, {
                              category: v,
                              medicine: row.medicine && row.medicine !== OTHER_MED && v !== 'all'
                                && (medicines.find(m => m._id === row.medicine)?.category || 'Other') !== v ? '' : row.medicine
                            })}
                            options={[{ value: 'all', label: 'All Categories' }, ...medCategories.map(c => ({ value: c, label: c }))]}
                          />
                          <div className="pb-stock-med">
                            <CustomSelect
                              value={row.medicine}
                              onChange={v => updateManualRow(row.rowId, { medicine: v })}
                              options={medOptionsFor(row)}
                            />
                            {row.medicine === OTHER_MED && (
                              <input
                                type="text"
                                placeholder="Type medicine name"
                                value={row.name}
                                onChange={e => updateManualRow(row.rowId, { name: e.target.value })}
                              />
                            )}
                            {inClinic !== undefined && (
                              <span className={`ms2-in-clinic${tooMany ? ' warn' : ''}`}>
                                {tooMany ? `Only ${inClinic} in clinic` : `${inClinic} in clinic`}
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Qty"
                            value={row.qty}
                            onChange={e => updateManualRow(row.rowId, { qty: e.target.value })}
                          />
                          <button
                            type="button"
                            className="pb-icon-btn delete"
                            title="Remove row"
                            onClick={() => setManualForm(prev => {
                              const rest = prev.rows.filter(r => r.rowId !== row.rowId);
                              return { ...prev, rows: rest.length ? rest : [emptyManualRow()] };
                            })}
                          >
                            <XIcon size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pb-stock-footer">
                    <button
                      type="button"
                      className="pb-add-row-btn"
                      onClick={() => setManualForm(prev => ({ ...prev, rows: [...prev.rows, emptyManualRow()] }))}
                    >
                      <PlusIcon size={14} /> Add Medicine
                    </button>
                  </div>
                </div>

                <div className="pb-field full">
                  <label>Note</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={manualForm.note}
                    onChange={e => setManualForm(prev => ({ ...prev, note: e.target.value }))}
                  />
                </div>
              </div>

              {manualError && <div className="pb-form-error">{manualError}</div>}

              <div className="modal-footer" style={{ marginTop: '16px' }}>
                <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setShowManual(false)} disabled={savingManual}>Cancel</button>
                <button type="submit" className="crm-btn crm-btn-primary" disabled={savingManual}>
                  {savingManual ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View: kisne kab kitni bechi / kis bill me kitni aayi */}
      {viewRow && (
        <div className="modal-overlay" onClick={() => setViewRow(null)}>
          <div className="modal-content pb-modal ms-view-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{viewRow.name}</h3>
                <div className="ms-category">{viewRow.category || 'Other'}</div>
              </div>
              <button className="modal-close" onClick={() => setViewRow(null)} aria-label="Close">
                <XIcon size={16} />
              </button>
            </div>

            <div className="pb-amount-row">
              <div><span>Received</span><strong>{viewRow.received}</strong></div>
              <div><span>Sold</span><strong>{viewRow.sold}</strong></div>
              <div>
                <span>In Clinic</span>
                <strong className={viewRow.inStock <= 0 ? 'pb-red' : viewRow.inStock <= LOW_STOCK ? 'ms-amber' : 'pb-green'}>{viewRow.inStock}</strong>
              </div>
            </div>

            <div className="ms2-view-periods">
              {PERIODS.map(p => (
                <div key={p.value}>
                  <span>Sold {p.label.toLowerCase()}</span>
                  <strong>{p.value === 'today' ? viewRow.soldToday : p.value === 'week' ? viewRow.soldWeek : viewRow.soldMonth}</strong>
                </div>
              ))}
            </div>

            {historyError ? (
              <div className="pb-form-error">{historyError}</div>
            ) : !history ? (
              <div className="pb-empty-small">Loading...</div>
            ) : (
              <>
                <div className="ms-view-head">
                  <div className="pb-history-title">Sold ({visibleSold.reduce((sum, x) => sum + x.qty, 0)} units)</div>
                  <div className="pb-status-slider ms-period-tabs">
                    {[{ value: 'all', label: 'All' }, ...PERIODS].map(p => (
                      <button
                        key={p.value}
                        type="button"
                        className={`pb-status-tab${soldPeriod === p.value ? ' active' : ''}`}
                        onClick={() => setSoldPeriod(p.value)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                {visibleSold.length === 0 ? (
                  <div className="pb-empty-small">No sale entry {soldPeriod === 'all' ? 'yet' : 'in this period'}.</div>
                ) : (
                  <div className="ms-table-wrap ms-view-table">
                    <table className="pb-table">
                      <thead>
                        <tr>
                          <th>Date &amp; Time</th>
                          <th>Patient / Given To</th>
                          <th className="num">Qty</th>
                          <th>Sale Entry By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleSold.map(x => (
                          <tr key={x.invoiceId}>
                            <td>{formatDateTime(x.at)}</td>
                            <td>
                              <div className="pb-strong">{x.patient || '-'}</div>
                              {x.mobile && <div className="ms-category">{x.mobile}</div>}
                              {x.manual && <span className="ms2-reason small">Manual · {x.reason}</span>}
                            </td>
                            <td className="num pb-strong">{x.qty}</td>
                            <td><ByCell name={x.byName} role={x.byRole} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="pb-history-title" style={{ marginTop: 16 }}>
                  Received ({history.received.reduce((sum, x) => sum + x.qty, 0)} units)
                </div>
                {history.received.length === 0 ? (
                  <div className="pb-empty-small">Not added in any pharmacy bill yet.</div>
                ) : (
                  <div className="ms-table-wrap ms-view-table">
                    <table className="pb-table">
                      <thead>
                        <tr>
                          <th>Bill Date</th>
                          <th>Supplier</th>
                          <th className="num">Qty</th>
                          <th>Added By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.received.map(x => (
                          <tr key={x.billId}>
                            <td>{formatDisplayDate(x.billDate)}</td>
                            <td>
                              <div className="pb-strong">{x.supplierName}</div>
                              {x.billNumber && <div className="ms-category">Bill {x.billNumber}</div>}
                            </td>
                            <td className="num pb-strong">{x.qty}</td>
                            <td><ByCell name={x.byName} role={x.byRole} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            <div className="modal-footer" style={{ marginTop: '16px' }}>
              <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setViewRow(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineStock;
