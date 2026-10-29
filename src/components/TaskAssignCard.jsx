import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ClipboardListIcon } from './Icons';

// Website Settings ke andar "Task Assign Permissions" card.
// Table: row = kaun task assign kare (Admin / Senior / Junior), column = kisko de sakta hai.
// Khud ko hamesha de sakte hain, superadmin ko koi nahi de sakta. Superadmin sabko de sakta hai.
// NOTE: backend/utils/taskAssign.js me bhi same levels aur defaults hain, dono sync rakhna.
const LEVELS = [
    { key: 'admin', single: 'Admin', plural: 'Admins' },
    { key: 'senior', single: 'Senior', plural: 'Seniors' },
    { key: 'junior', single: 'Junior', plural: 'Juniors' }
];

const DEFAULT_MATRIX = {
    admin: { admin: false, senior: true, junior: true },
    senior: { admin: false, senior: false, junior: true },
    junior: { admin: false, senior: false, junior: false }
};

const sameMatrix = (a, b) => LEVELS.every(from => LEVELS.every(to => !!a?.[from.key]?.[to.key] === !!b?.[from.key]?.[to.key]));

const TaskAssignCard = ({ onMessage }) => {
    const [saved, setSaved] = useState(DEFAULT_MATRIX);
    const [draft, setDraft] = useState(DEFAULT_MATRIX);
    const [saving, setSaving] = useState(false);

    const API_URL = import.meta.env.VITE_API_BASE_URL;
    const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    useEffect(() => {
        fetchMatrix();
    }, []);

    const fetchMatrix = async () => {
        try {
            const res = await axios.get(`${API_URL}/permissions/task-assign`, authHeader());
            setSaved(res.data.matrix);
            setDraft(res.data.matrix);
        } catch (err) {
            console.error('Error fetching task assign permissions', err);
        }
    };

    const toggle = (from, to) => {
        setDraft(prev => ({ ...prev, [from]: { ...prev[from], [to]: !prev[from][to] } }));
    };

    const save = async (matrix) => {
        setSaving(true);
        try {
            const res = await axios.put(`${API_URL}/permissions/task-assign`, { matrix }, authHeader());
            setSaved(res.data.matrix);
            setDraft(res.data.matrix);
            onMessage(matrix === null ? 'Task assign permissions reset to default' : 'Task assign permissions saved successfully', 'success');
        } catch (err) {
            const reason = err.response?.data?.message || err.message;
            onMessage(`Task assign permissions not saved: ${reason}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (!window.confirm('Reset task assign permissions to default?')) return;
        save(null);
    };

    const isDirty = !sameMatrix(draft, saved);
    const isDefault = sameMatrix(saved, DEFAULT_MATRIX);

    // "Seniors can assign tasks to: themselves, Seniors and Juniors"
    const rowSummary = (from) => {
        const targets = LEVELS.filter(to => draft[from.key][to.key]).map(to => to.plural);
        const list = ['themselves', ...targets];
        const text = list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0];
        return `${from.plural} can assign tasks to ${text}${targets.length === 0 ? ' only' : ''}.`;
    };

    return (
        <div className="settings-card task-assign-card">
            <div className="settings-card-header">
                <div className="settings-card-title-wrap">
                    <div className="settings-card-icon">
                        <ClipboardListIcon size={16} />
                    </div>
                    <h3 className="settings-card-title">Task Assign Permissions</h3>
                </div>
            </div>

            <p className="settings-fee-desc" style={{ marginTop: 0, marginBottom: 14 }}>
                Choose who can assign tasks to whom. Tick a box to allow it.
            </p>

            <div className="task-assign-table-wrap">
                <table className="task-assign-table">
                    <thead>
                        <tr>
                            <th className="task-assign-corner">
                                <span>Who assigns ↓</span>
                                <span>Can assign to →</span>
                            </th>
                            {LEVELS.map(to => <th key={to.key}>{to.plural}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {LEVELS.map(from => (
                            <tr key={from.key}>
                                <th className="task-assign-row-head">{from.single}</th>
                                {LEVELS.map(to => {
                                    const checked = !!draft[from.key][to.key];
                                    const changed = checked !== !!saved[from.key][to.key];
                                    return (
                                        <td key={to.key} className={changed ? 'task-assign-changed' : ''}>
                                            <label className="task-assign-check" title={`${from.single} can assign tasks to ${to.plural}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggle(from.key, to.key)}
                                                />
                                            </label>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ul className="task-assign-summary">
                {LEVELS.map(from => <li key={from.key}>{rowSummary(from)}</li>)}
            </ul>

            <p className="task-assign-note">
                Everyone can always assign tasks to themselves. Superadmin can assign to anyone, and nobody can assign tasks to Superadmin.
            </p>

            <div className="perm-footer">
                {!saving && isDirty && (
                    <span className="perm-status perm-status-dirty">Unsaved changes, click Save</span>
                )}
                <div className="perm-footer-actions">
                    <button type="button" className="perm-reset-btn" onClick={handleReset} disabled={saving || isDefault}>
                        Reset to default
                    </button>
                    <button type="button" className="settings-btn-save perm-save-btn" onClick={() => save(draft)} disabled={saving || !isDirty}>
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskAssignCard;
