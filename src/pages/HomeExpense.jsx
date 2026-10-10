import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, CalendarIcon } from '../components/Icons';
import CustomSelect from '../components/CustomSelect';
import CalendarPicker from '../components/CalendarPicker';
import '../App.css';
import './Payments.css';
import moment from 'moment';

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

export default function HomeExpense() {
    const [members, setMembers] = useState(() => {
        const local = localStorage.getItem('homeMembers');
        return local ? JSON.parse(local) : [];
    });
    
    const [expenses, setExpenses] = useState(() => {
        const local = localStorage.getItem('homeExpenses');
        return local ? JSON.parse(local) : [];
    });

    useEffect(() => {
        localStorage.setItem('homeMembers', JSON.stringify(members));
    }, [members]);

    useEffect(() => {
        localStorage.setItem('homeExpenses', JSON.stringify(expenses));
    }, [expenses]);

    const [activeMember, setActiveMember] = useState('All');
    
    // Filters
    const [currentYearStr] = useState(() => new Date().getFullYear().toString());
    const [currentMonthStr] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
    
    const [selectedYear, setSelectedYear] = useState(currentYearStr);
    const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
    const [selectedDate, setSelectedDate] = useState('');

    // Modals
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');

    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().substring(0, 10));
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expensePurpose, setExpensePurpose] = useState('');
    const [expenseMember, setExpenseMember] = useState('');

    const [fullPurposeText, setFullPurposeText] = useState(null);

    const handleAddMember = (e) => {
        e.preventDefault();
        if (!newMemberName.trim()) return;
        const newMember = { id: Date.now().toString(), name: newMemberName.trim() };
        setMembers([...members, newMember]);
        setNewMemberName('');
        setShowMemberModal(false);
        if (members.length === 0) setActiveMember(newMember.id);
    };

    const handleAddExpense = (e) => {
        e.preventDefault();
        if (!expenseAmount || !expensePurpose || !expenseMember) return;
        
        const newExp = {
            id: Date.now().toString(),
            memberId: expenseMember,
            date: expenseDate,
            amount: Number(expenseAmount),
            purpose: expensePurpose,
            createdAt: new Date().toISOString()
        };
        setExpenses([newExp, ...expenses]);
        setShowExpenseModal(false);
        setExpenseAmount('');
        setExpensePurpose('');
    };

    const handleDeleteExpense = (id) => {
        if (window.confirm("Delete this expense?")) {
            setExpenses(expenses.filter(e => e.id !== id));
        }
    };

    const YEAR_OPTIONS = React.useMemo(() => {
        const years = new Set();
        years.add(currentYearStr);
        expenses.forEach(e => {
            if (e.date) years.add(e.date.substring(0, 4));
        });
        return Array.from(years).sort().reverse();
    }, [expenses, currentYearStr]);

    const dateFilteredExpenses = expenses.filter(e => {
        if (selectedDate) {
            if (e.date !== selectedDate) return false;
        } else {
            if (selectedYear !== 'All') {
                if (e.date.substring(0, 4) !== selectedYear) return false;
            }
            if (selectedMonth !== 'All') {
                if (e.date.substring(5, 7) !== selectedMonth) return false;
            }
        }
        return true;
    });

    const filteredExpenses = dateFilteredExpenses.filter(e => {
        if (activeMember !== 'All' && e.memberId !== activeMember) return false;
        return true;
    });

    const totalExpense = dateFilteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const R = "\u20B9";

    return (
        <div className="payments-page-container">
            {/* Top Header Card */}
            <div className="payments-header-card">
                <div className="payments-header-left">
                    <div className="payments-icon-badge">
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <h2 className="payments-title">Home Expense</h2>
                    </div>
                </div>
                <div className="payments-header-controls">
                    <div className="payments-filter-select-wrap">
                        <CalendarPicker 
                            selectedDate={selectedDate}
                            onChange={(val) => { setSelectedDate(val); setSelectedMonth('All'); setSelectedYear('All'); }}
                            placeholder="Filter by Date"
                            enableYearMonthDropdown={true}
                        />
                    </div>
                    <div className="payments-filter-select-wrap payments-filter-month-wrap">
                        <CustomSelect 
                            value={selectedMonth} 
                            onChange={(val) => { setSelectedMonth(val); setSelectedDate(''); }}
                            options={MONTH_LIST.map(m => ({ value: m.val, label: m.label }))}
                            placeholder="Select Month"
                        />
                    </div>
                    <div className="payments-filter-select-wrap payments-filter-year-wrap">
                        <CustomSelect 
                            value={selectedYear} 
                            onChange={(val) => { setSelectedYear(val); setSelectedDate(''); }}
                            options={[{ value: 'All', label: 'All Years' }, ...YEAR_OPTIONS.map(y => ({ value: y, label: y }))]}
                            placeholder="Select Year"
                        />
                    </div>
                </div>
            </div>

            {/* Members Slider */}
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '10px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                <button 
                    type="button"
                    onClick={() => setActiveMember('All')}
                    style={{ 
                        padding: '8px 20px', 
                        borderRadius: '20px', 
                        border: '1px solid #cbd5e1', 
                        background: activeMember === 'All' ? '#1e293b' : '#fff', 
                        color: activeMember === 'All' ? '#fff' : '#475569', 
                        fontWeight: '600', 
                        fontSize: '14px', 
                        cursor: 'pointer', 
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s'
                    }}
                >
                    All Members
                </button>
                {members.map(m => (
                    <button 
                        key={m.id}
                        type="button"
                        onClick={() => setActiveMember(m.id)}
                        style={{ 
                            padding: '8px 20px', 
                            borderRadius: '20px', 
                            border: '1px solid #cbd5e1', 
                            background: activeMember === m.id ? '#1e293b' : '#fff', 
                            color: activeMember === m.id ? '#fff' : '#475569', 
                            fontWeight: '600', 
                            fontSize: '14px', 
                            cursor: 'pointer', 
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                        }}
                    >
                        {m.name}
                    </button>
                ))}
                <button 
                    type="button"
                    onClick={() => setShowMemberModal(true)}
                    style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 20px', 
                        borderRadius: '20px', 
                        border: '1px dashed #94a3b8', 
                        background: '#f8fafc', 
                        color: '#475569', 
                        fontWeight: '600', 
                        fontSize: '14px', 
                        cursor: 'pointer', 
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s'
                    }}
                >
                    <PlusIcon size={14} /> Add Member
                </button>
            </div>

            {/* KPI Cards */}
            <div className="payments-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', marginTop: '20px' }}>
                <div className="payments-kpi-card kpi-theme-outflow" style={{ background: '#fff5f5' }}>
                    <div className="payments-kpi-header">
                        <span className="payments-kpi-label">TOTAL EXPENSE</span>
                        <div className="payments-kpi-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
                        </div>
                    </div>
                    <div className="payments-kpi-value">{R}{totalExpense.toLocaleString()}</div>
                </div>
                {members.map(m => {
                    const mTotal = dateFilteredExpenses.filter(e => e.memberId === m.id).reduce((sum, e) => sum + e.amount, 0);
                    return (
                        <div key={m.id} className="payments-kpi-card" style={{ border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <div className="payments-kpi-header">
                                <span className="payments-kpi-label" style={{ color: '#475569' }}>{m.name.toUpperCase()}</span>
                                <div className="payments-kpi-icon" style={{ color: '#64748b', background: '#e2e8f0' }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                </div>
                            </div>
                            <div className="payments-kpi-value" style={{ color: '#0f172a' }}>{R}{mTotal.toLocaleString()}</div>
                        </div>
                    );
                })}
            </div>

            {/* Content Section */}
            <div>
                <div className="payments-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 className="payments-section-title">Expense Journal</h3>
                    </div>
                    <div className="payments-section-actions">
                        <button 
                            type="button" 
                            onClick={() => {
                                if (members.length === 0) {
                                    alert("Please add a member first.");
                                    return;
                                }
                                setExpenseMember(activeMember !== 'All' ? activeMember : members[0].id);
                                setShowExpenseModal(true);
                            }} 
                            className="payments-btn-primary"
                        >
                            <PlusIcon size={14} />
                            <span>Record Expense</span>
                        </button>
                    </div>
                </div>

                <div className="desktop-table-container payments-table-card" style={{ marginTop: '20px' }}>
                    <table className="payments-data-table">
                        <thead>
                            <tr>
                                <th>DATE</th>
                                <th>MEMBER</th>
                                <th>PURPOSE</th>
                                <th>AMOUNT</th>
                                <th className="text-right">ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No expenses found for selected filters.</td>
                                </tr>
                            ) : (
                                filteredExpenses.map(exp => {
                                    const member = members.find(m => m.id === exp.memberId);
                                    return (
                                        <tr key={exp.id}>
                                            <td>{moment(exp.date).format('DD MMM YYYY')}</td>
                                            <td>{member ? member.name : 'Unknown'}</td>
                                            <td>
                                                {exp.purpose.length > 30 ? (
                                                    <>
                                                        {exp.purpose.substring(0, 30)}... 
                                                        <span 
                                                            style={{ color: '#2563eb', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }} 
                                                            onClick={() => setFullPurposeText(exp.purpose)}
                                                        >
                                                            Read More
                                                        </span>
                                                    </>
                                                ) : (
                                                    exp.purpose
                                                )}
                                            </td>
                                            <td style={{ color: '#ef4444', fontWeight: 600 }}>{R}{exp.amount.toLocaleString()}</td>
                                            <td className="text-right">
                                                <div className="payments-table-actions">
                                                    <button type="button" onClick={() => handleDeleteExpense(exp.id)} className="payments-icon-action-btn" title="Delete">
                                                        <TrashIcon size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards (Visible on sm/md) */}
                <div className="mobile-cards payments-mobile-cards-grid" style={{ marginTop: '20px' }}>
                    {filteredExpenses.length === 0 ? (
                        <div className="payments-cards-empty">
                            No expenses found for selected filters.
                        </div>
                    ) : (
                        filteredExpenses.map(exp => {
                            const member = members.find(m => m.id === exp.memberId);
                            const memberName = member ? member.name : 'Unknown';
                            const memberInitials = memberName.substring(0, 2).toUpperCase();
                            const formattedDate = moment(exp.date).format('DD MMM YYYY');
                            return (
                                <div key={exp.id} className="payment-invoice-card payment-col-card">
                                    <div className="pay-card-top-row">
                                        <div className="pay-card-client-wrap">
                                            <div className="pay-card-avatar avatar-expense">
                                                {memberInitials}
                                            </div>
                                            <div className="pay-card-client-info">
                                                <h4 className="pay-card-client-name" title={memberName}>{memberName}</h4>
                                                <span className="pay-card-id-badge">{formattedDate}</span>
                                            </div>
                                        </div>
                                        <span className="pay-exp-amount-pill">
                                            {R}{exp.amount.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="pay-card-metrics-row">
                                        <div className="pay-card-metric-col" style={{ gridColumn: 'span 2' }}>
                                            <span className="pay-card-metric-label">PURPOSE</span>
                                            <span className="pay-card-metric-val" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {exp.purpose.length > 50 ? exp.purpose.substring(0, 50) + '...' : exp.purpose}
                                                {exp.purpose.length > 50 && (
                                                    <span 
                                                        style={{ color: '#2563eb', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'inline-block' }}
                                                        onClick={() => setFullPurposeText(exp.purpose)}
                                                    >
                                                        Read More
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pay-card-footer">
                                        <span className="pay-card-receipt-tag">Home Expense</span>
                                        <div className="pay-card-actions">
                                            <button type="button" onClick={() => handleDeleteExpense(exp.id)} className="pay-card-icon-btn" style={{ color: '#ef4444' }} title="Delete">
                                                <TrashIcon size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Add Member Modal */}
            {showMemberModal && (
                <>
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={() => setShowMemberModal(false)}></div>
                    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', zIndex: 1001, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Add New Member</h3>
                            <button onClick={() => setShowMemberModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '20px' }}>&times;</button>
                        </div>
                        <form onSubmit={handleAddMember}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Member Name *</label>
                                <input 
                                    type="text" 
                                    value={newMemberName} 
                                    onChange={(e) => setNewMemberName(e.target.value)} 
                                    required 
                                    autoFocus
                                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" onClick={() => setShowMemberModal(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                                <button type="submit" className="payments-btn-primary" style={{ border: 'none' }}>Add Member</button>
                            </div>
                        </form>
                    </div>
                </>
            )}

            {/* Add Expense Modal */}
            {showExpenseModal && (
                <>
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={() => setShowExpenseModal(false)}></div>
                    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '450px', zIndex: 1001, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Record Home Expense</h3>
                            <button onClick={() => setShowExpenseModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '20px' }}>&times;</button>
                        </div>
                        <form onSubmit={handleAddExpense}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Date *</label>
                                <CalendarPicker 
                                    selectedDate={expenseDate} 
                                    onChange={(val) => setExpenseDate(val)} 
                                    enableYearMonthDropdown={true}
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Member *</label>
                                <CustomSelect 
                                    value={expenseMember}
                                    onChange={(val) => setExpenseMember(val)}
                                    options={members.map(m => ({ value: m.id, label: m.name }))}
                                    placeholder="Select Member"
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Purpose *</label>
                                <input 
                                    type="text" 
                                    value={expensePurpose} 
                                    onChange={(e) => setExpensePurpose(e.target.value)} 
                                    required 
                                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Amount ({R}) *</label>
                                <input 
                                    type="number" 
                                    value={expenseAmount} 
                                    onChange={(e) => setExpenseAmount(e.target.value)} 
                                    required 
                                    min="1"
                                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" onClick={() => setShowExpenseModal(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                                <button type="submit" className="payments-btn-primary" style={{ border: 'none' }}>Save Expense</button>
                            </div>
                        </form>
                    </div>
                </>
            )}

            {/* Read More Purpose Modal */}
            {fullPurposeText && (
                <>
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={() => setFullPurposeText(null)}></div>
                    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', zIndex: 1001, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Expense Purpose</h3>
                            <button onClick={() => setFullPurposeText(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '20px' }}>&times;</button>
                        </div>
                        <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', wordBreak: 'break-word', maxHeight: '60vh', overflowY: 'auto' }}>
                            {fullPurposeText}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button type="button" onClick={() => setFullPurposeText(null)} className="payments-btn-primary" style={{ border: 'none' }}>Close</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
