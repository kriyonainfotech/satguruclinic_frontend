import React from 'react';
import { XIcon } from './Icons';

const Modal = ({ isOpen, onClose, title, children, maxWidth = '500px' }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button className="modal-close" onClick={onClose} title="Close" aria-label="Close">
                        <XIcon size={16} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default Modal;
