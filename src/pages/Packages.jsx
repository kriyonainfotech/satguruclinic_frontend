import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CustomMultiSelect from '../components/CustomMultiSelect';
import Modal from '../components/Modal';
import { EditIcon, TrashIcon, SearchIcon, PlusIcon, InfoIcon, PackageIcon } from '../components/Icons';
import usePermissions from '../permissions/usePermissions';
import './ServicesAndPackages.css';

const Packages = () => {
    const [packagesList, setPackagesList] = useState([]);
    const [allServices, setAllServices] = useState([]);
    const [allMedicines, setAllMedicines] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [descModalInfo, setDescModalInfo] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedServices, setSelectedServices] = useState([]);
    const [selectedMedicines, setSelectedMedicines] = useState([]);
    const [medicineQuantities, setMedicineQuantities] = useState({}); // New state for quantities
    const [discountPercent, setDiscountPercent] = useState(0);
    const [customFinalPrice, setCustomFinalPrice] = useState('');

    // Extra custom services for this package
    const [extraServices, setExtraServices] = useState([]);
    const [newExtraServiceName, setNewExtraServiceName] = useState('');
    const [newExtraServicePrice, setNewExtraServicePrice] = useState('');

    const token = localStorage.getItem('token');

    const fetchData = async () => {
        try {
            const pkgsRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/packages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPackagesList(pkgsRes.data || []);

            const srvRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/services`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllServices(srvRes.data || []);

            const medRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/medicines`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllMedicines(medRes.data || []);
        } catch (error) {
            console.error("Error fetching packages/services", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Calculate dynamic base items price for the form
    const currentBasePrice = allServices
        .filter(s => selectedServices.includes(s._id))
        .reduce((sum, s) => sum + (s.finalPrice !== undefined ? s.finalPrice : (s.price || 0)), 0);
    const currentMedPrice = allMedicines
        .filter(m => selectedMedicines.includes(m._id))
        .reduce((sum, m) => {
            const qty = medicineQuantities[m._id] || 1;
            return sum + ((m.price || 0) * qty);
        }, 0);
    const extraPrice = extraServices.reduce((sum, es) => sum + Number(es.price || 0), 0);
    const pendingExtraPrice = (newExtraServiceName.trim() && newExtraServicePrice) ? Number(newExtraServicePrice) : 0;
    const currentBaseItemsTotal = currentBasePrice + currentMedPrice + extraPrice + pendingExtraPrice;

    const handlePresetClick = (pct) => {
        setDiscountPercent(pct);
        if (pct > 0 && currentBaseItemsTotal > 0) {
            setCustomFinalPrice(Math.round(currentBaseItemsTotal * (1 - pct / 100)));
        } else {
            setCustomFinalPrice(currentBaseItemsTotal);
        }
    };

    const handleDiscountChange = (e) => {
        const val = e.target.value;
        setDiscountPercent(val);
        const d = Math.max(0, Math.min(100, Number(val) || 0));
        if (d > 0 && currentBaseItemsTotal > 0) {
            setCustomFinalPrice(Math.round(currentBaseItemsTotal * (1 - d / 100)));
        } else {
            setCustomFinalPrice(currentBaseItemsTotal);
        }
    };

    const handleFinalPriceChange = (e) => {
        const val = e.target.value;
        setCustomFinalPrice(val);
        const fp = Number(val);
        if (currentBaseItemsTotal > 0 && fp >= 0 && val !== '') {
            const calculatedDisc = Math.max(0, Math.min(100, Math.round(((currentBaseItemsTotal - fp) / currentBaseItemsTotal) * 100)));
            setDiscountPercent(calculatedDisc);
        }
    };

    const openCreateModal = () => {
        setIsEditMode(false);
        setEditingId(null);
        setName('');
        setDescription('');
        setSelectedServices([]);
        setSelectedMedicines([]);
        setMedicineQuantities({});
        setExtraServices([]);
        setNewExtraServiceName('');
        setNewExtraServicePrice('');
        setDiscountPercent(0);
        setCustomFinalPrice('');
        setShowModal(true);
    };

    const openEditModal = (pkg) => {
        setIsEditMode(true);
        setEditingId(pkg._id);
        setName(pkg.name);
        setDescription(pkg.description || '');
        setSelectedServices(pkg.services ? pkg.services.map(s => s._id) : []);
        
        const medIds = pkg.medicines ? pkg.medicines.map(m => m._id) : [];
        setSelectedMedicines([...new Set(medIds)]);
        
        const qtyMap = {};
        medIds.forEach(id => {
            qtyMap[id] = (qtyMap[id] || 0) + 1;
        });
        setMedicineQuantities(qtyMap);

        setExtraServices(pkg.extraServices || []);
        setNewExtraServiceName('');
        setNewExtraServicePrice('');
        setDiscountPercent(pkg.discountPercent || 0);
        setCustomFinalPrice(pkg.totalPrice !== undefined ? pkg.totalPrice : '');
        setShowModal(true);
    };

    const handleAddExtraService = () => {
        if (newExtraServiceName.trim() && newExtraServicePrice) {
            setExtraServices([...extraServices, { name: newExtraServiceName.trim(), price: Number(newExtraServicePrice) }]);
            setNewExtraServiceName('');
            setNewExtraServicePrice('');
        }
    };

    const handleRemoveExtraService = (index) => {
        setExtraServices(extraServices.filter((_, i) => i !== index));
    };

    const handleMedQtyChange = (id, change) => {
        setMedicineQuantities(prev => {
            const current = prev[id] || 1;
            const newQty = Math.max(1, current + change);
            return { ...prev, [id]: newQty };
        });
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this package?")) {
            try {
                await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/packages/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                fetchData();
            } catch (error) {
                alert(error.response?.data?.message || 'Error deleting package');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let finalExtraServices = [...extraServices];
            if (newExtraServiceName.trim() && newExtraServicePrice) {
                finalExtraServices.push({ name: newExtraServiceName.trim(), price: Number(newExtraServicePrice) });
                setNewExtraServiceName('');
                setNewExtraServicePrice('');
            }

            const finalMedicinesArray = [];
            selectedMedicines.forEach(medId => {
                const qty = medicineQuantities[medId] || 1;
                for (let i = 0; i < qty; i++) finalMedicinesArray.push(medId);
            });

            const finalPriceNum = customFinalPrice !== '' 
                ? Number(customFinalPrice) 
                : (Number(discountPercent) > 0 ? Math.round(currentBaseItemsTotal * (1 - Number(discountPercent) / 100)) : currentBaseItemsTotal);

            const payload = {
                name,
                description,
                services: selectedServices,
                medicines: finalMedicinesArray,
                extraServices: finalExtraServices,
                discountPercent: Number(discountPercent) || 0,
                customPrice: finalPriceNum
            };

            if (isEditMode) {
                await axios.put(`${import.meta.env.VITE_API_BASE_URL}/packages/${editingId}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${import.meta.env.VITE_API_BASE_URL}/packages`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Error saving package');
        }
    };

    const { can } = usePermissions();
    const perm = (action) => can('services:package-' + action);

    const filteredPackages = packagesList.filter(pkg =>
        pkg.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            {/* Controls Bar: Search & Add Button */}
            <div className="sp-controls-bar sp-controls-inline">
                <div className="sp-search-input-wrap">
                    <SearchIcon size={16} className="sp-search-icon" />
                    <input
                        type="text"
                        placeholder="Search packages..."
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
                        <PlusIcon size={16} /> Add New Package
                    </button>
                )}
            </div>

            {/* Packages Grid */}
            <div className="sp-cards-grid">
                {filteredPackages.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                        <PackageIcon size={32} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>No packages found.</p>
                    </div>
                ) : (
                    filteredPackages.map(pkg => {
                        const totalServicesCount = (pkg.services?.length || 0) + (pkg.medicines?.length || 0) + (pkg.extraServices?.length || 0);
                        const hasDiscount = pkg.discountPercent > 0 || (pkg.originalPrice && pkg.originalPrice > pkg.totalPrice);
                        const origP = pkg.originalPrice || pkg.totalPrice;
                        const discVal = pkg.discountPercent || (origP > pkg.totalPrice ? Math.round(((origP - pkg.totalPrice) / origP) * 100) : 0);

                        return (
                            <div key={pkg._id} className="sp-item-card">
                                <div>
                                    <div className="sp-card-top">
                                        <div className="sp-card-title-group">
                                            <h3 className="sp-card-name">{pkg.name}</h3>
                                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                                                {totalServicesCount} items included
                                            </span>
                                        </div>
                                        <div className="sp-card-price-container">
                                            {hasDiscount ? (
                                                <>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span className="sp-card-price-original">
                                                            ₹{origP}
                                                        </span>
                                                        <span className="sp-card-price-badge discount">
                                                            ₹{pkg.totalPrice}
                                                        </span>
                                                    </div>
                                                    <span className="sp-discount-pill">
                                                        {discVal}% OFF
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="sp-card-price-badge">
                                                    ₹{pkg.totalPrice}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Included Services List */}
                                    <div className="sp-card-body">
                                        <div className="sp-pkg-services-list">
                                            {pkg.services && pkg.services.map((s, idx) => (
                                                <div key={s._id || idx} className="sp-pkg-service-row">
                                                    <span className="sp-pkg-service-name">
                                                        <span style={{ color: '#94a3b8', fontSize: '11px', minWidth: '14px' }}>{idx + 1}.</span> {s.name}
                                                    </span>
                                                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>
                                                        ₹{s.finalPrice !== undefined && s.discountPercent > 0 ? s.finalPrice : s.price}
                                                        {s.discountPercent > 0 && <span style={{ color: '#16a34a', fontSize: '10px', marginLeft: '4px' }}>({s.discountPercent}% OFF)</span>}
                                                    </span>
                                                </div>
                                            ))}

                                            {pkg.medicines && pkg.medicines.map((m, mIdx) => (
                                                <div key={m._id || mIdx} className="sp-pkg-service-row">
                                                    <span className="sp-pkg-service-name">
                                                        <span style={{ color: '#94a3b8', fontSize: '11px', minWidth: '14px' }}>{(pkg.services?.length || 0) + mIdx + 1}.</span> {m.name}
                                                        <span className="sp-tag-pill med">Med</span>
                                                    </span>
                                                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>₹{m.price}</span>
                                                </div>
                                            ))}

                                            {pkg.extraServices && pkg.extraServices.map((es, eIdx) => (
                                                <div key={`es-${eIdx}`} className="sp-pkg-service-row">
                                                    <span className="sp-pkg-service-name">
                                                        <span style={{ color: '#94a3b8', fontSize: '11px', minWidth: '14px' }}>{(pkg.services?.length || 0) + (pkg.medicines?.length || 0) + eIdx + 1}.</span> {es.name}
                                                        <span className="sp-tag-pill extra">Extra</span>
                                                    </span>
                                                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>₹{es.price}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="sp-card-footer">
                                    {pkg.description && (
                                        <button
                                            type="button"
                                            className="sp-action-btn info"
                                            onClick={() => setDescModalInfo({ title: pkg.name, description: pkg.description })}
                                            title="View Description"
                                        >
                                            <InfoIcon size={15} />
                                        </button>
                                    )}
                                    {perm('edit') && (
                                        <button
                                            type="button"
                                            className="sp-action-btn edit"
                                            onClick={() => openEditModal(pkg)}
                                            title="Edit Package"
                                        >
                                            <EditIcon size={14} />
                                        </button>
                                    )}
                                    {perm('delete') && (
                                        <button
                                            type="button"
                                            className="sp-action-btn delete"
                                            onClick={() => handleDelete(pkg._id)}
                                            title="Delete Package"
                                        >
                                            <TrashIcon size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
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

            {/* Add / Edit Package Modal with CustomMultiSelect */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={isEditMode ? 'Edit Treatment Package' : 'Add New Package'}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            Package Name <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Skin Glow Complete Package"
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
                            placeholder="Brief description of included treatments"
                            className="holiday-input"
                        />
                    </div>

                    {/* Main Services with CustomMultiSelect */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            Main Services
                        </label>
                        <CustomMultiSelect
                            options={allServices.map(s => {
                                const effPrice = (s.discountPercent > 0 && s.finalPrice !== undefined) ? s.finalPrice : s.price;
                                return {
                                    value: s._id,
                                    label: s.discountPercent > 0 ? `${s.name} (₹${effPrice} - ${s.discountPercent}% OFF)` : s.name,
                                    price: effPrice
                                };
                            })}
                            values={selectedServices}
                            onChange={setSelectedServices}
                            placeholder="Choose services to include in package..."
                            searchPlaceholder="Search available services..."
                        />
                    </div>

                    {/* Medicines with CustomMultiSelect */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            Medicines & Products
                        </label>
                        <CustomMultiSelect
                            options={allMedicines.map(m => ({
                                value: m._id,
                                label: m.name,
                                price: m.price,
                                category: m.category
                            }))}
                            values={selectedMedicines}
                            onChange={setSelectedMedicines}
                            placeholder="Choose medicines to include..."
                            searchPlaceholder="Search available medicines..."
                        />
                        {selectedMedicines.length > 0 && (
                            <div className="selected-meds-qty-list" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {selectedMedicines.map(medId => {
                                    const medObj = allMedicines.find(m => m._id === medId);
                                    if (!medObj) return null;
                                    const qty = medicineQuantities[medId] || 1;
                                    return (
                                        <div key={medId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>
                                                {medObj.name} <span style={{color: '#94a3b8', fontSize: '12px'}}>(₹{medObj.price})</span>
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <button type="button" onClick={() => handleMedQtyChange(medId, -1)} style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#334155' }}>-</button>
                                                <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '16px', textAlign: 'center', color: '#0f172a' }}>{qty}</span>
                                                <button type="button" onClick={() => handleMedQtyChange(medId, 1)} style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#334155' }}>+</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Extra / Custom Services */}
                    <div className="extra-services-container">
                        <div className="extra-services-header">Add Extra / Custom Services:</div>
                        <div className="extra-services-input-row">
                            <input
                                type="text"
                                placeholder="Service Name (e.g. Cleansing, Follow-up)"
                                value={newExtraServiceName}
                                onChange={(e) => setNewExtraServiceName(e.target.value)}
                                className="holiday-input"
                                style={{ flex: 2, height: '36px' }}
                            />
                            <input
                                type="number"
                                placeholder="Price (₹)"
                                value={newExtraServicePrice}
                                onChange={(e) => setNewExtraServicePrice(e.target.value)}
                                className="holiday-input"
                                style={{ flex: 1, height: '36px' }}
                            />
                            <button
                                type="button"
                                onClick={handleAddExtraService}
                                className="sp-add-btn"
                                style={{ height: '36px', padding: '0 14px', fontSize: '12px' }}
                            >
                                Add
                            </button>
                        </div>

                        {extraServices.length > 0 && (
                            <div className="extra-services-list">
                                {extraServices.map((es, idx) => (
                                    <div key={idx} className="extra-service-item">
                                        <span style={{ color: '#1e293b', fontWeight: 500 }}>
                                            {es.name} - <span style={{ fontWeight: 700, color: '#059669' }}>₹{es.price}</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveExtraService(idx)}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                                        >
                                            ✕ Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pricing & Discount Controls Box */}
                    <div className="discount-section-box">
                        <div className="discount-presets-label">
                            <span>Package Discount (% OFF)</span>
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

                        {/* Custom % and Final Price Inputs */}
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
                                    Final Package Price (₹):
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={customFinalPrice}
                                    onChange={handleFinalPriceChange}
                                    placeholder={currentBaseItemsTotal.toString()}
                                    className="holiday-input"
                                    style={{ height: '36px', fontWeight: 600, color: '#047857' }}
                                />
                            </div>
                        </div>

                        {/* Price Summary Card */}
                        <div className="pricing-summary-card">
                            <div className="pricing-summary-item">
                                <span className="pricing-summary-title">Final Package Price:</span>
                                <span className="pricing-summary-val">
                                    ₹{customFinalPrice !== '' ? customFinalPrice : (Number(discountPercent) > 0 ? Math.round(currentBaseItemsTotal * (1 - Number(discountPercent) / 100)) : currentBaseItemsTotal)}
                                </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                    Items Total: <strong>₹{currentBaseItemsTotal}</strong>
                                </div>
                                {Number(discountPercent) > 0 && (
                                    <span className="pricing-summary-saving">
                                        Saves ₹{Math.max(0, currentBaseItemsTotal - (customFinalPrice !== '' ? Number(customFinalPrice) : Math.round(currentBaseItemsTotal * (1 - Number(discountPercent) / 100))))} ({discountPercent}% Off)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer Buttons */}
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
                            disabled={!name.trim()}
                        >
                            <PlusIcon size={16} /> {isEditMode ? 'Update Package' : 'Save Package'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Packages;
