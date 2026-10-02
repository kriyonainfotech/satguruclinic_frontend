import React from 'react';
import './Button.css';

const Button = ({ children, onClick, type = 'button', variant = 'primary', className = '' }) => {
  return (
    <button 
      type={type} 
      onClick={onClick} 
      className={`crm-btn crm-btn-${variant} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
