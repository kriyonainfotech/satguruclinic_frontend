import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import { 
  WalletIcon, 
  CheckCircleIcon, 
  ClockIcon,
  TrashIcon
} from '../components/Icons';
import './PaymentQR.css';

const PaymentQR = () => {
  const [upiId, setUpiId] = useState('');
  const [amount, setAmount] = useState('');
  const [savedUpiId, setSavedUpiId] = useState('');
  const [copyStatus, setCopyStatus] = useState(false);
  const [saveStatus, setSaveStatus] = useState(false);
  const qrRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('superadmin_upi_id');
    if (saved) {
      setUpiId(saved);
      setSavedUpiId(saved);
    }
  }, []);

  const handleSaveUpiId = () => {
    if (!upiId.trim()) {
      handleClearUpiId();
      return;
    }
    localStorage.setItem('superadmin_upi_id', upiId.trim());
    setSavedUpiId(upiId.trim());
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 3000);
    alert('UPI ID saved successfully!');
  };

  const handleClearUpiId = () => {
    localStorage.removeItem('superadmin_upi_id');
    setSavedUpiId('');
    setUpiId('');
    setAmount('');
    alert('UPI ID removed! Status is now reset to UPI Not Configured.');
  };

  const getUpiUrl = () => {
    if (!savedUpiId) return '';
    let url = `upi://pay?pa=${encodeURIComponent(savedUpiId)}&pn=Satguru%20Clinic&cu=INR`;
    if (amount && Number(amount) > 0) {
      url += `&am=${amount}`;
    }
    return url;
  };

  const handleCopyToClipboard = async () => {
    if (!qrRef.current) return;
    try {
      const canvas = await html2canvas(qrRef.current, { scale: 2 });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          setCopyStatus(true);
          setTimeout(() => setCopyStatus(false), 3000);
          alert('QR Code image copied to clipboard!');
        } catch (err) {
          console.error('Failed to copy: ', err);
          alert('Failed to copy image to clipboard. Your browser might not support this feature.');
        }
      });
    } catch (err) {
      console.error('Error generating image: ', err);
    }
  };

  

  return (
    <div className="payment-qr-page-container">
      {/* Top Header Card */}
      <div className="payment-qr-header-card">
        <div className="payment-qr-header-left">
          <div className="payment-qr-icon-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="5" height="5" x="3" y="3" rx="1" />
              <rect width="5" height="5" x="16" y="3" rx="1" />
              <rect width="5" height="5" x="3" y="16" rx="1" />
              <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
              <path d="M21 21v.01" />
              <path d="M12 7v3a2 2 0 0 1-2 2H7" />
              <path d="M3 12h.01" />
              <path d="M12 3h.01" />
              <path d="M12 16v.01" />
              <path d="M16 12h1" />
              <path d="M21 12v.01" />
              <path d="M12 21v-1" />
            </svg>
          </div>
          <div>
            <h2 className="payment-qr-title">Payment QR Generator</h2>
          
          </div>
        </div>

        <div>
          {savedUpiId ? (
            <span className="payment-qr-status-pill status-pill-active">
              <span className="status-dot"></span>
              UPI Active: {savedUpiId}
            </span>
          ) : (
            <span className="payment-qr-status-pill status-pill-inactive">
              <span className="status-dot"></span>
              UPI Not Configured
            </span>
          )}
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className="payment-qr-grid">
        {/* Left: Configuration Form */}
        <div className="config-card">
          <div className="config-card-header">
            <h3 className="config-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color, #144b79)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Configuration
            </h3>
            {saveStatus && (
              <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircleIcon size={14} /> Saved!
              </span>
            )}
          </div>

          {/* UPI ID Field */}
          <div className="config-field-group">
            <label className="config-label">Your UPI ID</label>
            <div className="config-input-wrap">
              <input
                type="text"
                className="config-input"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. 9887678989@oksbi"
              />
              <button 
                type="button"
                onClick={handleSaveUpiId} 
                className="config-save-btn" 
                title="Save UPI ID"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                <span>Save</span>
              </button>
              {(savedUpiId || upiId) && (
                <button 
                  type="button"
                  onClick={handleClearUpiId} 
                  className="config-clear-btn" 
                  title="Clear / Reset UPI ID"
                >
                  <TrashIcon size={15} />
                  <span>Clear</span>
                </button>
              )}
            </div>
            <div className="config-helper-text">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>Save this to attach it to your clinic profile permanently.</span>
            </div>
          </div>

          {/* Payment Amount Field */}
          <div className="config-field-group">
            <label className="config-label">Payment Amount (₹)</label>
            <div className="amount-input-container">
              <span className="amount-currency-symbol">₹</span>
              <input
                type="number"
                className="amount-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000"
                min="0"
              />
            </div>

           
          </div>

          {/* Copy Button */}
          <button 
            type="button"
            onClick={handleCopyToClipboard} 
            className="config-copy-action-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>{copyStatus ? 'Copied to Clipboard!' : 'Copy Image to Clipboard'}</span>
          </button>
        </div>

        {/* Right: Live Preview */}
        <div className="preview-card-wrap">
          <div className="preview-badge-label">
            <span className="live-pulse-dot"></span>
            Live Preview
          </div>

          <div className="qr-bill-card" ref={qrRef}>
            <h3 className="qr-card-clinic-name">
              {JSON.parse(localStorage.getItem('user') || '{}')?.name?.toUpperCase() || 'SATGURU CLINIC'}
            </h3>
            
            <div className="qr-card-scan-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              </svg>
              <span>Scan To Pay</span>
            </div>

            {savedUpiId ? (
              <div className="qr-card-code-container">
                <QRCode value={getUpiUrl()} size={200} />
              </div>
            ) : (
              <div className="qr-card-placeholder">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M7 7h.01" />
                  <path d="M17 7h.01" />
                  <path d="M7 17h.01" />
                </svg>
                <span>Please set and save your UPI ID first.</span>
              </div>
            )}

            {amount && Number(amount) > 0 && (
              <div className="qr-card-amount-pill">
                <span>₹</span>
                <span>{Number(amount).toLocaleString()}</span>
              </div>
            )}

            {savedUpiId && (
              <div className="qr-card-upi-id-text">
                UPI ID: {savedUpiId}
              </div>
            )}

            <div className="qr-card-footer">
              <CheckCircleIcon size={13} color="#10b981" />
              <span>Accepts GPay, PhonePe, Paytm, BHIM & UPI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentQR;
