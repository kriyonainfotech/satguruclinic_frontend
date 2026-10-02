import React from 'react';
import './Typography.css';

export const Title = ({ children, className = '' }) => {
  return <h1 className={`crm-title ${className}`}>{children}</h1>;
};

export const SubTitle = ({ children, className = '' }) => {
  return <h3 className={`crm-subtitle ${className}`}>{children}</h3>;
};
