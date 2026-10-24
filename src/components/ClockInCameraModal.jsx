import React, { useState, useRef, useEffect } from 'react';
import { CameraIcon, XIcon, CheckCircleIcon } from './Icons';
import './ClockInCameraModal.css';

const ClockInCameraModal = ({ isOpen, onClose, onConfirm, shiftName = 'Duty', isSubmitting = false }) => {
  const [photo, setPhoto] = useState(null);
  const [streamActive, setStreamActive] = useState(false);
  // 'user' = front (selfie) camera, 'environment' = back camera
  const [facingMode, setFacingMode] = useState('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('initializing'); // 'initializing', 'active', 'denied', 'notfound', 'insecure', 'error'
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // <video> sirf streamActive hone ke baad render hota hai, isliye stream ko mount hone ke baad jodna padta hai
  // (pehle startCamera me videoRef null hota tha aur box blank/kaala aata tha)
  useEffect(() => {
    const video = videoRef.current;
    if (streamActive && video && streamRef.current && video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
      video.play().catch(() => {});
    }
  }, [streamActive, photo]);

  useEffect(() => {
    if (isOpen) {
      setPhoto(null);
      setFacingMode('user');
      startCamera('user');
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async (mode = facingMode) => {
    setCameraStatus('initializing');
    setStreamActive(false);

    // Browser camera sirf https (ya localhost) pe deta hai. http://192.168.x.x pe mediaDevices hota hi nahi.
    if (!window.isSecureContext) {
      setCameraStatus('insecure');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('notfound');
      return;
    }

    try {
      let stream;
      try {
        // Try with selected (front / back) camera first
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
      } catch (err1) {
        // Fallback for desktop PC/USB webcams that don't support facingMode constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
      }

      streamRef.current = stream;

      // Ek se zyada camera ho tabhi Flip button dikhe
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setHasMultipleCameras(devices.filter(d => d.kind === 'videoinput').length > 1);
      } catch (e) {
        setHasMultipleCameras(false);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setStreamActive(true);
      setCameraStatus('active');
    } catch (err) {
      console.warn('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraStatus('notfound');
      } else {
        setCameraStatus('error');
      }
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {}
      });
      streamRef.current = null;
    }
    setStreamActive(false);
  };

  // Only captures real live photo from the active webcam stream (no file picker allowed)
  const handleTakePhoto = () => {
    if (!streamActive || !videoRef.current || !canvasRef.current) {
      if (cameraStatus === 'denied') {
        alert('Please allow camera permission in browser to take live selfie.');
      } else if (cameraStatus === 'notfound') {
        alert('No camera detected on this device. Live camera is required for clock in.');
      } else if (cameraStatus === 'insecure') {
        alert('Camera only works on a secure (https) link. Please open the website with https.');
      } else {
        alert('Camera is starting, please wait a moment.');
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhoto(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setPhoto(null);
    startCamera(facingMode);
  };

  const handleFlipCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    stopCamera();
    setFacingMode(next);
    startCamera(next);
  };

  const handleConfirmClockIn = () => {
    if (!photo) {
      alert('Please take a live photo first.');
      return;
    }
    onConfirm(photo);
  };

  if (!isOpen) return null;

  return (
    <div className="camera-modal-overlay">
      <div className="camera-modal-card">
        {/* Header */}
        <div className="camera-modal-header">
          <div className="camera-modal-title-wrap">
            <div className="camera-modal-icon-badge">
              <CameraIcon size={20} color="#144b79" />
            </div>
            <div>
              <h3 className="camera-modal-title">Live Photo Verification</h3>
              <p className="camera-modal-subtitle">Clock In for {shiftName}</p>
            </div>
          </div>
          <button 
            type="button" 
            className="camera-modal-close-btn" 
            onClick={onClose} 
            disabled={isSubmitting}
            title="Cancel"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="camera-modal-body">
          <div className="camera-viewfinder-container">
            {photo ? (
              <div className="camera-preview-wrap">
                <img src={photo} alt="Clock In Preview" className="camera-preview-img" />
                <div className="camera-captured-badge">
                  <CheckCircleIcon size={14} color="#16a34a" />
                  <span>Photo Captured</span>
                </div>
              </div>
            ) : streamActive ? (
              <div className="camera-live-wrap">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`camera-video-feed ${facingMode === 'user' ? 'mirrored' : ''}`}
                />
                {hasMultipleCameras && (
                  <button
                    type="button"
                    className="camera-flip-btn"
                    onClick={handleFlipCamera}
                    disabled={isSubmitting}
                    title={facingMode === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
                    aria-label="Flip camera"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 7h-3l-2-3H9L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                      <path d="M9 13a3 3 0 0 1 5.2-2" />
                      <polyline points="14.5 8.5 14.5 11 12 11" />
                      <path d="M15 13a3 3 0 0 1-5.2 2" />
                      <polyline points="9.5 17.5 9.5 15 12 15" />
                    </svg>
                    <span>Flip</span>
                  </button>
                )}
                <div className="face-guide-frame">
                  <div className="face-guide-oval"></div>
                  <span className="face-guide-text">Position your face inside frame</span>
                </div>
              </div>
            ) : (
              <div className="camera-placeholder-wrap">
                <div className="camera-placeholder-icon">
                  <CameraIcon size={36} color="#94a3b8" />
                </div>
                {cameraStatus === 'denied' ? (
                  <>
                    <h4 className="camera-placeholder-title" style={{ color: '#f87171' }}>Camera Permission Blocked</h4>
                    <p className="camera-placeholder-desc">Please click the camera/lock icon in browser address bar and select "Allow".</p>
                  </>
                ) : cameraStatus === 'notfound' ? (
                  <>
                    <h4 className="camera-placeholder-title" style={{ color: '#f87171' }}>No Camera Detected</h4>
                    <p className="camera-placeholder-desc">Live webcam is required. Uploading saved files is not allowed.</p>
                  </>
                ) : cameraStatus === 'insecure' ? (
                  <>
                    <h4 className="camera-placeholder-title" style={{ color: '#f87171' }}>Secure Link Required</h4>
                    <p className="camera-placeholder-desc">Camera only works on an https:// link. Please open the website using https.</p>
                  </>
                ) : cameraStatus === 'error' ? (
                  <>
                    <h4 className="camera-placeholder-title" style={{ color: '#f87171' }}>Camera Not Available</h4>
                    <p className="camera-placeholder-desc">Camera may be in use by another app. Close it and try again.</p>
                    <button type="button" className="camera-btn-secondary" style={{ marginTop: '10px' }} onClick={startCamera}>
                      Try Again
                    </button>
                  </>
                ) : (
                  <>
                    <h4 className="camera-placeholder-title">Starting Camera...</h4>
                    <p className="camera-placeholder-desc">Please wait while your live camera is connecting.</p>
                  </>
                )}
              </div>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="camera-modal-footer">
          {photo ? (
            <div className="camera-footer-btn-row">
              <button 
                type="button" 
                className="camera-btn-secondary" 
                onClick={handleRetake} 
                disabled={isSubmitting}
              >
                Retake
              </button>
              <button 
                type="button" 
                className="camera-btn-primary" 
                onClick={handleConfirmClockIn} 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Uploading & Clocking In...' : 'Confirm & Clock In'}
              </button>
            </div>
          ) : (
            <button 
              type="button" 
              className="camera-btn-primary full-width" 
              onClick={handleTakePhoto}
              disabled={!streamActive}
            >
              <CameraIcon size={18} />
              <span>Take Photo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClockInCameraModal;
