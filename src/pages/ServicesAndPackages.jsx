import React, { useState } from 'react';
import Services from './Services';
import Packages from './Packages';
import Medicines from './Medicines';
import { PackageIcon, ClipboardListIcon, SparkleIcon } from '../components/Icons';
import './ServicesAndPackages.css';

const ServicesAndPackages = () => {
    const [activeTab, setActiveTab] = useState('medicines');

    return (
        <div className="services-packages-wrapper">
            {/* Top Page Header */}
            <div className="sp-page-header">
                <div className="sp-title-area">
                    <div className="sp-icon-badge">
                        <PackageIcon size={24} />
                    </div>
                    <div>
                        <h1 className="sp-main-title">Services & Packages</h1>
                    </div>
                </div>

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
                    <button
                        type="button"
                        className={`sp-tab-btn ${activeTab === 'medicines' ? 'active' : ''}`}
                        onClick={() => setActiveTab('medicines')}
                    >
                        <ClipboardListIcon size={16} /> Medicines
                    </button>
                </div>
            </div>

            {/* Active Component */}
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
                {activeTab === 'services' && <Services />}
                {activeTab === 'packages' && <Packages />}
                {activeTab === 'medicines' && <Medicines />}
            </div>
        </div>
    );
};

export default ServicesAndPackages;
