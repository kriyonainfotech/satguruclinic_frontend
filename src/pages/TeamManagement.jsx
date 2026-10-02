import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import CustomSelect from '../components/CustomSelect';
import CustomTimePicker from '../components/CustomTimePicker';
import CalendarPicker, { formatDateToISO } from '../components/CalendarPicker';
import { EditIcon, TrashIcon, KeyIcon, XIcon, MailIcon, PhoneIcon, PlusIcon, UserIcon, ClockIcon } from '../components/Icons';
import { sanitizeMobileNumber, isValidMobileNumber } from '../utils/validation';
import { formatDisplayTime } from '../utils/formatDate';
import '../App.css';

const formatTime12Hour = (time24) => {
  if (!time24) return '';
  return formatDisplayTime(time24);
};

const TeamManagement = () => {
  const [teamMembers, setTeamMembers] = useState([]);
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
  const [timingType, setTimingType] = useState('normal');
  const [timings, setTimings] = useState([{ startTime: '', endTime: '' }]);
  const [message, setMessage] = useState('');

  // Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [teamCategories, setTeamCategories] = useState([]);

  useEffect(() => {
    fetchTeamMembers();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/settings`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data && res.data.teamCategories) {
        setTeamCategories(res.data.teamCategories);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const openPasswordModal = (user) => {
    setSelectedUserForPassword(user);
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

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/users/team`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamMembers(res.data);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setName(''); setEmail(''); setPassword(''); setMobile(''); setBirthDate(''); setCategory(''); setSalary(''); 
    setTimingType('normal'); setTimings([{ startTime: '', endTime: '' }]);
    setMessage('');
    setShowModal(true);
  };

  const openEditModal = (member) => {
    setIsEditMode(true);
    setEditingId(member._id);
    setName(member.name);
    setEmail(member.email);
    setMobile(member.mobile || '');
    setBirthDate(member.birthDate ? formatDateToISO(new Date(member.birthDate)) : '');
    setCategory(member.category || '');
    setSalary(member.salary || '');
    setTimingType(member.timingType || 'normal');
    setTimings(member.timings && member.timings.length > 0 ? member.timings : [{ startTime: '', endTime: '' }]);
    setPassword(''); 
    setMessage('');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this team member?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/auth/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTeamMembers();
    } catch (error) {
      console.error('Error deleting team member:', error);
      alert('Error deleting team member: ' + (error.response?.data?.message || error.message));
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
    
    // Filter out empty timings
    const validTimings = timings.filter(t => t.startTime && t.endTime);
    if (timingType === 'shift' && validTimings.length === 0) {
      setMessage('Please enter at least one valid shift timing');
      return;
    }
    if (timingType === 'normal' && validTimings.length === 0) {
      setMessage('Please enter normal start and end time');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (isEditMode) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/auth/users/${editingId}`, {
          name, email, mobile, category, salary: Number(salary) || 0, timingType, timings: validTimings
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Team member updated successfully!');
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/register`, {
          name, email, password, mobile, role: 'team', category, salary: Number(salary) || 0, timingType, timings: validTimings
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Team member created successfully!');
      }
      
      fetchTeamMembers();
      setTimeout(() => {
        setShowModal(false);
        setMessage('');
      }, 1500);
    } catch (error) {
      setMessage(error.response?.data?.message || `Error ${isEditMode ? 'updating' : 'creating'} team member`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Team Management</h2>
        <Button onClick={openCreateModal}>+ Create Team Member</Button>
      </div>

      {/* Desktop Table View */}
      <div className="desktop-table-wrap">
        <div className="table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Team Member</th>
                <th>Email Address</th>
                <th>Mobile</th>
                <th>Role / Category</th>
                <th>Timings</th>
                <th style={{ textAlign: 'right', paddingRight: '22px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px 20px', color: '#94a3b8' }}>
                    No team members found.
                  </td>
                </tr>
              ) : (
                teamMembers.map(member => {
                  const roleClass = member.role === 'admin' ? 'badge-admin' : (member.category === 'Doctor' ? 'badge-doctor' : (member.category === 'Receptionist' ? 'badge-receptionist' : 'badge-team'));
                  return (
                    <tr key={member._id}>
                      <td>
                        <div className="tbl-user-cell">
                          <div className="tbl-user-avatar">
                            {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="tbl-user-info">
                            <span className="tbl-user-name">{member.name}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="tbl-email-text">{member.email}</span>
                      </td>
                      <td>
                        <span className="tbl-mobile-text">{member.mobile || '—'}</span>
                      </td>
                      <td>
                        <span className={`tbl-role-badge ${roleClass}`}>
                          {member.role} {member.category ? `• ${member.category}` : ''}
                        </span>
                      </td>
                      <td>
                        {member.timingType === 'shift' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                            {member.timings && member.timings.map((t, i) => (
                              <div key={i} className="tbl-timing-pill">
                                <ClockIcon size={12} />
                                <span>{formatTime12Hour(t.startTime)} - {formatTime12Hour(t.endTime)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="tbl-timing-pill">
                            <ClockIcon size={12} />
                            <span>{member.timings && member.timings[0] ? `${formatTime12Hour(member.timings[0].startTime)} - ${formatTime12Hour(member.timings[0].endTime)}` : '—'}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <button className="action-btn key" title="Change Password" aria-label="Change Password" onClick={() => openPasswordModal(member)}>
                          <KeyIcon size={16} />
                        </button>
                        <button className="action-btn edit" title="Edit" aria-label="Edit" onClick={() => openEditModal(member)}>
                          <EditIcon size={16} />
                        </button>
                        <button className="action-btn delete" title="Delete" aria-label="Delete" onClick={() => handleDelete(member._id)}>
                          <TrashIcon size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {teamMembers.length > 0 && (
            <div className="table-footer-bar">
              <span>Total Team Members: <strong>{teamMembers.length}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Responsive Card View for Mobile/Tablet */}
      <div className="mobile-cards-wrap">
        <div className="crm-card-view">
          {teamMembers.length === 0 ? <p style={{ padding: '24px', color: '#64748b', textAlign: 'center' }}>No team members found.</p> : (
            teamMembers.map(member => (
              <div className="tm-card" key={member._id}>
                {/* Top: Avatar + Name + Role */}
                <div className="tm-card-top">
                  <div className="tm-card-user-row">
                    <div className="tm-avatar">{member.name.charAt(0).toUpperCase()}</div>
                    <div className="tm-card-info">
                      <span className="tm-name">{member.name}</span>
                      {member.category && (
                        <span className="tm-category-sub">{member.category}</span>
                      )}
                    </div>
                  </div>
                  <span className="tm-role-badge badge-team">Team</span>
                </div>

                {/* Middle: Email, Phone, & Timings */}
                <div className="tm-card-meta">
                  <div className="tm-meta-item">
                    <MailIcon size={13} color="#64748b" />
                    <span title={member.email}>{member.email}</span>
                  </div>
                  <div className="tm-meta-item">
                    <PhoneIcon size={13} color="#64748b" />
                    <span>{member.mobile || '—'}</span>
                  </div>
                  
                  <div className="tm-meta-item tm-timings-item">
                    <ClockIcon size={13} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div className="tm-timing-pills-wrap">
                      {member.timingType === 'shift' ? (
                        member.timings && member.timings.length > 0 ? (
                          member.timings.map((t, i) => (
                            <span key={i} className="tm-timing-pill">
                              {formatTime12Hour(t.startTime)} - {formatTime12Hour(t.endTime)}
                            </span>
                          ))
                        ) : <span className="tm-timing-pill">—</span>
                      ) : (
                        <span className="tm-timing-pill">
                          {member.timings && member.timings[0] ? `${formatTime12Hour(member.timings[0].startTime)} - ${formatTime12Hour(member.timings[0].endTime)}` : '09:00 AM - 06:00 PM'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom: Action buttons */}
                <div className="tm-card-actions">
                  <button className="tm-action-btn key" title="Change Password" onClick={() => openPasswordModal(member)}>
                    <KeyIcon size={15} />
                  </button>
                  <button className="tm-action-btn edit" title="Edit" onClick={() => openEditModal(member)}>
                    <EditIcon size={15} />
                  </button>
                  <button className="tm-action-btn delete" title="Delete" onClick={() => handleDelete(member._id)}>
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
              <h3 className="modal-title">{isEditMode ? 'Edit Team Member' : 'Create New Team Member'}</h3>
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
                <FormInput label="Name" placeholder="Enter team member name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <FormInput type="email" label="Email Address" placeholder="Enter email address" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <div className="crm-input-group">
                  <label className="crm-input-label">Category</label>
                  <CustomSelect 
                    value={category} 
                    onChange={val => setCategory(val)} 
                    placeholder="Select Category"
                    options={teamCategories.map(cat => ({ value: cat, label: cat }))}
                  />
                </div>
              </div>
              <div>
                <FormInput type="number" label="Monthly Salary (₹)" placeholder="Enter monthly salary" value={salary} onChange={e => setSalary(e.target.value)} required />
              </div>

              {/* Timing Configuration */}
              <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label className="crm-input-label" style={{ marginBottom: 0 }}>Timing Type</label>
                  <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '3px', gap: '2px' }}>
                    <button 
                      type="button" 
                      onClick={() => { setTimingType('normal'); setTimings([{ startTime: '', endTime: '' }]); }}
                      style={{ padding: '5px 14px', border: 'none', background: timingType === 'normal' ? '#fff' : 'transparent', color: timingType === 'normal' ? 'var(--primary-color)' : '#64748b', borderRadius: '6px', fontSize: '12px', fontWeight: timingType === 'normal' ? 700 : 500, cursor: 'pointer', boxShadow: timingType === 'normal' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s ease' }}
                    >
                      Normal
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setTimingType('shift'); setTimings([{ startTime: '', endTime: '' }]); }}
                      style={{ padding: '5px 14px', border: 'none', background: timingType === 'shift' ? '#fff' : 'transparent', color: timingType === 'shift' ? 'var(--primary-color)' : '#64748b', borderRadius: '6px', fontSize: '12px', fontWeight: timingType === 'shift' ? 700 : 500, cursor: 'pointer', boxShadow: timingType === 'shift' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s ease' }}
                    >
                      Shift
                    </button>
                  </div>
                </div>

                {timings.map((timing, index) => (
                  <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: index === timings.length - 1 ? 0 : '8px' }}>
                    <div style={{ flex: 1 }}>
                      <CustomTimePicker
                        value={timing.startTime}
                        placeholder="Start Time"
                        onChange={val => {
                          const newTimings = [...timings];
                          newTimings[index].startTime = val;
                          setTimings(newTimings);
                        }}
                      />
                    </div>
                    <span style={{ color: '#94a3b8', fontSize: '12.5px', fontWeight: 600 }}>to</span>
                    <div style={{ flex: 1 }}>
                      <CustomTimePicker
                        value={timing.endTime}
                        placeholder="End Time"
                        onChange={val => {
                          const newTimings = [...timings];
                          newTimings[index].endTime = val;
                          setTimings(newTimings);
                        }}
                      />
                    </div>
                    {timingType === 'shift' && (
                      <button 
                        type="button"
                        onClick={() => {
                          if (index === 0) {
                            setTimings([...timings, { startTime: '', endTime: '' }]);
                          } else {
                            const newTimings = timings.filter((_, i) => i !== index);
                            setTimings(newTimings);
                          }
                        }}
                        style={{ background: index === 0 ? '#10b981' : '#fee2e2', color: index === 0 ? '#fff' : '#ef4444', border: index === 0 ? 'none' : '1px solid #fecaca', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}
                        title={index === 0 ? 'Add Shift' : 'Remove Shift'}
                      >
                        {index === 0 ? <PlusIcon size={16} /> : <TrashIcon size={15} />}
                      </button>
                    )}
                  </div>
                ))}
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
                  {isEditMode ? 'Update Team Member' : 'Create Team Member'}
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

export default TeamManagement;
