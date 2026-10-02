import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { XIcon } from './Icons';
import CustomSelect from './CustomSelect';

const SaleEntryModal = ({ isOpen, onClose, initialPatientMobile = '', initialPatientName = '', initialAppointment = null, onSuccess }) => {
  const [saleMobile, setSaleMobile] = useState(initialPatientMobile);
  const [salePatientName, setSalePatientName] = useState(initialPatientName);
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);
  const [patientsList, setPatientsList] = useState([]);
  
  const [servicesList, setServicesList] = useState([]);
  const [allPackages, setAllPackages] = useState([]);
  const [allMedicines, setAllMedicines] = useState([]);
  
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  
  const [medicineDuration, setMedicineDuration] = useState(1);
  const [includeConsultationFee, setIncludeConsultationFee] = useState(true);
  const [consultationFeeAmount, setConsultationFeeAmount] = useState(0);
  
  const [saleTotalAmount, setSaleTotalAmount] = useState(0);
  const [saleNotes, setSaleNotes] = useState('');
  
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const config = { headers: { Authorization: 'Bearer ' + token } };
        
        try {
            const pRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/patients`, config);
            setPatientsList((pRes.data || []).map(p => ({ id: p._id, mobile: p.mobileNumber || '', name: p.fullName || '' })));
            
            const sRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/services`, config);
            const sData = (sRes.data || []).map(s => ({ id: s._id, name: s.name || '', price: s.price || 0 }));
            setServicesList(sData);
            
            const pkgRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/packages`, config);
            const pData = (pkgRes.data || []).map(p => ({ id: p._id, name: p.name || '', price: p.totalPrice || 0 }));
            setAllPackages(pData);
            
            const mRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/medicines`, config);
            const mData = (mRes.data || []).map(m => ({ id: m._id, name: m.name || '', price: m.price || 0 }));
            setAllMedicines(mData);
            
            const setRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/settings`, config);
            setConsultationFeeAmount(setRes.data?.consultationFee || 0);

            if (initialAppointment) {
               if (initialAppointment.services) {
                   const sNames = initialAppointment.services.split(', ').map(s => s.split(' (₹')[0].split(' [Qty:')[0].trim().toLowerCase());
                   setSelectedServices(sData.filter(s => sNames.includes((s.name || '').toLowerCase())));
               }
               if (initialAppointment.packages) {
                   const pNames = initialAppointment.packages.split(', ').map(p => p.split(' (₹')[0].split(' [Qty:')[0].trim().toLowerCase());
                   setSelectedPackages(pData.filter(p => pNames.includes((p.name || '').toLowerCase())));
               }
               if (initialAppointment.medicines) {
                   const mItems = initialAppointment.medicines.split(', ').map(str => {
                       const baseName = str.split(' (₹')[0].split(' [Qty:')[0].trim();
                       const qtyMatch = str.match(/\[Qty: (\d+)\]/);
                       const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
                       return { baseName, qty };
                   });
                   const selectedM = [];
                   mItems.forEach(item => {
                       const med = mData.find(m => (m.name || '').toLowerCase() === item.baseName.toLowerCase());
                       if (med) {
                           selectedM.push({ ...med, qty: item.qty });
                       } else if (item.baseName && !['Morning', 'Afternoon', 'Night', 'After Meal', 'Before Meal'].includes(item.baseName) && !item.baseName.endsWith(']')) {
                           // If custom medicine typed in appointment
                           selectedM.push({ id: 'custom-' + Date.now() + Math.random(), name: item.baseName, price: 0, qty: item.qty });
                       }
                   });
                   setSelectedMedicines(selectedM);
               }
            }
        } catch(e) {
            console.error(e);
        }
    };
    fetchData();
    
    // Reset state when opened
    setSaleMobile(initialPatientMobile);
    setSalePatientName(initialPatientName);
    setSelectedServices([]);
    setSelectedPackages([]);
    setSelectedMedicines([]);
    setMedicineDuration(1);
    setIncludeConsultationFee(true);
    setSaleNotes('');
  }, [isOpen, initialPatientMobile, initialPatientName, initialAppointment]);
  
  useEffect(() => {
    let sum = selectedServices.reduce((acc, srv) => acc + srv.price, 0);
    sum += selectedPackages.reduce((acc, pkg) => acc + pkg.price, 0);
    sum += selectedMedicines.reduce((acc, med) => acc + ((med.price || 0) * (med.qty || 1)), 0);
    if (includeConsultationFee) sum += consultationFeeAmount;
    setSaleTotalAmount(sum);
  }, [selectedServices, selectedPackages, selectedMedicines, includeConsultationFee, consultationFeeAmount]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMobileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;
  
  const R = "₹";
  const filteredPatients = patientsList.filter(p => p.mobile.includes(saleMobile) || p.name.toLowerCase().includes(saleMobile.toLowerCase()));
  
  const handleCreateEntry = async () => {
    if (!salePatientName) return alert("Please select a patient.");
    
    const finalAmount = Number(saleTotalAmount) || 0;
    
    const workItems = [];
    if (includeConsultationFee) workItems.push(`Consultation (₹${consultationFeeAmount})`);
    if (selectedServices.length > 0) workItems.push(...selectedServices.map(s => `${s.name} (₹${s.price})`));
    if (selectedPackages.length > 0) workItems.push(...selectedPackages.map(p => `${p.name} (₹${p.price})`));
    if (selectedMedicines.length > 0) workItems.push(...selectedMedicines.map(m => `${m.name} [Qty: ${m.qty || 1}] (${medicineDuration} days - ₹${(m.price || 0) * (m.qty || 1)})`));
    const workStr = workItems.length > 0 ? workItems.join(', ') : 'Manual Entry';

    const newInvoice = {
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      client: salePatientName,
      mobile: saleMobile,
      work: workStr,
      total: finalAmount,
      balance: finalAmount,
      status: 'Pending',
      notes: saleNotes
    };

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/invoices`, newInvoice, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      alert("Error creating entry");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h3 className="modal-title">New Sale Entry</h3>
          <button className="modal-close" onClick={onClose} title="Close" aria-label="Close">
            <XIcon size={16} />
          </button>
        </div>
        
        {/* Patient Info */}
        <div style={{ marginBottom: '14px' }} ref={dropdownRef}>
          {initialPatientMobile ? (
            <div className="patient-identity-card">
              <div className="patient-identity-avatar">
                {salePatientName ? salePatientName.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="patient-identity-body">
                <div className="patient-identity-top">
                  <span className="patient-identity-name">{salePatientName}</span>
                  <span className="patient-verified-tag">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Verified
                  </span>
                </div>
                <div className="patient-identity-meta">
                  <span className="patient-meta-tag">{saleMobile}</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <label className="modal-label">Search Patient Mobile</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  value={saleMobile}
                  onChange={(e) => { setSaleMobile(e.target.value); setShowMobileDropdown(true); if(e.target.value==='') setSalePatientName(''); }}
                  onFocus={() => setShowMobileDropdown(true)}
                  placeholder="Type or select mobile number..." 
                  className="modal-text-input"
                />
                {showMobileDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 8px 16px -2px rgba(0,0,0,0.12)', zIndex: 50, maxHeight: '160px', overflowY: 'auto' }}>
                    {filteredPatients.length > 0 ? filteredPatients.map(p => (
                      <div key={p.mobile} onMouseDown={(e) => { e.preventDefault(); setSaleMobile(p.mobile); setSalePatientName(p.name); setShowMobileDropdown(false); }} style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px', display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
                        <span style={{ fontWeight: 600 }}>{p.mobile}</span><span style={{ color: '#64748b' }}>{p.name}</span>
                      </div>
                    )) : <div style={{ padding: '10px 12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>No patient found</div>}
                  </div>
                )}
              </div>
              {salePatientName && (
                <div style={{ marginTop: '8px' }}>
                  <div className="patient-identity-card" style={{ padding: '8px 12px' }}>
                    <div className="patient-identity-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                      {salePatientName.charAt(0).toUpperCase()}
                    </div>
                    <div className="patient-identity-body">
                      <div className="patient-identity-top">
                        <span className="patient-identity-name" style={{ fontSize: 13.5 }}>{salePatientName}</span>
                        <span className="patient-verified-tag" style={{ fontSize: 10.5 }}>✓ Selected</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Consultation Fee */}
        <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <input type="checkbox" id="consultationFee2" checked={includeConsultationFee} onChange={(e) => setIncludeConsultationFee(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary-color)' }} />
          <label htmlFor="consultationFee2" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#1e293b', userSelect: 'none' }}>Include Consultation Fee ({R}{consultationFeeAmount})</label>
        </div>

        {/* Services Dropdown */}
        <div style={{ marginBottom: '14px' }}>
          <label className="modal-label">Services</label>
          <CustomSelect 
            value=""
            placeholder="-- Add Service --"
            options={(servicesList || []).map(s => ({ value: s.id, label: `${s.name} - ${R}${s.price}` }))}
            onChange={(val) => {
              const srv = servicesList.find(s => s.id === val);
              if (srv && !selectedServices.find(s => s.id === srv.id)) setSelectedServices([...selectedServices, srv]);
            }}
          />
          {selectedServices.length > 0 && (
            <div className="modal-chip-group">
              {selectedServices.map(srv => (
                <span key={'s'+srv.id} className="modal-chip service">
                  {srv.name} ({R}{srv.price})
                  <span className="modal-chip-remove" onClick={() => setSelectedServices(selectedServices.filter(s => s.id !== srv.id))} title="Remove">×</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Packages Dropdown */}
        <div style={{ marginBottom: '14px' }}>
          <label className="modal-label">Packages</label>
          <CustomSelect 
            value=""
            placeholder="-- Add Package --"
            options={(allPackages || []).map(p => ({ value: p.id, label: `${p.name} - ${R}${p.price}` }))}
            onChange={(val) => {
              const pkg = allPackages.find(p => p.id === val);
              if (pkg && !selectedPackages.find(p => p.id === pkg.id)) setSelectedPackages([...selectedPackages, pkg]);
            }}
          />
          {selectedPackages.length > 0 && (
            <div className="modal-chip-group">
              {selectedPackages.map(pkg => (
                <span key={'p'+pkg.id} className="modal-chip package">
                  {pkg.name} ({R}{pkg.price})
                  <span className="modal-chip-remove" onClick={() => setSelectedPackages(selectedPackages.filter(p => p.id !== pkg.id))} title="Remove">×</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Medicines Dropdown */}
        <div style={{ marginBottom: '14px' }}>
          <label className="modal-label">Medicines</label>
          <CustomSelect 
            value=""
            placeholder="-- Add Medicine --"
            options={(allMedicines || []).map(m => ({ value: m.id, label: `${m.name} - ${R}${m.price}` }))}
            onChange={(val) => {
              const med = allMedicines.find(m => m.id === val);
              if (med && !selectedMedicines.find(m => m.id === med.id)) setSelectedMedicines([...selectedMedicines, med]);
            }}
          />
          {selectedMedicines.length > 0 && (
            <div className="modal-chip-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedMedicines.map(med => (
                <div key={'m'+med.id} className="modal-chip medicine" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {med.name} ({R}{(med.price || 0) * (med.qty || 1)})
                  <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.8 }}>Qty:</span>
                  <input type="number" min="1" value={med.qty || 1} onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setSelectedMedicines(prev => prev.map(m => m.id === med.id ? { ...m, qty: val } : m));
                  }} style={{ width: '40px', height: '22px', fontSize: '12px', padding: '0 4px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.4)', outline: 'none', background: 'transparent', color: 'inherit' }} />
                  <span className="modal-chip-remove" onClick={() => setSelectedMedicines(selectedMedicines.filter(m => m.id !== med.id))} title="Remove" style={{ marginLeft: '4px' }}>×</span>
                </div>
              ))}
            </div>
          )}
          {selectedMedicines.length > 0 && (
             <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <label className="modal-label" style={{ marginBottom: 0 }}>Duration (Days):</label>
               <input type="number" min="1" value={medicineDuration} onChange={(e) => setMedicineDuration(e.target.value)} className="modal-text-input" style={{ width: '80px', height: '32px' }} />
             </div>
          )}
        </div>

        {/* Total Amount & Notes */}
        <div style={{ marginBottom: '14px' }}>
          <label className="modal-label">Total Amount ({R})</label>
          <input type="number" value={saleTotalAmount} onChange={(e) => setSaleTotalAmount(e.target.value)} className="modal-text-input" style={{ fontWeight: 700, fontSize: '15px' }} />
        </div>
        <div style={{ marginBottom: '6px' }}>
          <label className="modal-label">Notes</label>
          <textarea value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} placeholder="Add any extra details here..." className="modal-textarea-input"></textarea>
        </div>

        <div className="modal-footer">
          <button type="button" className="crm-btn crm-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="crm-btn crm-btn-primary" onClick={handleCreateEntry}>
            Save Entry
          </button>
        </div>
      </div>
    </div>
  );
};
export default SaleEntryModal;






