import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import { EditIcon, TrashIcon, SearchIcon, PlusIcon, InfoIcon, SparkleIcon } from '../components/Icons';
import './ServicesAndPackages.css';

const Services = () => {
    const [services, setServices] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [descModalInfo, setDescModalInfo] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/services`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setServices(res.data || []);
        } catch (error) {
            console.error('Error fetching services:', error);
        }
    };

    const openCreateModal = () => {
        setIsEditMode(false);
        setEditingId(null);
        setName('');
        setPrice('');
        setDescription('');
        setShowModal(true);
    };

    const openEditModal = (service) => {
        setIsEditMode(true);
        setEditingId(service._id);
        setName(service.name);
        setPrice(service.price);
        setDescription(service.description || '');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name: name.trim(),
            price: Number(price),
            description: description.trim()
        };

        try {
            if (isEditMode) {
                await axios.put(`${import.meta.env.VITE_API_BASE_URL}/services/${editingId}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${import.meta.env.VITE_API_BASE_URL}/services`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowModal(false);
            fetchServices();
        } catch (error) {
            console.error('Error saving service:', error);
            alert(error.response?.data?.message || 'Error saving service');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this service?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/services/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchServices();
        } catch (error) {
            console.error('Error deleting service:', error);
            alert('Error deleting service');
        }
    };

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = user.role === 'superadmin' || user.role === 'admin';
    const isTeam = user.role === 'team';

    const filteredServices = services.filter(service =>
        service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            {/* Controls Bar: Search & Add Button */}
            <div className="sp-controls-bar">
                <div className="sp-search-input-wrap">
                    <SearchIcon size={16} className="sp-search-icon" />
                    <input
                        type="text"
                        placeholder="Search clinic services..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="sp-search-input"
                    />
                </div>

                {isSuperAdmin && (
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="sp-add-btn"
                    >
                        <PlusIcon size={16} /> Add New Service
                    </button>
                )}
            </div>

            {/* Services Cards Grid */}
            <div className="sp-cards-grid">
                {filteredServices.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                        <SparkleIcon size={32} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>No services found.</p>
                    </div>
                ) : (
                    filteredServices.map(service => (
                        <div key={service._id} className="sp-item-card">
                            <div>
                                <div className="sp-card-top">
                                    <h3 className="sp-card-name">{service.name}</h3>
                                    {!isTeam && (
                                        <span className="sp-card-price-badge">
                                            ₹{service.price}
                                        </span>
                                    )}
                                </div>

                                <div className="sp-card-body">
                                    {service.description ? (
                                        <p className="sp-card-desc" title={service.description}>
                                            {service.description}
                                        </p>
                                    ) : (
                                        <p style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                                            No additional description.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="sp-card-footer">
                                {service.description && (
                                    <button
                                        type="button"
                                        className="sp-action-btn info"
                                        onClick={() => setDescModalInfo({ title: service.name, description: service.description })}
                                        title="View Description"
                                    >
                                        <InfoIcon size={15} />
                                    </button>
                                )}
                                {isSuperAdmin && (
                                    <>
                                        <button
                                            type="button"
                                            className="sp-action-btn edit"
                                            onClick={() => openEditModal(service)}
                                            title="Edit Service"
                                        >
                                            <EditIcon size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            className="sp-action-btn delete"
                                            onClick={() => handleDelete(service._id)}
                                            title="Delete Service"
                                        >
                                            <TrashIcon size={14} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Description Info Modal */}
            <Modal isOpen={!!descModalInfo} onClose={() => setDescModalInfo(null)} title={descModalInfo?.title + " - Details"}>
                <div style={{ padding: '12px 0', fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
                    {descModalInfo?.description}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button
                        type="button"
                        className="holiday-btn-cancel"
                        onClick={() => setDescModalInfo(null)}
                    >
                        Close
                    </button>
                </div>
            </Modal>

            {/* Add / Edit Service Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={isEditMode ? 'Edit Service' : 'Add New Service'}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            Service Name <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Laser Treatment, Facial, Consultation"
                            className="holiday-input"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            Price (₹) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            required
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="0.00"
                            className="holiday-input"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            Description (Optional)
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Treatment procedure or instructions"
                            className="holiday-input"
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                        <button
                            type="button"
                            className="holiday-btn-cancel"
                            onClick={() => setShowModal(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="holiday-btn-submit"
                            disabled={!name.trim() || price === ''}
                        >
                            <PlusIcon size={16} /> {isEditMode ? 'Update Service' : 'Save Service'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Services;
