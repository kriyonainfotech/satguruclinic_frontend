import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MyRule from './MyRule';
import MySOP from './MySOP';

const MyWorkspace = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || (location.pathname === '/my-sop' ? 'sop' : 'rules');
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/my-workspace?tab=${tab}`, { replace: true });
  };

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: 'calc(100vh - 60px)', boxSizing: 'border-box' }}>
      {/* Slider / Tab Navigation */}
      <div style={{ background: '#fff', padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '30px' }}>
        <button 
          onClick={() => handleTabChange('sop')}
          style={{ 
            background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer',
            fontSize: '16px', fontWeight: '600', color: activeTab === 'sop' ? '#144b79' : '#64748b',
            borderBottom: activeTab === 'sop' ? '3px solid #144b79' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          My SOP
        </button>
        <button 
          onClick={() => handleTabChange('rules')}
          style={{ 
            background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer',
            fontSize: '16px', fontWeight: '600', color: activeTab === 'rules' ? '#144b79' : '#64748b',
            borderBottom: activeTab === 'rules' ? '3px solid #144b79' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          My Rules
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ display: activeTab === 'sop' ? 'block' : 'none' }}>
           <MySOP isEmbedded={true} />
        </div>
        <div style={{ display: activeTab === 'rules' ? 'block' : 'none' }}>
           <MyRule isEmbedded={true} />
        </div>
      </div>
    </div>
  );
};

export default MyWorkspace;
