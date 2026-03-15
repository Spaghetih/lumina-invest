import React, { useState, useRef } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import toast from 'react-hot-toast';
import {
    Eye, EyeOff, Globe, Bell, BellOff, Palette, Download, Upload,
    Trash2, RefreshCw, Database, Shield, Moon, Sun, Clock,
    ChevronRight, AlertTriangle, Check, Info, MessageSquare, Send
} from 'lucide-react';
import PriceAlerts from './PriceAlerts';
import { exportPortfolioCSV } from '../services/exportService';
import './Settings.css';

const Settings = ({ stocks, onImportClick, onClearData }) => {
    const { currency, toggleCurrency, fxRate, hideBalances, toggleHideBalances } = useCurrency();

    // Local settings state — persisted in localStorage
    const [refreshInterval, setRefreshInterval] = useState(
        parseInt(localStorage.getItem('refreshInterval') || '30')
    );
    const [notifications, setNotifications] = useState(
        localStorage.getItem('notifications') !== 'false'
    );
    const [priceAlerts, setPriceAlerts] = useState(
        localStorage.getItem('priceAlerts') !== 'false'
    );
    const [compactMode, setCompactMode] = useState(
        localStorage.getItem('compactMode') === 'true'
    );
    const [showPerformanceBadge, setShowPerformanceBadge] = useState(
        localStorage.getItem('showPerformanceBadge') !== 'false'
    );
    const [decimals, setDecimals] = useState(
        parseInt(localStorage.getItem('displayDecimals') || '2')
    );
    const [confirmDeletes, setConfirmDeletes] = useState(
        localStorage.getItem('confirmDeletes') !== 'false'
    );
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Discord States
    const [discordEnabled, setDiscordEnabled] = useState(
        localStorage.getItem('discordEnabled') === 'true'
    );
    const [discordWebhookUrl, setDiscordWebhookUrl] = useState(
        localStorage.getItem('discordWebhookUrl') || ''
    );

    const saveSetting = (key, value) => {
        localStorage.setItem(key, value.toString());
    };

    const handleRefreshChange = (val) => {
        setRefreshInterval(val);
        saveSetting('refreshInterval', val);
    };

    const handleNotificationsToggle = () => {
        const next = !notifications;
        setNotifications(next);
        saveSetting('notifications', next);
    };

    const handlePriceAlertsToggle = () => {
        const next = !priceAlerts;
        setPriceAlerts(next);
        saveSetting('priceAlerts', next);
    };

    const handleCompactToggle = () => {
        const next = !compactMode;
        setCompactMode(next);
        saveSetting('compactMode', next);
    };

    const handleDiscordToggle = () => {
        const next = !discordEnabled;
        setDiscordEnabled(next);
        saveSetting('discordEnabled', next);
    };

    const handleDiscordUrlChange = (e) => {
        const val = e.target.value;
        setDiscordWebhookUrl(val);
        saveSetting('discordWebhookUrl', val);
    };

    const testDiscordWebhook = async () => {
        if (!discordWebhookUrl) {
            toast.error("Please enter a Discord Webhook URL first.");
            return;
        }

        try {
            const res = await fetch(discordWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: "Lumina Invest",
                    avatar_url: "https://i.imgur.com/8Q5Z2g6.png",
                    embeds: [{
                        title: "✅ Test Notification",
                        description: "Your Discord Webhook is successfully connected to the Lumina Invest Dashboard!",
                        color: 3200171, // Green
                        timestamp: new Date().toISOString()
                    }]
                })
            });

            if (res.ok) {
                toast.success("Test message sent to Discord!");
            } else {
                toast.error("Discord rejected the webhook. Check the URL.");
            }
        } catch (error) {
            toast.error("Failed to connect to Discord endpoint.");
        }
    };

    const handlePerformanceBadgeToggle = () => {
        const next = !showPerformanceBadge;
        setShowPerformanceBadge(next);
        saveSetting('showPerformanceBadge', next);
    };

    const handleDecimalsChange = (val) => {
        setDecimals(val);
        saveSetting('displayDecimals', val);
    };

    const handleConfirmDeletesToggle = () => {
        const next = !confirmDeletes;
        setConfirmDeletes(next);
        saveSetting('confirmDeletes', next);
    };

    // Export portfolio as JSON
    const handleExport = () => {
        const data = {
            stocks: stocks || [],
            settings: {
                currency,
                refreshInterval,
                notifications,
                priceAlerts,
                decimals,
                compactMode,
                showPerformanceBadge,
                confirmDeletes,
            },
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lumina-invest-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Portfolio exported successfully');
    };

    // Clear all data
    const handleClearAll = () => {
        localStorage.clear();
        if (onClearData) onClearData();
        setShowClearConfirm(false);
        window.location.reload();
    };

    const positionCount = stocks?.length || 0;
    const totalInvested = stocks?.reduce((sum, s) => sum + (s.avgPrice || 0) * (s.shares || 0), 0) || 0;

    return (
        <div className="settings-page fade-in">
            <div className="settings-header">
                <h2>Settings</h2>
                <p className="settings-subtitle">Customize your Lumina Invest experience</p>
            </div>

            <div className="settings-grid">
                {/* ─── Display Preferences ─── */}
                <div className="settings-section glass-panel">
                    <div className="settings-section-header">
                        <Palette size={20} />
                        <h3>Display</h3>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <Globe size={18} />
                            <div>
                                <span className="setting-label">Currency</span>
                                <span className="setting-desc">Display currency for all values</span>
                            </div>
                        </div>
                        <button className="setting-toggle-pill" onClick={toggleCurrency}>
                            <span className={currency === 'EUR' ? 'pill-active' : ''}>€ EUR</span>
                            <span className={currency === 'USD' ? 'pill-active' : ''}>$ USD</span>
                        </button>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            {hideBalances ? <EyeOff size={18} /> : <Eye size={18} />}
                            <div>
                                <span className="setting-label">Hide Balances</span>
                                <span className="setting-desc">Mask monetary values and shares</span>
                            </div>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" checked={hideBalances} onChange={toggleHideBalances} />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <Info size={18} />
                            <div>
                                <span className="setting-label">Decimal Places</span>
                                <span className="setting-desc">Precision for displayed values</span>
                            </div>
                        </div>
                        <div className="setting-segmented">
                            {[0, 1, 2, 3, 4].map(d => (
                                <button
                                    key={d}
                                    className={decimals === d ? 'seg-active' : ''}
                                    onClick={() => handleDecimalsChange(d)}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ─── Data & Refresh ─── */}
                <div className="settings-section glass-panel">
                    <div className="settings-section-header">
                        <RefreshCw size={20} />
                        <h3>Data & Refresh</h3>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <Clock size={18} />
                            <div>
                                <span className="setting-label">Refresh Interval</span>
                                <span className="setting-desc">How often to update stock prices</span>
                            </div>
                        </div>
                        <div className="setting-segmented">
                            {[10, 30, 60, 120].map(s => (
                                <button
                                    key={s}
                                    className={refreshInterval === s ? 'seg-active' : ''}
                                    onClick={() => handleRefreshChange(s)}
                                >
                                    {s < 60 ? `${s}s` : `${s / 60}m`}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <Database size={18} />
                            <div>
                                <span className="setting-label">FX Rate</span>
                                <span className="setting-desc">Current EUR/USD exchange rate</span>
                            </div>
                        </div>
                        <span className="setting-value-display">1€ = ${fxRate?.toFixed(4)}</span>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <Bell size={18} />
                            <div>
                                <span className="setting-label">Notifications</span>
                                <span className="setting-desc">Show portfolio alerts</span>
                            </div>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" checked={notifications} onChange={handleNotificationsToggle} />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <AlertTriangle size={18} />
                            <div>
                                <span className="setting-label">Price Alerts</span>
                                <span className="setting-desc">Notify on significant price changes</span>
                            </div>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" checked={priceAlerts} onChange={handlePriceAlertsToggle} />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <MessageSquare size={18} style={{ color: discordEnabled ? '#5865F2' : 'inherit' }} />
                            <div>
                                <span className="setting-label">Discord Integration</span>
                                <span className="setting-desc">Push notifications to a Discord server</span>
                            </div>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" checked={discordEnabled} onChange={handleDiscordToggle} />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    {discordEnabled && (
                        <div className="setting-row discord-webhook-row fade-in">
                            <div className="setting-info" style={{ width: '100%' }}>
                                <div style={{ width: '100%' }}>
                                    <span className="setting-label">Discord Webhook URL</span>
                                    <div className="discord-input-group mt-2" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <input
                                            type="password"
                                            className="discord-input"
                                            placeholder="https://discord.com/api/webhooks/..."
                                            value={discordWebhookUrl}
                                            onChange={handleDiscordUrlChange}
                                            style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white' }}
                                        />
                                        <button
                                            className="settings-test-btn"
                                            onClick={testDiscordWebhook}
                                            style={{ padding: '8px 16px', borderRadius: '6px', background: 'rgba(88, 101, 242, 0.15)', border: '1px solid #5865F2', color: '#5865F2', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <Send size={14} /> <span>Test</span>
                                        </button>
                                    </div>
                                    <span className="setting-desc" style={{ marginTop: '8px', display: 'block' }}>
                                        Paste your Discord Webhook URL. It will only be stored locally in your browser.
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {priceAlerts && (
                        <div className="setting-row fade-in" style={{ display: 'block', padding: '12px 16px' }}>
                            <PriceAlerts stocks={stocks} />
                        </div>
                    )}
                </div>

                {/* ─── Portfolio Management ─── */}
                <div className="settings-section glass-panel">
                    <div className="settings-section-header">
                        <Shield size={20} />
                        <h3>Portfolio</h3>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <Database size={18} />
                            <div>
                                <span className="setting-label">Positions</span>
                                <span className="setting-desc">{positionCount} stocks in your portfolio</span>
                            </div>
                        </div>
                        <span className="setting-value-display">{positionCount} positions</span>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <Shield size={18} />
                            <div>
                                <span className="setting-label">Confirm Deletions</span>
                                <span className="setting-desc">Ask before removing positions</span>
                            </div>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" checked={confirmDeletes} onChange={handleConfirmDeletesToggle} />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <div className="setting-actions">
                        <button className="setting-action-btn import-action" onClick={onImportClick}>
                            <Upload size={16} />
                            Import from Revolut CSV
                        </button>
                        <button className="setting-action-btn export-action" onClick={handleExport}>
                            <Download size={16} />
                            Export Portfolio (JSON)
                        </button>
                        <button className="btn-secondary" onClick={() => exportPortfolioCSV(stocks)}>
                            <Download size={16} />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* ─── Danger Zone ─── */}
                <div className="settings-section glass-panel danger-section">
                    <div className="settings-section-header">
                        <Trash2 size={20} />
                        <h3>Danger Zone</h3>
                    </div>

                    <p className="danger-desc">
                        These actions are irreversible. Make sure to export your data first.
                    </p>

                    {!showClearConfirm ? (
                        <button
                            className="setting-action-btn danger-btn"
                            onClick={() => setShowClearConfirm(true)}
                        >
                            <Trash2 size={16} />
                            Clear All Data
                        </button>
                    ) : (
                        <div className="danger-confirm">
                            <p>Are you sure? All portfolio data and settings will be deleted.</p>
                            <div className="danger-confirm-actions">
                                <button className="danger-confirm-btn" onClick={handleClearAll}>
                                    Yes, delete everything
                                </button>
                                <button className="danger-cancel-btn" onClick={() => setShowClearConfirm(false)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* About */}
            <div className="settings-about glass-panel">
                <div className="about-info">
                    <span className="about-name">Lumina Invest</span>
                    <span className="about-version">v1.0.0</span>
                </div>
                <p className="about-desc">Real-time stock portfolio tracker with multi-currency support. Data powered by Yahoo Finance.</p>
            </div>
        </div>
    );
};

export default Settings;
