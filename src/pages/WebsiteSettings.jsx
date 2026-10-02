import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  PlusIcon, 
  TrashIcon, 
  EditIcon, 
  CheckCircleIcon, 
  XIcon, 
  WalletIcon, 
  UserIcon 
} from '../components/Icons';
import './WebsiteSettings.css';

const WebsiteSettings = () => {
    const [adminCategories, setAdminCategories] = useState([]);
    const [teamCategories, setTeamCategories] = useState([]);
    const [consultationFee, setConsultationFee] = useState(500);
    const [newAdminCat, setNewAdminCat] = useState('');
    const [newTeamCat, setNewTeamCat] = useState('');
    const [message, setMessage] = useState('');

    const [editingAdminCat, setEditingAdminCat] = useState(null);
    const [editAdminInput, setEditAdminInput] = useState('');

    const [editingTeamCat, setEditingTeamCat] = useState(null);
    const [editTeamInput, setEditTeamInput] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAdminCategories(res.data.adminCategories || []);
            setTeamCategories(res.data.teamCategories || []);
            setConsultationFee(res.data.consultationFee !== undefined ? res.data.consultationFee : 500);
        } catch (err) {
            console.error('Error fetching settings', err);
        }
    };

    const updateCategories = async (updatedAdmin, updatedTeam) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${import.meta.env.VITE_API_BASE_URL}/settings`, {
                adminCategories: updatedAdmin,
                teamCategories: updatedTeam,
                consultationFee: consultationFee
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAdminCategories(updatedAdmin);
            setTeamCategories(updatedTeam);
            setMessage('Settings updated successfully');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage('Error updating settings: ' + (err.response?.data?.message || err.message));
        }
    };

    const addAdminCategory = () => {
        if (!newAdminCat.trim()) return;
        const newCat = newAdminCat.trim().toLowerCase();
        if (adminCategories.includes(newCat)) return alert('Category already exists');
        updateCategories([...adminCategories, newCat], teamCategories);
        setNewAdminCat('');
    };

    const removeAdminCategory = (cat) => {
        if (window.confirm(`Are you sure you want to remove '${cat}'?`)) {
            updateCategories(adminCategories.filter(c => c !== cat), teamCategories);
        }
    };

    const saveAdminEdit = (oldCat) => {
        const newCat = editAdminInput.trim().toLowerCase();
        if (!newCat) {
            setEditingAdminCat(null);
            return;
        }
        if (newCat !== oldCat && adminCategories.includes(newCat)) {
            alert('Category already exists');
            return;
        }
        const newArray = adminCategories.map(c => c === oldCat ? newCat : c);
        updateCategories(newArray, teamCategories);
        setEditingAdminCat(null);
    };

    const addTeamCategory = () => {
        if (!newTeamCat.trim()) return;
        const newCat = newTeamCat.trim().toLowerCase();
        if (teamCategories.includes(newCat)) return alert('Category already exists');
        updateCategories(adminCategories, [...teamCategories, newCat]);
        setNewTeamCat('');
    };

    const removeTeamCategory = (cat) => {
        if (window.confirm(`Are you sure you want to remove '${cat}'?`)) {
            updateCategories(adminCategories, teamCategories.filter(c => c !== cat));
        }
    };

    const saveTeamEdit = (oldCat) => {
        const newCat = editTeamInput.trim().toLowerCase();
        if (!newCat) {
            setEditingTeamCat(null);
            return;
        }
        if (newCat !== oldCat && teamCategories.includes(newCat)) {
            alert('Category already exists');
            return;
        }
        const newArray = teamCategories.map(c => c === oldCat ? newCat : c);
        updateCategories(adminCategories, newArray);
        setEditingTeamCat(null);
    };

    return (
        <div className="settings-page-container">
            {/* Header Banner */}
            <div className="settings-header-card">
                <div className="settings-header-left">
                    <div className="settings-icon-badge">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="settings-title">Website & Clinic Settings</h2>
                        <p className="settings-subtitle">Manage default consultation fees and staff designation categories</p>
                    </div>
                </div>
            </div>
            
            {/* Alert Message Banner */}
            {message && (
                <div className={`settings-alert-banner ${message.toLowerCase().includes('success') ? 'settings-alert-success' : 'settings-alert-error'}`}>
                    {message.toLowerCase().includes('success') ? (
                        <CheckCircleIcon size={16} />
                    ) : (
                        <XIcon size={16} />
                    )}
                    <span>{message}</span>
                </div>
            )}

            {/* 3 Main Settings Columns */}
            <div className="settings-grid">
                {/* 1. Clinic Configuration */}
                <div className="settings-card">
                    <div className="settings-card-header">
                        <div className="settings-card-title-wrap">
                            <div className="settings-card-icon">
                                <WalletIcon size={16} />
                            </div>
                            <h3 className="settings-card-title">Clinic Configuration</h3>
                        </div>
                    </div>

                    <div className="settings-fee-group">
                        <label className="settings-fee-label">Default Consultation Fee (₹)</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div className="settings-fee-input-wrap" style={{ flex: 1 }}>
                                <span className="settings-fee-prefix">₹</span>
                                <input 
                                    type="number" 
                                    value={consultationFee} 
                                    onChange={(e) => setConsultationFee(e.target.value)} 
                                    className="settings-fee-input"
                                    placeholder="500"
                                    min="0"
                                />
                            </div>
                            <button 
                                type="button"
                                onClick={() => updateCategories(adminCategories, teamCategories)}
                                className="settings-btn-save"
                            >
                                Save Fee
                            </button>
                        </div>
                        <p className="settings-fee-desc">
                            Base fee applied automatically when creating new appointments and billing invoices.
                        </p>
                    </div>
                </div>

                {/* 2. Admin Categories */}
                <div className="settings-card">
                    <div className="settings-card-header">
                        <div className="settings-card-title-wrap">
                            <div className="settings-card-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                                </svg>
                            </div>
                            <h3 className="settings-card-title">Admin Categories</h3>
                        </div>
                        <span className="settings-card-count">{adminCategories.length}</span>
                    </div>

                    <div className="category-add-bar">
                        <input 
                            type="text" 
                            className="category-add-input" 
                            placeholder="Add new admin category..." 
                            value={newAdminCat}
                            onChange={e => setNewAdminCat(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addAdminCategory()}
                        />
                        <button 
                            type="button"
                            onClick={addAdminCategory} 
                            className="category-add-btn"
                            title="Add Category"
                        >
                            <PlusIcon size={16} />
                        </button>
                    </div>

                    <ul className="category-list">
                        {adminCategories.length === 0 ? (
                            <div className="category-empty-state">No admin categories configured.</div>
                        ) : (
                            adminCategories.map(cat => (
                                <li key={cat} className="category-item">
                                    {editingAdminCat === cat ? (
                                        <div className="category-edit-form">
                                            <input 
                                                type="text" 
                                                className="category-edit-input"
                                                value={editAdminInput} 
                                                onChange={e => setEditAdminInput(e.target.value)} 
                                                onKeyDown={e => e.key === 'Enter' && saveAdminEdit(cat)}
                                                autoFocus
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => saveAdminEdit(cat)} 
                                                className="category-edit-save" 
                                                title="Save"
                                            >
                                                <CheckCircleIcon size={16} />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setEditingAdminCat(null)} 
                                                className="category-edit-cancel" 
                                                title="Cancel"
                                            >
                                                <XIcon size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="category-item-name">
                                                <span className="category-bullet"></span>
                                                {cat}
                                            </span>
                                            <div className="category-actions">
                                                <button 
                                                    type="button"
                                                    onClick={() => { setEditingAdminCat(cat); setEditAdminInput(cat); }} 
                                                    className="category-action-btn category-btn-edit" 
                                                    title="Edit category"
                                                >
                                                    <EditIcon size={15} />
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => removeAdminCategory(cat)} 
                                                    className="category-action-btn category-btn-delete" 
                                                    title="Remove category"
                                                >
                                                    <TrashIcon size={15} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                {/* 3. Team Categories */}
                <div className="settings-card">
                    <div className="settings-card-header">
                        <div className="settings-card-title-wrap">
                            <div className="settings-card-icon">
                                <UserIcon size={16} />
                            </div>
                            <h3 className="settings-card-title">Team Categories</h3>
                        </div>
                        <span className="settings-card-count">{teamCategories.length}</span>
                    </div>

                    <div className="category-add-bar">
                        <input 
                            type="text" 
                            className="category-add-input" 
                            placeholder="Add new team category..." 
                            value={newTeamCat}
                            onChange={e => setNewTeamCat(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addTeamCategory()}
                        />
                        <button 
                            type="button"
                            onClick={addTeamCategory} 
                            className="category-add-btn"
                            title="Add Category"
                        >
                            <PlusIcon size={16} />
                        </button>
                    </div>

                    <ul className="category-list">
                        {teamCategories.length === 0 ? (
                            <div className="category-empty-state">No team categories configured.</div>
                        ) : (
                            teamCategories.map(cat => (
                                <li key={cat} className="category-item">
                                    {editingTeamCat === cat ? (
                                        <div className="category-edit-form">
                                            <input 
                                                type="text" 
                                                className="category-edit-input"
                                                value={editTeamInput} 
                                                onChange={e => setEditTeamInput(e.target.value)} 
                                                onKeyDown={e => e.key === 'Enter' && saveTeamEdit(cat)}
                                                autoFocus
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => saveTeamEdit(cat)} 
                                                className="category-edit-save" 
                                                title="Save"
                                            >
                                                <CheckCircleIcon size={16} />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setEditingTeamCat(null)} 
                                                className="category-edit-cancel" 
                                                title="Cancel"
                                            >
                                                <XIcon size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="category-item-name">
                                                <span className="category-bullet"></span>
                                                {cat}
                                            </span>
                                            <div className="category-actions">
                                                <button 
                                                    type="button"
                                                    onClick={() => { setEditingTeamCat(cat); setEditTeamInput(cat); }} 
                                                    className="category-action-btn category-btn-edit" 
                                                    title="Edit category"
                                                >
                                                    <EditIcon size={15} />
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => removeTeamCategory(cat)} 
                                                    className="category-action-btn category-btn-delete" 
                                                    title="Remove category"
                                                >
                                                    <TrashIcon size={15} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default WebsiteSettings;
