import React, { useState, useRef, useEffect } from 'react';
import { CameraIcon, XIcon, CheckCircleIcon } from './Icons';
import './ClockInCameraModal.css';

const ClockInCameraModal = ({ isOpen, onClose, onConfirm, shiftName = 'Duty', isSubmitting = false }) => {
  const [photo, setPhoto] = useState(null);
  const [streamActive, setStreamActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('initializing'); // 'initializing', 'active', 'denied', 'notfound', 'error'
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPhoto(null);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraStatus('initializing');
    setStreamActive(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('notfound');
      return;
    }

    try {
      let stream;
      try {
        // Try with front/user camera constraint first
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
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
    startCamera();
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
                  className="camera-video-feed"
                />
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
