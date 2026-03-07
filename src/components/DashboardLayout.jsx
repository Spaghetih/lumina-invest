import React, { useState } from 'react';
import { Activity, Home, TrendingUp, PieChart, Info, Settings, Search, Plus, X, Upload, Eye, EyeOff, Sparkles, Menu, Calendar } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import NotificationCenter from './NotificationCenter';
import './DashboardLayout.css';

export default function DashboardLayout({ children, activeTab, onTabChange, onAddPositionClick, onImportClick, onSearch }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { currency, toggleCurrency, fxRate, hideBalances, toggleHideBalances } = useCurrency();

    const handleSearchSubmit = (e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            onSearch(searchQuery.trim());
            setSearchQuery('');
        }
    };
    return (
        <div className="dashboard-wrapper">
            {/* Mobile Overlay */}
            <div
                className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            <aside className={`sidebar glass-panel ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
                <div className="logo-container">
                    <TrendingUp className="logo-icon" size={28} />
                    <span className="logo-text text-gradient">Lumina Invest</span>
                    <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="nav-menu">
                    <a href="#" className={`nav-item ${activeTab === 'Dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTabChange('Dashboard'); setIsMobileMenuOpen(false); }}>
                        <Home size={20} />
                        <span>Dashboard</span>
                    </a>
                    <a href="#" className={`nav-item ${activeTab === 'Markets' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTabChange('Markets'); setIsMobileMenuOpen(false); }}>
                        <Activity size={20} />
                        <span>Markets</span>
                    </a>
                    <a href="#" className={`nav-item ${activeTab === 'Portfolio' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTabChange('Portfolio'); setIsMobileMenuOpen(false); }}>
                        <PieChart size={20} />
                        <span>Portfolio</span>
                    </a>
                    <a href="#" className={`nav-item ${activeTab === 'Dividends' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTabChange('Dividends'); setIsMobileMenuOpen(false); }}>
                        <Calendar size={20} />
                        <span>Dividends</span>
                    </a>
                    <a href="#" className={`nav-item ${activeTab === 'Insights' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTabChange('Insights'); setIsMobileMenuOpen(false); }}>
                        <Info size={20} />
                        <span>Insights</span>
                    </a>
                    <a href="#" className={`nav-item ${activeTab === 'AI' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTabChange('AI'); setIsMobileMenuOpen(false); }}>
                        <Sparkles size={20} />
                        <span>Lumina AI</span>
                    </a>
                </nav>

                <div className="nav-bottom">
                    <a href="#" className={`nav-item ${activeTab === 'Settings' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTabChange('Settings'); setIsMobileMenuOpen(false); }}>
                        <Settings size={20} />
                        <span>Settings</span>
                    </a>
                </div>
            </aside>

            <main className="main-content">
                <header className="topbar glass-panel">
                    <div className="topbar-left">
                        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
                            <Menu size={24} />
                        </button>
                        <div className="search-bar">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Type a ticker and press Enter to add..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchSubmit}
                            />
                        </div>
                    </div>
                    <div className="topbar-actions">
                        <button className="btn-secondary import-btn" onClick={onImportClick}>
                            <Upload size={16} />
                            Import
                        </button>
                        <button className="btn-primary" onClick={onAddPositionClick}>
                            <Plus size={16} />
                            Add Position
                        </button>

                        <button className="currency-toggle glass-panel" onClick={toggleCurrency} title={`Switch to ${currency === 'EUR' ? 'USD' : 'EUR'} (rate: 1€ = $${fxRate?.toFixed(4)})`}>
                            <span className={currency === 'EUR' ? 'active' : ''}>€</span>
                            <span className="currency-divider">/</span>
                            <span className={currency === 'USD' ? 'active' : ''}>$</span>
                        </button>

                        <button className="icon-btn glass-panel hide-balance-btn" onClick={toggleHideBalances} title={hideBalances ? 'Show balances' : 'Hide balances'}>
                            {hideBalances ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>

                        <NotificationCenter />

                        <img src="https://i.pravatar.cc/100?img=11" alt="User" className="avatar" />
                    </div>
                </header>

                <div className="layout-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
