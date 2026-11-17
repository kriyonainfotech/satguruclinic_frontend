import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import { EditIcon, TrashIcon, SearchIcon, PlusIcon, InfoIcon, SparkleIcon } from '../components/Icons';
import usePermissions from '../permissions/usePermissions';
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
    const [discountPercent, setDiscountPercent] = useState(0);
    const [finalPrice, setFinalPrice] = useState('');
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

    const handlePriceChange = (e) => {
        const val = e.target.value;
        setPrice(val);
        const p = Number(val) || 0;
        const d = Number(discountPercent) || 0;
        if (p > 0 && d > 0) {
            setFinalPrice(Math.round(p * (1 - d / 100)));
        } else {
            setFinalPrice(val);
        }
    };

    const handlePresetClick = (pct) => {
        setDiscountPercent(pct);
        const p = Number(price) || 0;
        if (p > 0 && pct > 0) {
            setFinalPrice(Math.round(p * (1 - pct / 100)));
        } else {
            setFinalPrice(price);
        }
    };

    const handleDiscountChange = (e) => {
        const val = e.target.value;
        setDiscountPercent(val);
        const d = Math.max(0, Math.min(100, Number(val) || 0));
        const p = Number(price) || 0;
        if (p > 0 && d > 0) {
            setFinalPrice(Math.round(p * (1 - d / 100)));
        } else {
            setFinalPrice(price);
        }
    };

    const handleFinalPriceChange = (e) => {
        const val = e.target.value;
        setFinalPrice(val);
        const fp = Number(val);
        const p = Number(price) || 0;
        if (p > 0 && fp >= 0 && val !== '') {
            const calculatedDisc = Math.max(0, Math.min(100, Math.round(((p - fp) / p) * 100)));
            setDiscountPercent(calculatedDisc);
        }
    };

    const openCreateModal = () => {
        setIsEditMode(false);
        setEditingId(null);
        setName('');
        setPrice('');
        setDiscountPercent(0);
        setFinalPrice('');
        setDescription('');
        setShowModal(true);
    };

    const openEditModal = (service) => {
        setIsEditMode(true);
        setEditingId(service._id);
        setName(service.name);
        setPrice(service.price);
        const d = service.discountPercent || 0;
        setDiscountPercent(d);
        setFinalPrice(
            service.finalPrice !== undefined
                ? service.finalPrice
                : (d > 0 ? Math.round(service.price * (1 - d / 100)) : service.price)
        );
        setDescription(service.description || '');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numPrice = Number(price);
        const disc = Math.max(0, Math.min(100, Number(discountPercent) || 0));
        const calcFinalPrice = finalPrice !== ''
            ? Number(finalPrice)
            : (disc > 0 ? Math.round(numPrice * (1 - disc / 100)) : numPrice);

        const payload = {
            name: name.trim(),
            price: numPrice,
            discountPercent: disc,
            finalPrice: calcFinalPrice,
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

    const { can } = usePermissions();
    const perm = (action) => can('services:service-' + action);

    const filteredServices = services.filter(service =>
        service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            {/* Controls Bar: Search & Add Button */}
            <div className="sp-controls-bar sp-controls-inline">
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

                {perm('add') && (
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
                                    <div className="sp-card-price-container">
                                        {service.discountPercent > 0 ? (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span className="sp-card-price-original">₹{service.price}</span>
                                                    <span className="sp-card-price-badge discount">
                                                        ₹{service.finalPrice ?? Math.round(service.price * (1 - service.discountPercent / 100))}
                                                    </span>
                                                </div>
                                                <span className="sp-discount-pill">
                                                    {service.discountPercent}% OFF
                                                </span>
                                            </>
                                        ) : (
                                            <span className="sp-card-price-badge">
                                                ₹{service.price}
                                            </span>
                                        )}
                                    </div>
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
                                {perm('edit') && (
                                    <button
                                        type="button"
                                        className="sp-action-btn edit"
                                        onClick={() => openEditModal(service)}
                                        title="Edit Service"
                                    >
                                        <EditIcon size={14} />
                                    </button>
                                )}
                                {perm('delete') && (
                                    <button
                                        type="button"
                                        className="sp-action-btn delete"
                                        onClick={() => handleDelete(service._id)}
                                        title="Delete Service"
                                    >
                                        <TrashIcon size={14} />
                                    </button>
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
                            Base / Regular Price (₹) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            required
                            value={price}
                            onChange={handlePriceChange}
                            placeholder="0.00"
                            className="holiday-input"
                        />
                    </div>

                    {/* Discount & Offer Pricing Section */}
                    <div className="discount-section-box">
                        <div className="discount-presets-label">
                            <span>Discount (% OFF)</span>
                            {Number(discountPercent) > 0 && (
                                <span className="sp-discount-pill">{discountPercent}% OFF</span>
                            )}
                        </div>

                        {/* Quick Presets */}
                        <div className="discount-presets-row">
                            {[0, 10, 20, 30, 50].map(pct => (
                                <button
                                    key={pct}
                                    type="button"
                                    className={`discount-preset-btn ${Number(discountPercent) === pct ? 'active' : ''}`}
                                    onClick={() => handlePresetClick(pct)}
                                >
                                    {pct === 0 ? 'No Off (0%)' : `${pct}% Off`}
                                </button>
                            ))}
                        </div>

                        {/* Custom Percentage & Calculated Final Price Inputs */}
                        <div className="discount-inputs-row">
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                    Custom % Off:
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={discountPercent}
                                    onChange={handleDiscountChange}
                                    placeholder="e.g. 20"
                                    className="holiday-input"
                                    style={{ height: '36px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                    Final Selling Price (₹):
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={finalPrice}
                                    onChange={handleFinalPriceChange}
                                    placeholder="Final price"
                                    className="holiday-input"
                                    style={{ height: '36px', fontWeight: 600, color: '#047857' }}
                                />
                            </div>
                        </div>

                        {/* Summary Card */}
                        {Number(price) > 0 && (
                            <div className="pricing-summary-card">
                                <div className="pricing-summary-item">
                                    <span className="pricing-summary-title">Customer Pays:</span>
                                    <span className="pricing-summary-val">₹{finalPrice || price}</span>
                                </div>
                                {Number(discountPercent) > 0 && (
                                    <div style={{ textAlign: 'right' }}>
                                        <span className="pricing-summary-saving">
                                            Saves ₹{Math.max(0, Number(price) - Number(finalPrice || price))} ({discountPercent}% Off)
                                        </span>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', textDecoration: 'line-through' }}>
                                            ₹{price}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
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
