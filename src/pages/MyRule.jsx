import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MyRule = () => {
    const [rules, setSops] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchRules = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/rules?assignedOnly=true`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                setSops(res.data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchRules();
    }, [token]);

    const toggleAccordion = (id) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    return (
        <div style={{ backgroundColor: '#fff', minHeight: 'calc(100vh - 60px)', padding: '20px', boxSizing: 'border-box' }}>
            <div className="page-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2>My Rules</h2>
                   
                </div>
            </div>

            <div>
                {rules.length === 0 ? (
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                        No Rules assigned to you yet.
                    </div>
                ) : (
                    rules.map((rule, index) => {
                        const isExpanded = expandedId === rule._id;
                        return (
                            <div key={rule._id} style={{ marginBottom: '15px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                {/* Accordion Header */}
                                <div 
                                    onClick={() => toggleAccordion(rule._id)}
                                    style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', cursor: 'pointer', background: isExpanded ? '#f8fafc' : '#fff' }}
                                >

                                    <strong style={{ fontSize: '15px', color: '#1e293b', flex: 1 }}>{index + 1}. {rule.title}</strong>
                                    <svg 
                                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
                                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                                    >
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                                
                                {/* Accordion Body */}
                                {isExpanded && (
                                    <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0' }}>
                                        {rule.points.length === 0 ? (
                                            <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No points found in this Rule.</div>
                                        ) : (
                                            rule.points.map((pt, idx) => (
                                                <div key={pt._id} style={{ marginBottom: '25px', paddingLeft: '10px' }}>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                                                        <span style={{ color: '#0f4a8a', fontSize: '10px', marginTop: '4px' }}>●</span>
                                                        <div style={{ fontSize: '14px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                                            <span style={{ color: '#0f4a8a', fontWeight: 'bold', marginRight: '6px' }}>{idx + 1}.</span> 
                                                            {pt.heading ? pt.heading.trim() : ''}
                                                        </div>
                                                    </div>
                                                    {pt.description && (
                                                        <div style={{ marginLeft: '16px', marginTop: '10px', fontSize: '13px', color: '#475569', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                                            {pt.description}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default MyRule;
