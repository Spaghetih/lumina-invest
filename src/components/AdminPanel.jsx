import React, { useState, useEffect, useRef } from 'react';
import { fetchAuth } from '../services/fetchAuth';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Trash2, UserCheck, UserX, Users, Activity, Crown, Search, Server, Cpu, HardDrive, UserPlus, BarChart3, DollarSign, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import './AdminPanel.css';

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
}

function formatCurrency(val) {
    return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function AdminPanel() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [health, setHealth] = useState(null);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const searchTimeout = useRef(null);

    const isAdmin = currentUser?.role === 'admin';

    useEffect(() => {
        if (!isAdmin) return;
        loadData();
        const healthInterval = setInterval(loadHealth, 30000);
        return () => clearInterval(healthInterval);
    }, [isAdmin]);

    const loadData = async () => {
        try {
            const [usersRes, statsRes, healthRes, activityRes] = await Promise.all([
                fetchAuth('/api/admin/users'),
                fetchAuth('/api/admin/stats'),
                fetchAuth('/api/admin/system-health'),
                fetchAuth('/api/admin/activity')
            ]);
            if (usersRes.ok) setUsers(await usersRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
            if (healthRes.ok) setHealth(await healthRes.json());
            if (activityRes.ok) setActivity(await activityRes.json());
        } catch (err) {
            console.error('Failed to load admin data:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadHealth = async () => {
        try {
            const res = await fetchAuth('/api/admin/system-health');
            if (res.ok) setHealth(await res.json());
        } catch {}
    };

    const handleSearch = (value) => {
        setSearchTerm(value);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(async () => {
            try {
                const res = await fetchAuth(`/api/admin/users?search=${encodeURIComponent(value)}`);
                if (res.ok) setUsers(await res.json());
            } catch {}
        }, 300);
    };

    const toggleRegistration = async () => {
        try {
            const res = await fetchAuth('/api/admin/registration-toggle', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setStats(prev => ({ ...prev, registrationOpen: data.registrationOpen }));
            }
        } catch {}
    };

    const toggleRole = async (userId, currentRole) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        if (!confirm(`Change role to ${newRole}?`)) return;
        setActionLoading(userId);
        try {
            const res = await fetchAuth(`/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } finally { setActionLoading(null); }
    };

    const deleteUser = async (userId, username) => {
        if (!confirm(`Delete user "${username}" and all their data? This cannot be undone.`)) return;
        setActionLoading(userId);
        try {
            const res = await fetchAuth(`/api/admin/users/${userId}`, { method: 'DELETE' });
            if (res.ok) {
                setUsers(prev => prev.filter(u => u.id !== userId));
                if (stats) setStats(s => ({ ...s, totalUsers: s.totalUsers - 1 }));
            }
        } finally { setActionLoading(null); }
    };

    if (!isAdmin) {
        return (
            <div className="admin-panel">
                <div className="admin-denied">
                    <Shield size={48} />
                    <h2>Access Denied</h2>
                    <p>Admin privileges required to access this panel.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="admin-panel">
                <div className="admin-loading">
                    <div className="spinner"></div>
                    <p>Loading admin panel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-panel">
            <div className="admin-header">
                <Shield size={24} />
                <h2>Admin Panel</h2>
                {stats && (
                    <button className={`reg-toggle-btn ${stats.registrationOpen ? 'open' : 'closed'}`} onClick={toggleRegistration}>
                        {stats.registrationOpen ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        Registration {stats.registrationOpen ? 'Open' : 'Closed'}
                    </button>
                )}
            </div>

            {stats && (
                <div className="admin-stats">
                    <div className="admin-stat-card"><Users size={20} /><div><span className="stat-value">{stats.totalUsers}</span><span className="stat-label">Total Users</span></div></div>
                    <div className="admin-stat-card"><Activity size={20} /><div><span className="stat-value">{stats.todayLogins}</span><span className="stat-label">Active (24h)</span></div></div>
                    <div className="admin-stat-card"><Crown size={20} /><div><span className="stat-value">{stats.admins}</span><span className="stat-label">Admins</span></div></div>
                    <div className="admin-stat-card"><UserPlus size={20} /><div><span className="stat-value">{stats.newThisWeek}</span><span className="stat-label">New This Week</span></div></div>
                    <div className="admin-stat-card"><BarChart3 size={20} /><div><span className="stat-value">{stats.totalPositions}</span><span className="stat-label">Total Positions</span></div></div>
                    <div className="admin-stat-card"><DollarSign size={20} /><div><span className="stat-value">{formatCurrency(stats.totalPortfolioValue)}</span><span className="stat-label">Total Portfolio</span></div></div>
                </div>
            )}

            {health && (
                <div className="admin-health">
                    <div className="health-card">
                        <Server size={18} />
                        <div className="health-info">
                            <span className="health-label">Server Uptime</span>
                            <span className="health-value">{formatUptime(health.uptime)}</span>
                        </div>
                    </div>
                    <div className="health-card">
                        <Cpu size={18} />
                        <div className="health-info">
                            <span className="health-label">Memory</span>
                            <span className="health-value">{health.memUsed} / {health.memTotal} MB</span>
                            <div className="progress-bar"><div className="progress-fill" style={{ width: `${health.memPercent}%`, background: health.memPercent > 85 ? '#ff5555' : '#ff9900' }} /></div>
                        </div>
                    </div>
                    <div className="health-card">
                        <HardDrive size={18} />
                        <div className="health-info">
                            <span className="health-label">Disk</span>
                            <span className="health-value">{health.diskUsed} / {health.diskTotal} GB</span>
                            <div className="progress-bar"><div className="progress-fill" style={{ width: `${health.diskPercent}%`, background: health.diskPercent > 85 ? '#ff5555' : '#ff9900' }} /></div>
                        </div>
                    </div>
                </div>
            )}

            <div className="admin-search">
                <Search size={16} className="search-icon" />
                <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => handleSearch(e.target.value)} className="search-input" />
            </div>

            <div className="admin-users-table">
                <div className="admin-table-header">
                    <span>User</span>
                    <span>Role</span>
                    <span>Portfolio</span>
                    <span>Registered</span>
                    <span>Last Login</span>
                    <span>Actions</span>
                </div>
                {users.map(u => (
                    <div key={u.id} className={`admin-table-row ${u.id === currentUser.id ? 'is-you' : ''}`}>
                        <span className="admin-username">
                            {u.username}
                            {u.id === currentUser.id && <span className="you-badge">you</span>}
                        </span>
                        <span><span className={`role-badge ${u.role}`}>{u.role === 'admin' ? <Crown size={12} /> : <UserCheck size={12} />}{u.role}</span></span>
                        <span className="admin-portfolio">
                            <span className="portfolio-value">{u.portfolioValue > 0 ? formatCurrency(u.portfolioValue) : '-'}</span>
                            {u.positionCount > 0 && <span className="portfolio-count">{u.positionCount} pos.</span>}
                        </span>
                        <span className="admin-date">{formatDateTime(u.created_at)}</span>
                        <span className="admin-date">{u.last_login ? formatDateTime(u.last_login) : 'Never'}</span>
                        <span className="admin-actions">
                            {u.id !== currentUser.id && (
                                <>
                                    <button className="admin-action-btn role-btn" onClick={() => toggleRole(u.id, u.role)} disabled={actionLoading === u.id} title={u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}>
                                        {u.role === 'admin' ? <UserX size={14} /> : <Crown size={14} />}
                                    </button>
                                    <button className="admin-action-btn delete-btn" onClick={() => deleteUser(u.id, u.username)} disabled={actionLoading === u.id} title="Delete user">
                                        <Trash2 size={14} />
                                    </button>
                                </>
                            )}
                        </span>
                    </div>
                ))}
                {users.length === 0 && <div className="admin-empty">No users found</div>}
            </div>

            {activity.length > 0 && (
                <div className="admin-activity">
                    <div className="activity-header"><Clock size={16} /> Recent Activity</div>
                    <div className="activity-list">
                        {activity.map((a, i) => (
                            <div key={i} className="activity-item">
                                <span className="activity-user">{a.username}</span>
                                <span className="activity-time">{formatDateTime(a.last_login)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
