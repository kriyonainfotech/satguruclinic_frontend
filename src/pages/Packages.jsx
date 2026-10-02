import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CustomMultiSelect from '../components/CustomMultiSelect';
import Modal from '../components/Modal';
import { EditIcon, TrashIcon, SearchIcon, PlusIcon, InfoIcon, PackageIcon } from '../components/Icons';
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

    const openCreateModal = () => {
        setIsEditMode(false);
        setEditingId(null);
        setName('');
        setDescription('');
        setSelectedServices([]);
        setSelectedMedicines([]);
        setExtraServices([]);
        setNewExtraServiceName('');
        setNewExtraServicePrice('');
        setShowModal(true);
    };

    const openEditModal = (pkg) => {
        setIsEditMode(true);
        setEditingId(pkg._id);
        setName(pkg.name);
        setDescription(pkg.description || '');
        setSelectedServices(pkg.services ? pkg.services.map(s => s._id) : []);
        setSelectedMedicines(pkg.medicines ? pkg.medicines.map(m => m._id) : []);
        setExtraServices(pkg.extraServices || []);
        setNewExtraServiceName('');
        setNewExtraServicePrice('');
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

            const payload = {
                name,
                description,
                services: selectedServices,
                medicines: selectedMedicines,
                extraServices: finalExtraServices
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

    // Calculate dynamic total price for the form
    const currentBasePrice = allServices
        .filter(s => selectedServices.includes(s._id))
        .reduce((sum, s) => sum + (s.price || 0), 0);
    const currentMedPrice = allMedicines
        .filter(m => selectedMedicines.includes(m._id))
        .reduce((sum, m) => sum + (m.price || 0), 0);
    const extraPrice = extraServices.reduce((sum, es) => sum + Number(es.price || 0), 0);
    const pendingExtraPrice = (newExtraServiceName.trim() && newExtraServicePrice) ? Number(newExtraServicePrice) : 0;
    const currentTotalPrice = currentBasePrice + currentMedPrice + extraPrice + pendingExtraPrice;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = user.role === 'superadmin' || user.role === 'admin';
    const isTeam = user.role === 'team';

    const filteredPackages = packagesList.filter(pkg =>
        pkg.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            {/* Controls Bar: Search & Add Button */}
            <div className="sp-controls-bar">
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

                {isSuperAdmin && (
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
                                        {!isTeam && (
                                            <span className="sp-card-price-badge">
                                                ₹{pkg.totalPrice}
                                            </span>
                                        )}
                                    </div>

                                    {/* Included Services List */}
                                    <div className="sp-card-body">
                                        <div className="sp-pkg-services-list">
                                            {pkg.services && pkg.services.map((s, idx) => (
                                                <div key={s._id || idx} className="sp-pkg-service-row">
                                                    <span className="sp-pkg-service-name">
                                                        <span style={{ color: '#94a3b8', fontSize: '11px', minWidth: '14px' }}>{idx + 1}.</span> {s.name}
                                                    </span>
                                                    {!isTeam && <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>₹{s.price}</span>}
                                                </div>
                                            ))}

                                            {pkg.medicines && pkg.medicines.map((m, mIdx) => (
                                                <div key={m._id || mIdx} className="sp-pkg-service-row">
                                                    <span className="sp-pkg-service-name">
                                                        <span style={{ color: '#94a3b8', fontSize: '11px', minWidth: '14px' }}>{(pkg.services?.length || 0) + mIdx + 1}.</span> {m.name}
                                                        <span className="sp-tag-pill med">Med</span>
                                                    </span>
                                                    {!isTeam && <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>₹{m.price}</span>}
                                                </div>
                                            ))}

                                            {pkg.extraServices && pkg.extraServices.map((es, eIdx) => (
                                                <div key={`es-${eIdx}`} className="sp-pkg-service-row">
                                                    <span className="sp-pkg-service-name">
                                                        <span style={{ color: '#94a3b8', fontSize: '11px', minWidth: '14px' }}>{(pkg.services?.length || 0) + (pkg.medicines?.length || 0) + eIdx + 1}.</span> {es.name}
                                                        <span className="sp-tag-pill extra">Extra</span>
                                                    </span>
                                                    {!isTeam && <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>₹{es.price}</span>}
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
                                    {isSuperAdmin && (
                                        <>
                                            <button
                                                type="button"
                                                className="sp-action-btn edit"
                                                onClick={() => openEditModal(pkg)}
                                                title="Edit Package"
                                            >
                                                <EditIcon size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="sp-action-btn delete"
                                                onClick={() => handleDelete(pkg._id)}
                                                title="Delete Package"
                                            >
                                                <TrashIcon size={14} />
                                            </button>
                                        </>
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
                            options={allServices.map(s => ({
                                value: s._id,
                                label: s.name,
                                price: s.price
                            }))}
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

                    {/* Total Price Banner */}
                    <div className="pkg-total-price-box">
                        <span className="pkg-total-label">Total Calculated Package Price:</span>
                        <span className="pkg-total-value">₹{currentTotalPrice}</span>
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
