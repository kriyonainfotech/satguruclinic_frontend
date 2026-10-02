import React from 'react';
import './FormInput.css';

const FormInput = ({ label, type = 'text', placeholder, value, onChange, required = false, isTextArea = false, ...props }) => {
  return (
    <div className="crm-input-group">
      {label && <label className="crm-input-label">{label}</label>}
      {isTextArea ? (
        <textarea
          className="crm-input"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          rows={4}
          {...props}
        />
      ) : (
        <input
          type={type}
          className="crm-input"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          {...props}
        />
      )}
    </div>
  );
};

export default FormInput;
