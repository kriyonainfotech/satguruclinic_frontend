import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CustomSelect from '../components/CustomSelect';
import Modal from '../components/Modal';
import { EditIcon, TrashIcon, SearchIcon, PlusIcon, InfoIcon, ClipboardListIcon } from '../components/Icons';
import './ServicesAndPackages.css';

const CATEGORIES = [
    { value: 'Tablet', label: 'Tablet' },
    { value: 'Capsule', label: 'Capsule' },
    { value: 'Syrup', label: 'Syrup' },
    { value: 'Injection', label: 'Injection' },
    { value: 'Cream', label: 'Cream' },
    { value: 'Ointment', label: 'Ointment' },
    { value: 'Drops', label: 'Drops' },
    { value: 'Powder', label: 'Powder' },
    { value: 'Oil', label: 'Oil' },
    { value: 'Other', label: 'Other' }
];

const QUICK_TAGS = [
    'Morning', 'Afternoon', 'Night', 'After Meal', 'Before Meal',
    'Once a day', 'Twice a day', 'Apply Locally', 'When Required'
];

const Medicines = () => {
    const [medicines, setMedicines] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [descModalInfo, setDescModalInfo] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('Other');
    const [description, setDescription] = useState('');
    const [defaultDosage, setDefaultDosage] = useState('');

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchMedicines();
    }, []);

    const fetchMedicines = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/medicines`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMedicines(res.data || []);
        } catch (error) {
            console.error('Error fetching medicines:', error);
        }
    };

    const openCreateModal = () => {
        setIsEditMode(false);
        setEditingId(null);
        setName('');
        setCategory('Other');
        setDefaultDosage('');
        setPrice('');
        setDescription('');
        setShowModal(true);
    };

    const openEditModal = (med) => {
        setIsEditMode(true);
        setEditingId(med._id);
        setName(med.name);
        setCategory(med.category || 'Other');
        setDefaultDosage(med.defaultDosage || '');
        setPrice(med.price || '');
        setDescription(med.description || '');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name: name.trim(),
            price: Number(price),
            category: category || 'Other',
            defaultDosage: defaultDosage.trim(),
            description: description.trim()
        };

        try {
            if (isEditMode) {
                await axios.put(`${import.meta.env.VITE_API_BASE_URL}/medicines/${editingId}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${import.meta.env.VITE_API_BASE_URL}/medicines`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowModal(false);
            fetchMedicines();
        } catch (error) {
            console.error('Error saving medicine:', error);
            alert(error.response?.data?.message || 'Error saving medicine');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this medicine?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/medicines/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchMedicines();
        } catch (error) {
            console.error('Error deleting medicine:', error);
            alert('Error deleting medicine');
        }
    };

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = user.role === 'superadmin' || user.role === 'admin';
    const isTeam = user.role === 'team';

    const filterOptions = [
        { value: 'ALL', label: 'All Categories' },
        ...CATEGORIES
    ];

    const filteredMedicines = medicines.filter(med => {
        const matchesSearch = med.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            med.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            med.defaultDosage?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategoryFilter === 'ALL' || med.category === selectedCategoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div>
            {/* Controls Bar: Search, Category Filter, and Add Button */}
            <div className="sp-controls-bar">
                <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
                    <div className="sp-search-input-wrap">
                        <SearchIcon size={16} className="sp-search-icon" />
                        <input
                            type="text"
                            placeholder="Search medicines, dosage..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="sp-search-input"
                        />
                    </div>

                    <div style={{ width: '180px' }}>
                        <CustomSelect
                            value={selectedCategoryFilter}
                            onChange={setSelectedCategoryFilter}
                            options={filterOptions}
                            placeholder="All Categories"
                        />
                    </div>
                </div>

                {isSuperAdmin && (
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="sp-add-btn"
                    >
                        <PlusIcon size={16} /> Add Medicine
                    </button>
                )}
            </div>

            {/* Medicines Cards Grid */}
            <div className="sp-cards-grid">
                {filteredMedicines.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                        <ClipboardListIcon size={32} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>No medicines found matching criteria.</p>
                    </div>
                ) : (
                    filteredMedicines.map(med => (
                        <div key={med._id} className="sp-item-card">
                            <div>
                                <div className="sp-card-top">
                                    <div className="sp-card-title-group">
                                        <h3 className="sp-card-name">{med.name}</h3>
                                        {med.category && (
                                            <span className="sp-card-category-pill">
                                                {med.category}
                                            </span>
                                        )}
                                    </div>
                                    {!isTeam && (
                                        <span className="sp-card-price-badge">
                                            ₹{med.price}
                                        </span>
                                    )}
                                </div>

                                <div className="sp-card-body">
                                    {med.defaultDosage && (
                                        <div className="sp-dosage-tags">
                                            {med.defaultDosage.split(',').map((tag, idx) => (
                                                <span key={idx} className="sp-dosage-tag">
                                                    {tag.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {med.description && (
                                        <p className="sp-card-desc" title={med.description}>
                                            {med.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="sp-card-footer">
                                {med.description && (
                                    <button
                                        type="button"
                                        className="sp-action-btn info"
                                        onClick={() => setDescModalInfo({ title: med.name, description: med.description })}
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
                                            onClick={() => openEditModal(med)}
                                            title="Edit Medicine"
                                        >
                                            <EditIcon size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            className="sp-action-btn delete"
                                            onClick={() => handleDelete(med._id)}
                                            title="Delete Medicine"
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

            {/* Add / Edit Medicine Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={isEditMode ? 'Edit Medicine' : 'Add New Medicine'}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            Medicine Name <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Paracetamol, Dolo 650, Hair Serum"
                            className="holiday-input"
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '14px' }}>
                        <div style={{ flex: 1 }}>
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

                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                Category
                            </label>
                            <CustomSelect
                                value={category}
                                onChange={setCategory}
                                options={CATEGORIES}
                                placeholder="Select category..."
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            Dosage / Instructions (Optional Default)
                        </label>
                        <input
                            type="text"
                            value={defaultDosage}
                            onChange={(e) => setDefaultDosage(e.target.value)}
                            placeholder="Type instructions or use quick tags below..."
                            className="holiday-input"
                        />
                        <div className="quick-dosage-tags-wrap">
                            {QUICK_TAGS.map(tag => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => setDefaultDosage(prev => prev ? `${prev}, ${tag}` : tag)}
                                    className="quick-dosage-tag-btn"
                                >
                                    + {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            Description (Optional)
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Composition, brand, or clinical notes"
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
                            <PlusIcon size={16} /> {isEditMode ? 'Update Medicine' : 'Save Medicine'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Medicines;
