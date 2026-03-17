import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Home, TrendingUp, PieChart, Info, Settings, Search, Plus, X, Upload, Eye, EyeOff, Sparkles, Menu, Calendar, LineChart, ListFilter, History, Sun, Moon, ChevronDown, FolderPlus, Trash2, LogOut, User, Shield, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchAuth } from '../services/fetchAuth';
import { useCurrency } from '../contexts/CurrencyContext';
import NotificationCenter from './NotificationCenter';
import './DashboardLayout.css';

export default function DashboardLayout({ children, activeTab, onTabChange, onAddPositionClick, onImportClick, onSearch, portfolios = [], activePortfolioId, onSwitchPortfolio, onCreatePortfolio, onDeletePortfolio, onRenamePortfolio }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [portfolioDropdownOpen, setPortfolioDropdownOpen] = useState(false);
    const [newPortfolioName, setNewPortfolioName] = useState('');
    const { currency, toggleCurrency, fxRate, hideBalances, toggleHideBalances, theme, toggleTheme } = useCurrency();
    const { user, logout } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [avatarDropdown, setAvatarDropdown] = useState(false);
    const avatarInputRef = useRef(null);
    const avatarDropdownRef = useRef(null);

    useEffect(() => {
        if (user?.id) setAvatarUrl('/api/avatar/' + user.id + '?t=' + Date.now());
    }, [user?.id]);

    useEffect(() => {
        const handleClick = (e) => {
            if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(e.target)) {
                setAvatarDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('avatar', file);
        try {
            const token = localStorage.getItem('lumina_token');
            const res = await fetch('/api/avatar', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData
            });
            if (res.ok) setAvatarUrl('/api/avatar/' + user.id + '?t=' + Date.now());
        } catch (err) { console.error('Avatar upload failed:', err); }
        setAvatarDropdown(false);
    };

    const portfolioRef = useRef(null);
    const activePortfolioName = portfolios.find(p => p.id === activePortfolioId)?.name || 'Portfolio';

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (portfolioRef.current && !portfolioRef.current.contains(e.target)) {
                setPortfolioDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

            <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
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
                    <a href="#" className={`nav-item ${activeTab === 'Charts' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTabChange('Charts'); setIsMobileMenuOpen(false); }}>
                        <LineChart size={20} />
                        <span>Charts</span>
                    </a>
                    <a href="#" className={`nav-item ${activeTab === 'Watchlist' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTabChange('Watchlist'); setIsMobileMenuOpen(false); }}>
                        <Eye size={20} />
                        <span>Watchlist</span>
                    </a>
                    <a href="#" className={`nav-item ${activeTab === 'Screener' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTabChange('Screener'); setIsMobileMenuOpen(false); }}>
                        <ListFilter size={20} />
                        <span>Screener</span>
                    </a>
                    <a href="#" className={`nav-item ${activeTab === 'Portfolio' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTabChange('Portfolio'); setIsMobileMenuOpen(false); }}>
                        <PieChart size={20} />
                        <span>Portfolio</span>
                    </a>
                    <a href="#" className={`nav-item ${activeTab === 'Backtest' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTabChange('Backtest'); setIsMobileMenuOpen(false); }}>
                        <History size={20} />
                        <span>Backtest</span>
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
                    {user?.role === 'admin' && (
                        <a href="#" className={`nav-item ${activeTab === 'Admin' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTabChange('Admin'); setIsMobileMenuOpen(false); }}>
                            <Shield size={20} />
                            <span>Admin</span>
                        </a>
                    )}
                </nav>

                <div className="nav-bottom">
                    <a href="#" className={`nav-item ${activeTab === 'Settings' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onTabChange('Settings'); setIsMobileMenuOpen(false); }}>
                        <Settings size={20} />
                        <span>Settings</span>
                    </a>
                </div>

                <div className="sidebar-user">
                    <div className="sidebar-user-info">
                        <User size={16} />
                        <span>{user?.username}</span>
                    </div>
                    <button className="sidebar-logout-btn" onClick={logout} title="Logout">
                        <LogOut size={16} />
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
                            <Menu size={24} />
                        </button>

                        {/* Portfolio Selector */}
                        <div className="portfolio-selector" ref={portfolioRef} style={{ position: 'relative' }}>
                            <button className="portfolio-selector-btn" onClick={() => setPortfolioDropdownOpen(!portfolioDropdownOpen)}>
                                <PieChart size={14} />
                                <span>{activePortfolioName}</span>
                                <ChevronDown size={14} className={portfolioDropdownOpen ? 'chevron-open' : ''} />
                            </button>
                            {portfolioDropdownOpen && (
                                <div className="portfolio-dropdown">
                                    <div className="portfolio-dropdown-list">
                                        {portfolios.map(p => (
                                            <div key={p.id} className={`portfolio-dropdown-item ${p.id === activePortfolioId ? 'active' : ''}`}>
                                                <button className="portfolio-dropdown-name" onClick={() => { onSwitchPortfolio(p.id); setPortfolioDropdownOpen(false); }}>
                                                    {p.name}
                                                </button>
                                                {p.id !== 'default' && (
                                                    <button className="portfolio-delete-btn" onClick={(e) => { e.stopPropagation(); onDeletePortfolio(p.id); }} title="Delete portfolio">
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="portfolio-dropdown-create">
                                        <input
                                            type="text"
                                            placeholder="New portfolio name..."
                                            value={newPortfolioName}
                                            onChange={(e) => setNewPortfolioName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && newPortfolioName.trim()) {
                                                    onCreatePortfolio(newPortfolioName.trim());
                                                    setNewPortfolioName('');
                                                }
                                            }}
                                        />
                                        <button
                                            className="portfolio-create-btn"
                                            onClick={() => {
                                                if (newPortfolioName.trim()) {
                                                    onCreatePortfolio(newPortfolioName.trim());
                                                    setNewPortfolioName('');
                                                }
                                            }}
                                            title="Create portfolio"
                                        >
                                            <FolderPlus size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

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

                        <button className="currency-toggle" onClick={toggleCurrency} title={`Switch to ${currency === 'EUR' ? 'USD' : 'EUR'} (rate: 1€ = $${fxRate?.toFixed(4)})`}>
                            <span className={currency === 'EUR' ? 'active' : ''}>€</span>
                            <span className="currency-divider">/</span>
                            <span className={currency === 'USD' ? 'active' : ''}>$</span>
                        </button>

                        <button className="icon-btn hide-balance-btn" onClick={toggleHideBalances} title={hideBalances ? 'Show balances' : 'Hide balances'}>
                            {hideBalances ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>

                        <button className="icon-btn theme-toggle-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        <NotificationCenter />

                        <div className="avatar-wrapper" ref={avatarDropdownRef}>
                            <img
                                src={avatarUrl}
                                alt={user?.username}
                                className="avatar"
                                onClick={() => setAvatarDropdown(!avatarDropdown)}
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                            <div className="avatar-fallback" onClick={() => setAvatarDropdown(!avatarDropdown)}>
                                {user?.username?.[0]?.toUpperCase() || '?'}
                            </div>
                            {avatarDropdown && (
                                <div className="avatar-dropdown">
                                    <div className="avatar-dropdown-header">
                                        <span className="avatar-dropdown-name">{user?.username}</span>
                                        <span className="avatar-dropdown-role">{user?.role}</span>
                                    </div>
                                    <button className="avatar-dropdown-item" onClick={() => avatarInputRef.current?.click()}>
                                        <Camera size={14} />
                                        Change Photo
                                    </button>
                                    <button className="avatar-dropdown-item logout" onClick={logout}>
                                        <LogOut size={14} />
                                        Logout
                                    </button>
                                    <input ref={avatarInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleAvatarUpload} />
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="layout-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
