import React, { useState } from 'react';
import Services from './Services';
import Packages from './Packages';
import { PackageIcon, SparkleIcon } from '../components/Icons';
import './ServicesAndPackages.css';

const ServicesAndPackages = () => {
    const [activeTab, setActiveTab] = useState('services');

    return (
        <div className="services-packages-wrapper">
            {/* Top Page Header */}
            <div className="page-header" style={{ marginBottom: '16px' }}>
                <h2>Services & Packages</h2>
                {/* Modern Tab Switcher */}
                <div className="sp-tab-nav">
                    <button
                        type="button"
                        className={`sp-tab-btn ${activeTab === 'services' ? 'active' : ''}`}
                        onClick={() => setActiveTab('services')}
                    >
                        <SparkleIcon size={16} /> Services
                    </button>
                    <button
                        type="button"
                        className={`sp-tab-btn ${activeTab === 'packages' ? 'active' : ''}`}
                        onClick={() => setActiveTab('packages')}
                    >
                        <PackageIcon size={16} /> Packages
                    </button>
                </div>
            </div>

            {/* Active Component */}
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
                {activeTab === 'services' && <Services />}
                {activeTab === 'packages' && <Packages />}
            </div>
        </div>
    );
};

export default ServicesAndPackages;
