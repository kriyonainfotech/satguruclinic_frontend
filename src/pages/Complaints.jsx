import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { PlusIcon, XIcon, TrashIcon, EditIcon, MessageSquareIcon, HeartPulseIcon, UsersIcon, AlertTriangleIcon } from '../components/Icons';
import CustomSelect from '../components/CustomSelect';
import usePermissions from '../permissions/usePermissions';
import './Complaints.css';

// Complaint ki 3 category, har ek ka rang aur icon alag
const CATEGORIES = [
  { value: 'patient', label: 'Patient Complaint', hint: 'Issue raised by a patient', icon: HeartPulseIcon },
  { value: 'team', label: 'Team Complaint', hint: 'Issue about staff / team', icon: UsersIcon },
  { value: 'error', label: 'Error', hint: 'Mistake or system error', icon: AlertTriangleIcon }
];
const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' }
];
const categoryOf = (value) => CATEGORIES.find(c => c.value === value) || CATEGORIES[0];
const statusLabel = (value) => (STATUSES.find(s => s.value === value) || STATUSES[0]).label;

const formatDateTime = (value) => new Date(value).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

const Complaints = () => {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  const { can } = usePermissions();
  const perm = (action) => can('complaints:' + action);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUser.userId || currentUser._id || currentUser.id || '';
  // Apni complaint edit kar sake, dusre ki tabhi jab sabki complaints dikhti ho
  const canEditComplaint = (c) => perm('edit') && ((c.createdBy?._id || c.createdBy) === currentUserId || perm('view-all'));

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = nayi complaint
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await axios.get(`${API_URL}/complaints`, authHeader());
      setComplaints(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching complaints', err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setEditingId(null);
    setCategory('');
    setDescription('');
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (complaint) => {
    setEditingId(complaint._id);
    setCategory(complaint.category);
    setDescription(complaint.description);
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category) return setFormError('Please select a category.');
    if (!description.trim()) return setFormError('Please write the complaint details.');
    setSaving(true);
    setFormError('');
    try {
      const body = { category, description: description.trim() };
      if (editingId) {
        const res = await axios.put(`${API_URL}/complaints/${editingId}`, body, authHeader());
        setComplaints(prev => prev.map(c => (c._id === editingId ? res.data : c)));
      } else {
        const res = await axios.post(`${API_URL}/complaints`, body, authHeader());
        setComplaints(prev => [res.data, ...prev]);
      }
      setShowModal(false);
    } catch (err) {
      setFormError(err.response?.data?.message || (editingId ? 'Could not update complaint.' : 'Could not submit complaint.'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await axios.patch(`${API_URL}/complaints/${id}/status`, { status }, authHeader());
      setComplaints(prev => prev.map(c => (c._id === id ? res.data : c)));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this complaint?')) return;
    try {
      await axios.delete(`${API_URL}/complaints/${id}`, authHeader());
      setComplaints(prev => prev.filter(c => c._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete complaint.');
    }
  };

  const counts = useMemo(() => {
    const result = { all: complaints.length };
    CATEGORIES.forEach(c => { result[c.value] = complaints.filter(x => x.category === c.value).length; });
    return result;
  }, [complaints]);

  const visible = complaints.filter(c =>
    (filter === 'all' || c.category === filter) && (statusFilter === 'all' || c.status === statusFilter)
  );

  return (
    <div className="task-page-container complaints-page">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h2>Complaint Box</h2>
          <p className="complaints-subtitle">
            {perm('view-all') ? 'All complaints from the team' : 'Your complaints'}
          </p>
        </div>
        {perm('create') && (
          <button onClick={openModal} className="crm-btn crm-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusIcon size={16} /> New Complaint
          </button>
        )}
      </div>

      <div className="complaints-toolbar">
        <div className="complaints-tabs">
          <button type="button" className={`complaints-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            All <span>{counts.all}</span>
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              type="button"
              className={`complaints-tab cat-${c.value} ${filter === c.value ? 'active' : ''}`}
              onClick={() => setFilter(c.value)}
            >
              {c.label} <span>{counts[c.value]}</span>
            </button>
          ))}
        </div>
        <div className="complaints-status-filter">
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[{ value: 'all', label: 'All Status' }, ...STATUSES]}
          />
        </div>
      </div>

      {loading ? (
        <div className="complaints-empty">Loading complaints...</div>
      ) : visible.length === 0 ? (
        <div className="complaints-empty">
          <MessageSquareIcon size={44} color="#cbd5e1" />
          <h3>No Complaints</h3>
          <p>{complaints.length === 0 ? 'No complaint has been added yet.' : 'No complaint matches this filter.'}</p>
          {perm('create') && complaints.length === 0 && (
            <button onClick={openModal} className="crm-btn crm-btn-primary">New Complaint</button>
          )}
        </div>
      ) : (
        <div className="complaints-list">
          {visible.map(c => {
            const cat = categoryOf(c.category);
            const Icon = cat.icon;
            return (
              <div key={c._id} className={`complaint-card cat-${c.category}`}>
                <div className="complaint-card-top">
                  <span className={`complaint-cat-badge cat-${c.category}`}>
                    <Icon size={13} /> {cat.label}
                  </span>
                  <div className="complaint-card-actions">
                    {perm('status') ? (
                      <div className={`complaint-status-select status-${c.status}`}>
                        <CustomSelect
                          value={c.status}
                          onChange={(status) => handleStatusChange(c._id, status)}
                          options={STATUSES}
                        />
                      </div>
                    ) : (
                      <span className={`complaint-status-badge status-${c.status}`}>{statusLabel(c.status)}</span>
                    )}
                    {canEditComplaint(c) && (
                      <button type="button" className="complaint-edit-btn" title="Edit" onClick={() => openEditModal(c)}>
                        <EditIcon size={14} />
                      </button>
                    )}
                    {perm('delete') && (
                      <button type="button" className="complaint-delete-btn" title="Delete" onClick={() => handleDelete(c._id)}>
                        <TrashIcon size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <p className="complaint-text">{c.description}</p>

                <div className="complaint-meta">
                  <span>By <strong>{c.createdBy?.name || 'Unknown'}</strong>{c.createdBy?.role ? ` (${c.createdBy.role})` : ''}</span>
                  <span>{formatDateTime(c.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => !saving && setShowModal(false)}>
          <div className="modal-content complaint-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Edit Complaint' : 'New Complaint'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)} disabled={saving} aria-label="Close">
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="complaint-field-label">Category</label>
              <div className="complaint-cat-options">
                {CATEGORIES.map(c => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      className={`complaint-cat-option cat-${c.value} ${category === c.value ? 'selected' : ''}`}
                      onClick={() => { setCategory(c.value); setFormError(''); }}
                    >
                      <Icon size={20} />
                      <strong>{c.label}</strong>
                      <small>{c.hint}</small>
                    </button>
                  );
                })}
              </div>

              <label className="complaint-field-label" htmlFor="complaint-description">Details</label>
              <textarea
                id="complaint-description"
                className="complaint-textarea"
                rows="5"
                maxLength={2000}
                placeholder="Write what happened..."
                value={description}
                onChange={e => { setDescription(e.target.value); setFormError(''); }}
              />

              {formError && <div className="complaint-form-error">{formError}</div>}

              <div className="modal-footer" style={{ marginTop: '16px' }}>
                <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="crm-btn crm-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Submit Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Complaints;
