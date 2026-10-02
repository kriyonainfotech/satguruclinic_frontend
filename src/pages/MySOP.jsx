import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MySOP = () => {
    const [sops, setSops] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchSOPs = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/sops?assignedOnly=true`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                setSops(res.data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchSOPs();
    }, [token]);

    const toggleAccordion = (id) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    return (
        <div style={{ backgroundColor: '#fff', minHeight: 'calc(100vh - 60px)', padding: '20px', boxSizing: 'border-box' }}>
            <div className="page-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2>My Standard Operating Procedures</h2>
               </div>
            </div>

            <div>
                {sops.length === 0 ? (
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                        No SOPs assigned to you yet.
                    </div>
                ) : (
                    sops.map((sop, index) => {
                        const isExpanded = expandedId === sop._id;
                        return (
                            <div key={sop._id} style={{ marginBottom: '15px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                {/* Accordion Header */}
                                <div 
                                    onClick={() => toggleAccordion(sop._id)}
                                    style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', cursor: 'pointer', background: isExpanded ? '#f8fafc' : '#fff' }}
                                >

                                    <strong style={{ fontSize: '15px', color: '#1e293b', flex: 1 }}>{index + 1}. {sop.title}</strong>
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
                                        {sop.points.length === 0 ? (
                                            <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No points found in this SOP.</div>
                                        ) : (
                                            sop.points.map((pt, idx) => (
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

export default MySOP;
