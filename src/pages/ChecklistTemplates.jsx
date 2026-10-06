import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { EditIcon, TrashIcon, ClipboardListIcon, PlusIcon, XIcon } from '../components/Icons';
import './ChecklistTemplates.css';

const ChecklistTemplates = () => {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  const [title, setTitle] = useState('');
  const [items, setItems] = useState([]);
  const [newItemText, setNewItemText] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API_URL}/checklists`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (Array.isArray(res.data)) {
        setTemplates(res.data);
      } else {
        setTemplates([]);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setTitle('');
    setItems([]);
    setNewItemText('');
    setIsEdit(false);
    setCurrentId(null);
    setShowModal(true);
  };

  const openEditModal = (template) => {
    setTitle(template.title);
    setItems(template.items || []);
    setNewItemText('');
    setIsEdit(true);
    setCurrentId(template._id);
    setShowModal(true);
  };

  const handleAddItem = () => {
    if (newItemText.trim()) {
      setItems([...items, { text: newItemText.trim() }]);
      setNewItemText('');
    }
  };

  const handleRemoveItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert('Template Title is required');
    if (items.length === 0) return alert('At least one item is required');

    try {
      const payload = { title, items };
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };

      if (isEdit) {
        await axios.put(`${API_URL}/checklists/${currentId}`, payload, config);
      } else {
        await axios.post(`${API_URL}/checklists`, payload, config);
      }
      
      setShowModal(false);
      fetchTemplates();
    } catch (err) {
      console.error(err);
      alert('Error saving template');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await axios.delete(`${API_URL}/checklists/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchTemplates();
      } catch (err) {
        console.error(err);
        alert('Error deleting template');
      }
    }
  };

  return (
    <div className="task-page-container checklist-page-container">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Checklist Templates</h2>
          
        </div>
        <button onClick={openAddModal} className="crm-btn crm-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PlusIcon size={16} /> Add Template
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading templates...</div>
      ) : (
        <div className="checklist-grid">
          {templates.map(t => (
            <div key={t._id} className="checklist-card">
              <div className="checklist-card-header">
                <div className="checklist-card-title">
                  <div className="icon-wrapper">
                    <ClipboardListIcon size={18} />
                  </div>
                  <div>
                    <h3>{t.title}</h3>
                    <span className="created-date">Created {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className="checklist-card-actions">
                  <button onClick={() => openEditModal(t)} title="Edit"><EditIcon size={15} /></button>
                  <button onClick={() => handleDelete(t._id)} title="Delete"><TrashIcon size={15} /></button>
                </div>
              </div>
              
              <div className="checklist-card-body">
                <div className="items-count">ITEMS ({t.items?.length || 0})</div>
                <ul className="checklist-items-preview">
                  {(t.items || []).slice(0, 3).map((item, idx) => (
                    <li key={idx}>
                      <span className="check-circle"></span>
                      <span className="item-text">{item.text}</span>
                    </li>
                  ))}
                  {(t.items?.length || 0) > 3 && (
                    <li className="more-items" onClick={() => openEditModal(t)} style={{ cursor: 'pointer', color: '#0284c7' }}>+{t.items.length - 3} more item(s)</li>
                  )}
                </ul>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <ClipboardListIcon size={48} color="#cbd5e1" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', color: '#334155', marginBottom: '8px' }}>No Templates Found</h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>Create your first checklist template to get started.</p>
              <button onClick={openAddModal} className="crm-btn crm-btn-primary">Add Template</button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content checklist-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isEdit ? 'Edit Template' : 'Add New Template'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <XIcon size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Template Title</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="e.g. Traffic Ad Setup"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    autoFocus
                  />
                </div>
                
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Checklist Items</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input 
                      type="text" 
                      value={newItemText} 
                      onChange={e => setNewItemText(e.target.value)} 
                      placeholder="Add a new item..."
                      style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddItem();
                        }
                      }}
                    />
                    <button type="button" onClick={handleAddItem} className="crm-btn crm-btn-primary" style={{ padding: '0 16px', borderRadius: '6px' }}>
                      Add
                    </button>
                  </div>
                  
                  <div className="items-list-container" style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', minHeight: '120px', maxHeight: '280px', overflowY: 'auto', border: '1px dashed #cbd5e1' }}>
                    {items.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13.5px', marginTop: '30px' }}>No items added yet</div>
                    ) : (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {items.map((item, idx) => (
                          <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', marginBottom: 0, borderLeft: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '14px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="check-circle"></span> {item.text}
                            </span>
                            <button type="button" onClick={() => handleRemoveItem(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' }}>
                              <XIcon size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="crm-btn crm-btn-outline" style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569' }}>Cancel</button>
                <button type="submit" className="crm-btn crm-btn-primary">{isEdit ? 'Save Changes' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistTemplates;






