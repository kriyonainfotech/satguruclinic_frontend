import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheckIcon } from './Icons';
import CustomSelect from './CustomSelect';
import { PERMISSION_MODULES, PERMISSION_KEYS } from '../permissions/modules';

// Website Settings ke andar "Roles & Permissions" card.
// Superadmin yahan se choose karta hai ki Admin / Team (ya us role ke kisi ek insaan ko naam se) sidebar me kaunse modules dikhein,
// aur module on ho to uske page ke andar kya kya dikhe / kar sake (actions).
const RolePermissionsCard = ({ onMessage }) => {
    const [overrides, setOverrides] = useState([]);
    const [users, setUsers] = useState([]);
    const [role, setRole] = useState('team');
    const [userId, setUserId] = useState(''); // '' = poore role ka default
    const [draft, setDraft] = useState({});
    const [saving, setSaving] = useState(false);
    // Options popup: kis module ka khula hai, 'all' ya 'custom' choice,
    // aur khulne se pehle ki values (Cancel pe wapas lagane ke liye)
    const [popup, setPopup] = useState(null); // { key, mode, before }

    const API_URL = import.meta.env.VITE_API_BASE_URL;
    const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    useEffect(() => {
        fetchOverrides();
    }, []);

    const actionKeys = (m) => (m.actions || []).map(a => `${m.key}:${a.key}`);

    // Toggle on karne pe ya "Options" dabane pe popup khulta hai
    const openPopup = (m, current) => {
        const before = {};
        [m.key, ...actionKeys(m)].forEach(k => { before[k] = draft[k]; });
        const allOn = actionKeys(m).every(k => current[k]);
        setPopup({ key: m.key, mode: allOn ? 'all' : 'custom', before });
    };

    // Cancel: popup khulne se pehle jaisa (toggle se khula tha to module wapas off)
    const cancelPopup = () => {
        if (!popup) return;
        updateDraft({ ...draft, ...popup.before });
        setPopup(null);
    };

    // All = saare options on; Custom = saare off, user khud chune (pehle se kuch selected nahi)
    const choosePopupMode = (m, mode) => {
        setPopup({ ...popup, mode });
        const next = { ...draft };
        actionKeys(m).forEach(k => { next[k] = mode === 'all'; });
        updateDraft(next);
    };

    // Esc dabane pe popup cancel
    useEffect(() => {
        if (!popup) return;
        const handler = (e) => { if (e.key === 'Escape') cancelPopup(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [popup, draft]);

    const fetchOverrides = async () => {
        try {
            const res = await axios.get(`${API_URL}/permissions`, authHeader());
            setOverrides(res.data.overrides || []);
            setUsers(res.data.users || []);
        } catch (err) {
            console.error('Error fetching permissions', err);
        }
    };

    const findOverride = (r, uid) => overrides.find(o => o.role === r && (o.userId || '') === uid);
    const roleOverride = findOverride(role, '');
    const userOverride = userId ? findOverride(role, userId) : null;

    // Backend jaisa hi resolve: user (naam) override -> role default -> hardcoded default
    const resolve = (key) => {
        if (userOverride && typeof userOverride.modules[key] === 'boolean') return userOverride.modules[key];
        if (roleOverride && typeof roleOverride.modules[key] === 'boolean') return roleOverride.modules[key];
        const p = PERMISSION_KEYS.find(x => x.key === key);
        return !!p.defaults[role];
    };

    useEffect(() => {
        const next = {};
        PERMISSION_KEYS.forEach(p => { next[p.key] = resolve(p.key); });
        setDraft(next);
        setPopup(null);
    }, [role, userId, overrides]);

    const updateDraft = (next) => setDraft(next);

    const roleUsers = users.filter(u => u.role === role);
    const selectedUser = roleUsers.find(u => String(u._id) === userId);
    const changedCount = PERMISSION_KEYS.filter(p => draft[p.key] !== resolve(p.key)).length;
    const isDirty = changedCount > 0;
    const targetName = selectedUser ? selectedUser.name : (role === 'admin' ? 'All Admins' : 'All Team');
    const hasOwnOverride = userId ? !!userOverride : !!roleOverride;

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`${API_URL}/permissions`, { role, userId, modules: draft }, authHeader());
            await fetchOverrides();
            onMessage(`${targetName} permissions saved successfully`, 'success');
        } catch (err) {
            const reason = err.response?.data?.message || err.message;
            onMessage(`${targetName} permissions not saved: ${reason}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        const target = selectedUser ? `${selectedUser.name} to ${role} default` : `${role} to original default`;
        if (!window.confirm(`Reset ${target}?`)) return;
        setSaving(true);
        try {
            await axios.post(`${API_URL}/permissions/reset`, { role, userId }, authHeader());
            await fetchOverrides();
            onMessage(`${targetName} permissions reset to default`, 'success');
        } catch (err) {
            const reason = err.response?.data?.message || err.message;
            onMessage(`${targetName} permissions not reset: ${reason}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    // Sirf sidebar links on/off hote hain, andar ke actions waise hi rehte hain
    const setAll = (value) => {
        const next = { ...draft };
        PERMISSION_MODULES.forEach(m => { next[m.key] = value; });
        updateDraft(next);
    };

    const enabledCount = PERMISSION_MODULES.filter(m => draft[m.key]).length;
    const popupModule = popup ? PERMISSION_MODULES.find(m => m.key === popup.key) : null;
    const popupSelected = popupModule ? actionKeys(popupModule).filter(k => draft[k]).length : 0;

    return (
        <div className="settings-card perm-card">
            <div className="settings-card-header">
                <div className="settings-card-title-wrap">
                    <div className="settings-card-icon">
                        <ShieldCheckIcon size={16} />
                    </div>
                    <h3 className="settings-card-title">Roles & Permissions (Sidebar Access)</h3>
                </div>
                <span className="settings-card-count">{enabledCount}/{PERMISSION_MODULES.length}</span>
            </div>

            <div className="perm-toolbar">
                <div className="perm-field">
                    <label className="settings-fee-label">Role</label>
                    <CustomSelect
                        value={role}
                        onChange={v => { setRole(v); setUserId(''); }}
                        options={[
                            { value: 'admin', label: 'Admin' },
                            { value: 'team', label: 'Team' }
                        ]}
                    />
                </div>
                <div className="perm-field perm-field-name">
                    <label className="settings-fee-label">Name</label>
                    <CustomSelect
                        value={userId}
                        onChange={setUserId}
                        options={[
                            { value: '', label: `${role === 'admin' ? 'All Admins' : 'All Team'} (default)` },
                            ...roleUsers.map(u => ({
                                value: String(u._id),
                                label: `${u.name}${u.category ? ` (${u.category})` : ''}${findOverride(role, String(u._id)) ? ' - custom' : ''}`
                            }))
                        ]}
                    />
                </div>
                <div className="perm-bulk">
                    <button type="button" className="perm-link-btn" onClick={() => setAll(true)}>All on</button>
                    <button type="button" className="perm-link-btn" onClick={() => setAll(false)}>All off</button>
                </div>
            </div>

            <p className="settings-fee-desc" style={{ marginTop: 0, marginBottom: 14 }}>
                {selectedUser
                    ? (userOverride
                        ? `${selectedUser.name} has custom permissions.`
                        : `${selectedUser.name} is using the ${role} default. Saving will create custom permissions for ${selectedUser.name}.`)
                    : `Applies to every ${role} member without custom permissions. Superadmin always sees everything.`}
            </p>

            <div className="perm-grid">
                {PERMISSION_MODULES.map(m => {
                    const Icon = m.icon;
                    const isOn = !!draft[m.key];
                    const isOpen = popup?.key === m.key;
                    const actionsOn = (m.actions || []).filter(a => draft[`${m.key}:${a.key}`]).length;
                    return (
                        <div
                            key={m.key}
                            className={`perm-item ${isOn ? 'perm-item-on' : ''} ${isOpen ? 'perm-item-open' : ''}`}
                        >
                            <div className="perm-item-row">
                                <span className="perm-item-name">
                                    <Icon size={14} />
                                    {m.label}
                                </span>
                                <div className="perm-item-controls">
                                    {/* Page ke andar ke options, sirf tab jab link on ho */}
                                    {isOn && m.actions && (
                                        <button
                                            type="button"
                                            className={`perm-options-btn ${isOpen ? 'active' : ''}`}
                                            onClick={() => openPopup(m, draft)}
                                            title="Page options"
                                        >
                                            Options {actionsOn}/{m.actions.length}
                                        </button>
                                    )}
                                    <label className="perm-switch">
                                        <input
                                            type="checkbox"
                                            checked={isOn}
                                            onChange={e => {
                                                const next = { ...draft, [m.key]: e.target.checked };
                                                // On karte hi popup khule taaki options choose ho sakein
                                                if (e.target.checked && m.actions) openPopup(m, next);
                                                updateDraft(next);
                                            }}
                                        />
                                        <span className="perm-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {popupModule && (
                <div className="perm-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) cancelPopup(); }}>
                    <div className="perm-modal" role="dialog" aria-modal="true">
                        <div className="perm-modal-header">
                            <div className="perm-modal-title">{popupModule.label}</div>
                            <div className="perm-modal-sub">{targetName}: page options</div>
                        </div>

                        <div className="perm-mode">
                            <label className={`perm-mode-option ${popup.mode === 'all' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="perm-mode"
                                    checked={popup.mode === 'all'}
                                    onChange={() => choosePopupMode(popupModule, 'all')}
                                />
                                <span>
                                    <strong>All options</strong>
                                    <small>All {popupModule.actions.length} options on</small>
                                </span>
                            </label>
                            <label className={`perm-mode-option ${popup.mode === 'custom' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="perm-mode"
                                    checked={popup.mode === 'custom'}
                                    onChange={() => choosePopupMode(popupModule, 'custom')}
                                />
                                <span>
                                    <strong>Custom options</strong>
                                    <small>Select options below</small>
                                </span>
                            </label>
                        </div>

                        <ul className="perm-actions perm-modal-list">
                            {popupModule.actions.map(a => {
                                const key = `${popupModule.key}:${a.key}`;
                                return (
                                    <li key={key}>
                                        <label className={`perm-action-row ${popup.mode === 'all' ? 'perm-action-locked' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={!!draft[key]}
                                                disabled={popup.mode === 'all'}
                                                onChange={e => updateDraft({ ...draft, [key]: e.target.checked })}
                                            />
                                            <span>{a.label}</span>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="perm-modal-footer">
                            <span className="perm-modal-count">{popupSelected}/{popupModule.actions.length} selected</span>
                            <button type="button" className="perm-reset-btn" onClick={cancelPopup}>Cancel</button>
                            <button type="button" className="settings-btn-save" onClick={() => setPopup(null)}>Done</button>
                        </div>
                        <p className="perm-modal-hint">After Done, click <strong>Save Permissions</strong> below.</p>
                    </div>
                </div>
            )}

            <div className="perm-footer">
                {/* Saved / error ka message upar toast me aata hai; yahan sirf unsaved badlav ka hint */}
                {!saving && isDirty && (
                    <span className="perm-status perm-status-dirty">{changedCount} unsaved {changedCount === 1 ? 'change' : 'changes'}, click Save Permissions</span>
                )}
                <div className="perm-footer-actions">
                    <button type="button" className="perm-reset-btn" onClick={handleReset} disabled={saving || !hasOwnOverride}>
                        Reset to default
                    </button>
                    <button type="button" className="settings-btn-save perm-save-btn" onClick={handleSave} disabled={saving || !isDirty}>
                        {saving ? 'Saving...' : 'Save Permissions'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RolePermissionsCard;
