import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import Modal from '../components/Modal';
import CustomSelect from '../components/CustomSelect';
import { EditIcon, TrashIcon } from '../components/Icons';

const RuleManagement = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperadmin = currentUser.role === 'superadmin';
    const [rules, setSops] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedRule, setSelectedRule] = useState(null);

    const uniqueCategories = [...new Set(users.filter(u => u.role === 'team' && u.category).map(u => u.category))];
    const dynamicRoles = isSuperadmin ? ['superadmin', 'admin', ...uniqueCategories] : [...uniqueCategories];

    // Rule Modal State
    const [showSopModal, setShowSopModal] = useState(false);
    const [isEditSop, setIsEditSop] = useState(false);
    const [ruleTitle, setSopTitle] = useState('');
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);

    // Point Modal State
    const [showPointModal, setShowPointModal] = useState(false);
    const [isEditPoint, setIsEditPoint] = useState(false);
    const [pointId, setPointId] = useState(null);
    const [pointHeading, setPointHeading] = useState('');
    const [pointDesc, setPointDesc] = useState('');
    

    const token = localStorage.getItem('token');

    const fetchData = async () => {
        try {
            const [ruleRes, teamRes, adminRes, superadminRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/rules`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/users/team`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/users/admin`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/users/superadmin`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setSops(ruleRes.data);
            const allFetchedUsers = [...superadminRes.data, ...adminRes.data, ...teamRes.data];
            setUsers(
                isSuperadmin 
                ? allFetchedUsers 
                : allFetchedUsers.filter(u => u.role === 'team' || (currentUser.id && u._id === currentUser.id))
            );

            setSelectedRule(prev => {
                if (prev) {
                    return ruleRes.data.find(s => s._id === prev._id) || null;
                }
                return prev;
            });
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Rule CRUD ---
    const openSopModal = (rule = null) => {
        if (rule) {
            setIsEditSop(true);
            setSopTitle(rule.title);
            setSelectedRoles(rule.assignedRoles || []);
            setSelectedUsers((rule.assignedUsers || []).map(u => u._id));
            setSelectedRule(rule);
        } else {
            setIsEditSop(false);
            setSopTitle('');
            setSelectedRoles([]);
            setSelectedUsers([]);
        }
        setShowSopModal(true);
    };

    const handleSopSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { title: ruleTitle, assignedRoles: selectedRoles, assignedUsers: selectedUsers };
            if (isEditSop) {
                await axios.put(`${import.meta.env.VITE_API_BASE_URL}/rules/${selectedRule._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
            } else {
                await axios.post(`${import.meta.env.VITE_API_BASE_URL}/rules`, payload, { headers: { Authorization: `Bearer ${token}` } });
            }
            setShowSopModal(false);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Error saving Rule');
        }
    };

    const handleDeleteSop = async (id) => {
        if (!window.confirm("Delete this Rule Group?")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/rules/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            if (selectedRule && selectedRule._id === id) setSelectedRule(null);
            fetchData();
        } catch (error) {
            alert('Error deleting');
        }
    };

    // --- POINT CRUD ---
    const openPointModal = (point = null) => {
        if (point) {
            setIsEditPoint(true);
            setPointId(point._id);
            setPointHeading(point.heading + (point.description ? '\n\n' + point.description : ''));
            setPointDesc(''); // Clear description so it gets overwritten as empty
        } else {
            setIsEditPoint(false);
            setPointHeading('');
            setPointDesc('');
        }
        setShowPointModal(true);
    };

    const handlePointSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { heading: pointHeading, description: pointDesc };
            if (isEditPoint) {
                await axios.put(`${import.meta.env.VITE_API_BASE_URL}/rules/${selectedRule._id}/points/${pointId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
            } else {
                await axios.post(`${import.meta.env.VITE_API_BASE_URL}/rules/${selectedRule._id}/points`, payload, { headers: { Authorization: `Bearer ${token}` } });
            }
            setShowPointModal(false);
            fetchData();
        } catch (error) {
            alert('Error saving point');
        }
    };

    const handleDeletePoint = async (ptId) => {
        if (!window.confirm("Delete this point?")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/rules/${selectedRule._id}/points/${ptId}`, { headers: { Authorization: `Bearer ${token}` } });
            fetchData();
        } catch (error) {
            alert('Error deleting point');
        }
    };

    const [activeRoleFilter, setActiveRoleFilter] = useState('All Roles');
    const [activeUserFilter, setActiveUserFilter] = useState('All Users');
    const [searchQuery, setSearchQuery] = useState('');
    const [quickGroupTitle, setQuickGroupTitle] = useState('');
    const [inlinePointHeading, setInlinePointHeading] = useState('');

    const handleInlineAdd = async () => {
        if (!inlinePointHeading.trim()) return;
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/rules/${selectedRule._id}/points`, { heading: inlinePointHeading, description: '' }, { headers: { Authorization: `Bearer ${token}` } });
            setInlinePointHeading('');
            fetchData();
        } catch (error) {
            alert('Error adding point');
        }
    };

    const handleQuickAdd = async () => {
        if (!quickGroupTitle.trim()) return;

        let newAssignedRoles = [];
        let newAssignedUsers = [];

        if (activeRoleFilter !== 'All Roles') {
            newAssignedRoles.push(activeRoleFilter);
        }
        if (activeUserFilter !== 'All Users') {
            const userObj = users.find(u => u.name === activeUserFilter);
            if (userObj) {
                newAssignedUsers.push(userObj._id);
            }
        }

        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/rules`, {
                title: quickGroupTitle,
                assignedRoles: newAssignedRoles,
                assignedUsers: newAssignedUsers
            }, { headers: { Authorization: `Bearer ${token}` } });
            setQuickGroupTitle('');
            fetchData();
        } catch (error) {
            alert('Error creating Rule');
        }
    };

    const toggleRole = (r) => setSelectedRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
    const toggleUser = (uId) => setSelectedUsers(prev => prev.includes(uId) ? prev.filter(x => x !== uId) : [...prev, uId]);

    // Filtering logic
    const filteredRules = rules.filter(rule => {
        const matchesSearch = rule.title.toLowerCase().includes(searchQuery.toLowerCase());

        let targetRole = activeRoleFilter;
        if (activeRoleFilter !== 'All Roles') {
            targetRole = activeRoleFilter.toLowerCase();
        }
        const matchesRole = activeRoleFilter === 'All Roles' || rule.assignedRoles.some(r => r.toLowerCase() === targetRole);

        const matchesUser = activeUserFilter === 'All Users' || rule.assignedUsers.some(u => u.name === activeUserFilter);
        return matchesSearch && matchesRole && matchesUser;
    });

    return (
        <div className="task-page-container">
            <div className="page-header" style={{ marginBottom: '15px' }}>
                <div>
                    <h2>Rules</h2>
                </div>
                <button onClick={() => openSopModal()} className="crm-btn crm-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>+ Create Global Rule</button>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', maxWidth: '100%' }}>
                <div className="hide-scrollbar" style={{ display: 'inline-flex', gap: '2px', background: '#f8fafc', padding: '3px', borderRadius: '8px', flexWrap: 'nowrap', overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
                    { (isSuperadmin ? ['All Roles', 'Superadmin', 'Admin', ...uniqueCategories] : ['All Roles', ...uniqueCategories]).map(role => (
                        <button
                            key={role}
                            onClick={() => setActiveRoleFilter(role)}
                            style={{
                                background: activeRoleFilter === role ? '#fff' : 'transparent',
                                border: 'none',
                                boxShadow: activeRoleFilter === role ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px',
                                color: activeRoleFilter === role ? '#1e293b' : '#475569',
                                cursor: 'pointer', fontWeight: activeRoleFilter === role ? '600' : '500',
                                transition: 'all 0.2s',
                                textTransform: 'capitalize',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }}
                        >
                            {role}
                        </button>
                    ))}
                </div>
                <div className="hide-scrollbar" style={{ display: 'inline-flex', gap: '2px', background: '#f8fafc', padding: '3px', borderRadius: '8px', flexWrap: 'nowrap', overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
                    {['All Users', ...users.filter(u => {
        if (!isSuperadmin && u.role === 'superadmin') return false;
                        if (activeRoleFilter === 'All Roles') return true;
                        if (activeRoleFilter === 'Superadmin') return u.role === 'superadmin';
                        if (activeRoleFilter === 'Admin') return u.role === 'admin';
                        return u.role === 'team' && u.category === activeRoleFilter;
                    }).map(u => u.name)].map(user => (
                        <button
                            key={user}
                            onClick={() => setActiveUserFilter(user)}
                            style={{
                                background: activeUserFilter === user ? '#fff' : 'transparent',
                                border: 'none',
                                boxShadow: activeUserFilter === user ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px',
                                color: activeUserFilter === user ? '#1e293b' : '#475569',
                                cursor: 'pointer', fontWeight: activeUserFilter === user ? '600' : '500',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }}
                        >
                            {user}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '15px', flexShrink: 0 }}>
                <svg style={{ position: 'absolute', left: '12px', top: '10px' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input
                    type="text"
                    placeholder="Search Rule Groups..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px 8px 35px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', backgroundColor: '#fff', color: '#1e293b' }}
                />
            </div>

            <div className="responsive-two-panel">
                {/* Left Panel: Groups */}
                <div className="responsive-panel-left">
                    <h3 style={{ fontSize: '14px', color: '#334155', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f4a8a" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        Rule Groups <span style={{ background: '#e0f2fe', color: '#0f4a8a', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>{filteredRules.length}</span>
                    </h3>

                    {/* Quick Add */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexShrink: 0 }}>
                        <input
                            type="text"
                            placeholder="New mapping group..."
                            value={quickGroupTitle}
                            onChange={(e) => setQuickGroupTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                            style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', backgroundColor: '#fff', color: '#1e293b' }}
                        />
                        <button onClick={handleQuickAdd} style={{ background: '#0f4a8a', color: 'white', border: 'none', borderRadius: '6px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                    </div>

                    {/* Rule List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                        {filteredRules.map(rule => (
                            <div
                                key={rule._id}
                                onClick={() => setSelectedRule(rule)}
                                style={{
                                    padding: '12px',
                                    border: selectedRule?._id === rule._id ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    background: '#fff',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: selectedRule?._id === rule._id ? '0 0 0 2px rgba(59,130,246,0.1)' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2"><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></svg>
                                        <strong style={{ color: '#1e293b', fontSize: '13px', fontWeight: 'bold' }}>{rule.title}</strong>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={(e) => { e.stopPropagation(); openSopModal(rule); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }} title="Edit Roles/Title"><EditIcon size={13} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSop(rule._id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 0 }} title="Delete Group"><TrashIcon size={13} /></button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '22px' }}>
                                    {rule.assignedRoles.map(r => (
                                        <span key={r} style={{ fontSize: '10px', background: '#faf5ff', color: '#a855f7', padding: '2px 6px', borderRadius: '4px', textTransform: 'capitalize', fontWeight: '500' }}>{r}</span>
                                    ))}
                                    {rule.assignedUsers.map(u => (
                                        <span key={u._id} style={{ fontSize: '10px', background: '#eff6ff', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontWeight: '500' }}>{u.name}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Points */}
                <div className="responsive-panel-right" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {selectedRule ? (
                        <>
                            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                                <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b', fontWeight: 'bold' }}>{selectedRule.title} - Points</h3>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                                {/* Inline Adder */}
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                                    <textarea
                                        placeholder="Add a new point directly here..."
                                        value={inlinePointHeading}
                                        onChange={e => setInlinePointHeading(e.target.value)}
                                        rows={1}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleInlineAdd();
                                            }
                                        }}
                                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical', minHeight: '44px', height: '44px', fontFamily: 'inherit', fontSize: '13px', backgroundColor: '#f8fafc', color: '#1e293b', boxSizing: 'border-box' }}
                                    />
                                    <button
                                        onClick={handleInlineAdd}
                                        disabled={!inlinePointHeading.trim()}
                                        className="inline-adder-btn"
                                        style={{ background: inlinePointHeading.trim() ? '#0f4a8a' : '#cbd5e1', color: 'white', border: 'none', borderRadius: '8px', cursor: inlinePointHeading.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background-color 0.2s' }}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    </button>
                                </div>

                                {selectedRule.points.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '20px', marginBottom: '40px', fontSize: '13px' }}>No points added yet.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
                                        {selectedRule.points.map((pt, idx) => (
                                            <div key={pt._id} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ fontSize: '13px', color: '#334155', display: 'flex', gap: '8px', flex: 1, overflow: 'hidden' }}>
                                                        <span style={{ color: '#0f4a8a', fontWeight: 'bold' }}>{idx + 1}.</span>
                                                        <span style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{pt.heading ? pt.heading.trim() : ''}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', paddingLeft: '15px', flexShrink: 0 }}>
                                                        <button onClick={() => openPointModal(pt)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '6px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EditIcon size={13} /></button>
                                                        <button onClick={() => handleDeletePoint(pt._id)} style={{ background: '#fff', border: '1px solid #fee2e2', borderRadius: '4px', padding: '6px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrashIcon size={13} /></button>
                                                    </div>
                                                </div>
                                                {pt.description && (
                                                    <div style={{ marginLeft: '20px', marginTop: '12px', fontSize: '12px', color: '#475569', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                                        {pt.description}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1" style={{ marginBottom: '12px' }}>
                                <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
                            </svg>
                            <span style={{ fontSize: '13px' }}>Select a group to see points</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Rule Modal */}
            <Modal isOpen={showSopModal} onClose={() => setShowSopModal(false)} title={isEditSop ? 'Edit Rule Group' : 'Create Rule Group'}>
                <form onSubmit={handleSopSubmit}>
                    <FormInput label="Rule Group Name" value={ruleTitle} onChange={e => setSopTitle(e.target.value)} required />

                    <div style={{ marginTop: '15px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#475569' }}>Assign to Roles</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                            {selectedRoles.map(r => (
                                <span key={r} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', background: '#faf5ff', color: '#a855f7', padding: '4px 8px', borderRadius: '4px', textTransform: 'capitalize', fontWeight: '500' }}>
                                    {r}
                                    <button type="button" onClick={() => toggleRole(r)} style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer', padding: 0, display: 'flex' }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </span>
                            ))}
                        </div>
                        <CustomSelect
                            value=""
                            placeholder="Select a role to add..."
                            onChange={val => { if (val) toggleRole(val) }}
                            options={dynamicRoles.filter(r => !selectedRoles.includes(r)).map(r => ({ value: r, label: r }))}
                        />
                    </div>

                    <div style={{ marginTop: '15px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#475569' }}>Assign to Specific Users</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                            {selectedUsers.map(uId => {
                                const u = users.find(x => x._id === uId);
                                return u ? (
                                    <span key={uId} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '4px', fontWeight: '500' }}>
                                        {u.name}
                                        <button type="button" onClick={() => toggleUser(uId)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, display: 'flex' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </span>
                                ) : null;
                            })}
                        </div>
                        <CustomSelect
                            value=""
                            placeholder="Select a user to add..."
                            onChange={val => { if (val) toggleUser(val) }}
                            options={users.filter(u => !selectedUsers.includes(u._id)).map(u => ({ value: u._id, label: `${u.name} (${u.role})` }))}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <Button type="button" variant="secondary" onClick={() => setShowSopModal(false)}>Cancel</Button>
                        <Button type="submit">{isEditSop ? 'Update Group' : 'Create Group'}</Button>
                    </div>
                </form>
            </Modal>

            {/* Point Modal */}
            <Modal isOpen={showPointModal} onClose={() => setShowPointModal(false)} title={isEditPoint ? 'Edit Point' : `Add Point to "${selectedRule?.title}"`}>
                <form onSubmit={handlePointSubmit}>
                    <FormInput
                        label="Point Content"
                        isTextArea={true}
                        value={pointHeading}
                        onChange={e => setPointHeading(e.target.value)}
                        style={{ minHeight: '150px' }}
                        required
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <Button type="button" variant="secondary" onClick={() => setShowPointModal(false)}>Cancel</Button>
                        <Button type="submit">{isEditPoint ? 'Update Point' : 'Add Point'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default RuleManagement;

