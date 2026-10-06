import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import CustomSelect from '../components/CustomSelect';
import CalendarPicker, { formatDateToISO } from '../components/CalendarPicker';
import { EditIcon, TrashIcon, KeyIcon, XIcon, MailIcon, PhoneIcon } from '../components/Icons';
import { sanitizeMobileNumber, isValidMobileNumber } from '../utils/validation';
import '../App.css';

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [category, setCategory] = useState('');
  const [salary, setSalary] = useState('');
  const [message, setMessage] = useState('');

  // Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [adminCategories, setAdminCategories] = useState([]);

  useEffect(() => {
    fetchAdmins();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/settings`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data && res.data.adminCategories) {
        setAdminCategories(res.data.adminCategories);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const openPasswordModal = (admin) => {
    setSelectedUserForPassword(admin);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMessage('');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      setPasswordMessage('Password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Passwords do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/auth/users/${selectedUserForPassword._id}/password`,
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordMessage('Password updated successfully!');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordMessage('');
      }, 1200);
    } catch (error) {
      setPasswordMessage(error.response?.data?.message || 'Error updating password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/users/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdmins(res.data);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setName(''); setEmail(''); setPassword(''); setMobile(''); setBirthDate(''); setCategory(''); setSalary(''); setMessage('');
    setShowModal(true);
  };

  const openEditModal = (admin) => {
    setIsEditMode(true);
    setEditingId(admin._id);
    setName(admin.name);
    setEmail(admin.email);
    setMobile(admin.mobile || '');
    setCategory(admin.category || '');
    setSalary(admin.salary || '');
    setBirthDate(admin.birthDate ? formatDateToISO(new Date(admin.birthDate)) : '');
    setPassword('');
    setMessage('');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/auth/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAdmins();
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Error deleting admin: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleMobileChange = (e) => {
    const cleaned = sanitizeMobileNumber(e.target.value);
    setMobile(cleaned);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mobile && !isValidMobileNumber(mobile)) {
      setMessage('Mobile number must be exactly 10 digits');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (isEditMode) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/auth/users/${editingId}`, {
          name, email, mobile, category, salary: Number(salary) || 0
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Admin updated successfully!');
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/register`, {
          name, email, password, mobile, role: 'admin', category, salary: Number(salary) || 0
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Admin created successfully!');
      }
      
      fetchAdmins();
      setTimeout(() => {
        setShowModal(false);
        setMessage('');
      }, 1500);
    } catch (error) {
      setMessage(error.response?.data?.message || `Error ${isEditMode ? 'updating' : 'creating'} admin`);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '16px' }}>
          <h2>Admin Management</h2>
          <button onClick={openCreateModal} className="crm-btn crm-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            + Create Admin
          </button>
        </div>

      {/* Desktop Table View */}
      <div className="desktop-table-wrap">
        <div className="table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Admin Member</th>
                <th>Email Address</th>
                <th>Mobile</th>
                <th>Role / Category</th>
                <th style={{ textAlign: 'right', paddingRight: '22px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? ( <tr><td colSpan="5" style={{ textAlign: "center", padding: "36px 20px", color: "#94a3b8" }}><div className="global-loader-container"><div className="global-spinner"></div><div>Loading admins...</div></div></td></tr> ) : admins.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '36px 20px', color: '#94a3b8' }}>
                    No admins found.
                  </td>
                </tr>
              ) : (
                admins.map(admin => (
                  <tr key={admin._id}>
                    <td>
                      <div className="tbl-user-cell">
                        <div className="tbl-user-avatar">
                          {admin.name ? admin.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div className="tbl-user-info">
                          <span className="tbl-user-name">{admin.name}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="tbl-email-text">{admin.email}</span>
                    </td>
                    <td>
                      <span className="tbl-mobile-text">{admin.mobile || '—'}</span>
                    </td>
                    <td>
                      <span className="tbl-role-badge badge-admin">
                        {admin.role} {admin.category ? `• ${admin.category}` : ''}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                      <button className="action-btn key" title="Change Password" aria-label="Change Password" onClick={() => openPasswordModal(admin)}>
                        <KeyIcon size={16} />
                      </button>
                      <button className="action-btn edit" title="Edit" aria-label="Edit" onClick={() => openEditModal(admin)}>
                        <EditIcon size={16} />
                      </button>
                      <button className="action-btn delete" title="Delete" aria-label="Delete" onClick={() => handleDelete(admin._id)}>
                        <TrashIcon size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {admins.length > 0 && (
            <div className="table-footer-bar">
              <span>Total Admins: <strong>{admins.length}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Responsive Card View for Mobile/Tablet */}
      <div className="mobile-cards-wrap">
        <div className="crm-card-view">
          {loading ? <div className="empty-state"><div className="global-loader-container"><div className="global-spinner"></div><div>Loading admins...</div></div></div> : admins.length === 0 ? <p style={{ padding: "24px", color: "#64748b", textAlign: "center" }}>No admins found.</p> : (
            admins.map(admin => (
              <div className="tm-card" key={admin._id}>
                <div className="tm-card-top">
                  <div className="tm-card-user-row">
                    <div className="tm-avatar">{admin.name.charAt(0).toUpperCase()}</div>
                    <div className="tm-card-info">
                      <span className="tm-name">{admin.name}</span>
                      {admin.category && (
                        <span className="tm-category-sub">{admin.category}</span>
                      )}
                    </div>
                  </div>
                  <span className="tm-role-badge badge-admin">Admin</span>
                </div>

                <div className="tm-card-meta">
                  <div className="tm-meta-item">
                    <MailIcon size={13} color="#64748b" />
                    <span title={admin.email}>{admin.email}</span>
                  </div>
                  <div className="tm-meta-item">
                    <PhoneIcon size={13} color="#64748b" />
                    <span>{admin.mobile || '—'}</span>
                  </div>
                </div>

                <div className="tm-card-actions">
                  <button className="tm-action-btn key" title="Change Password" onClick={() => openPasswordModal(admin)}>
                    <KeyIcon size={15} />
                  </button>
                  <button className="tm-action-btn edit" title="Edit" onClick={() => openEditModal(admin)}>
                    <EditIcon size={15} />
                  </button>
                  <button className="tm-action-btn delete" title="Delete" onClick={() => handleDelete(admin._id)}>
                    <TrashIcon size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{isEditMode ? 'Edit Admin' : 'Create New Admin'}</h3>
              <button className="modal-close" title="Close" aria-label="Close" onClick={() => setShowModal(false)}>
                <XIcon size={16} />
              </button>
            </div>
            {message && (
              <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: message.includes('success') ? '#f0fdf4' : '#fef2f2', color: message.includes('success') ? '#166534' : '#991b1b', border: `1px solid ${message.includes('success') ? '#bbf7d0' : '#fecaca'}` }}>
                {message}
              </div>
            )}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <FormInput label="Name" placeholder="Enter admin name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <FormInput type="email" label="Email Address" placeholder="Enter email address" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <FormInput
                  type="tel"
                  label="Mobile Number"
                  placeholder="Enter 10-digit mobile number"
                  value={mobile}
                  onChange={handleMobileChange}
                  maxLength={10}
                  pattern="[0-9]{10}"
                  inputMode="numeric"
                  required
                />
              </div>
              <div>
                <div className="crm-input-group">
                  <label className="crm-input-label">Category</label>
                  <CustomSelect 
                    value={category} 
                    onChange={val => setCategory(val)} 
                    placeholder="Select Category"
                    options={adminCategories.map(cat => ({ value: cat, label: cat }))}
                  />
                </div>
              </div>

              <div>
                <FormInput 
                  type="number" 
                  label="Monthly Salary (₹)" 
                  placeholder="Enter fixed salary" 
                  value={salary} 
                  onChange={e => setSalary(e.target.value)} 
                />
              </div>

              {!isEditMode && (
                <div>
                  <FormInput type="password" label="Password" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="crm-btn crm-btn-primary">
                  {isEditMode ? 'Update Admin' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && selectedUserForPassword && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <KeyIcon size={18} style={{ color: '#d97706' }} />
                Change Password
              </h3>
              <button className="modal-close" title="Close" aria-label="Close" onClick={() => setShowPasswordModal(false)}>
                <XIcon size={16} />
              </button>
            </div>
            
            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px', fontSize: '13px', color: '#475569' }}>
              Set new password for <strong style={{ color: '#0f172a' }}>{selectedUserForPassword.name}</strong> ({selectedUserForPassword.email})
            </div>

            {passwordMessage && (
              <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: passwordMessage.includes('success') ? '#f0fdf4' : '#fef2f2', color: passwordMessage.includes('success') ? '#166534' : '#991b1b', border: `1px solid ${passwordMessage.includes('success') ? '#bbf7d0' : '#fecaca'}` }}>
                {passwordMessage}
              </div>
            )}
            
            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <FormInput
                type="password"
                label="New Password"
                placeholder="Enter new password (min 4 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <FormInput
                type="password"
                label="Confirm Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <div className="modal-footer">
                <button type="button" className="crm-btn crm-btn-secondary" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="crm-btn crm-btn-primary" disabled={passwordLoading}>
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;


