import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MyRule from './MyRule';
import MySOP from './MySOP';
import usePermissions from '../permissions/usePermissions';

const MyWorkspace = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || (location.pathname === '/my-sop' ? 'sop' : 'rules');
  const [activeTab, setActiveTab] = useState(initialTab);
  const { can } = usePermissions();
  const showSop = can('my-workspace:sop-tab');
  const showRules = can('my-workspace:rules-tab');
  // Jo tab permission se band hai uski jagah doosra tab dikhao
  const currentTab = activeTab === 'sop' && !showSop ? 'rules' : activeTab === 'rules' && !showRules ? 'sop' : activeTab;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/my-workspace?tab=${tab}`, { replace: true });
  };

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: 'calc(100vh - 60px)', boxSizing: 'border-box' }}>
      {/* Slider / Tab Navigation */}
      <div style={{ background: '#fff', padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '30px' }}>
        {showSop && (
        <button 
          onClick={() => handleTabChange('sop')}
          style={{ 
            background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer',
            fontSize: '16px', fontWeight: '600', color: currentTab === 'sop' ? '#144b79' : '#64748b',
            borderBottom: currentTab === 'sop' ? '3px solid #144b79' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          My SOP
        </button>
        )}
        {showRules && (
        <button 
          onClick={() => handleTabChange('rules')}
          style={{ 
            background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer',
            fontSize: '16px', fontWeight: '600', color: currentTab === 'rules' ? '#144b79' : '#64748b',
            borderBottom: currentTab === 'rules' ? '3px solid #144b79' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          My Rules
        </button>
        )}
      </div>

      <div style={{ padding: '20px' }}>
        {showSop && (
        <div style={{ display: currentTab === 'sop' ? 'block' : 'none' }}>
           <MySOP isEmbedded={true} />
        </div>
        )}
        {showRules && (
        <div style={{ display: currentTab === 'rules' ? 'block' : 'none' }}>
           <MyRule isEmbedded={true} />
        </div>
        )}
      </div>
    </div>
  );
};

export default MyWorkspace;
