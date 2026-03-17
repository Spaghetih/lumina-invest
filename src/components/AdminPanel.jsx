import React, { useState, useEffect } from 'react';
import { fetchAuth } from '../services/fetchAuth';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Trash2, UserCheck, UserX, Users, Activity, Crown } from 'lucide-react';
import './AdminPanel.css';

export default function AdminPanel() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const isAdmin = currentUser?.role === 'admin';

    useEffect(() => {
        if (!isAdmin) return;
        loadData();
    }, [isAdmin]);

    const loadData = async () => {
        try {
            const [usersRes, statsRes] = await Promise.all([
                fetchAuth('/api/admin/users'),
                fetchAuth('/api/admin/stats')
            ]);
            if (usersRes.ok) setUsers(await usersRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
        } catch (err) {
            console.error('Failed to load admin data:', err);
        } finally {
            setLoading(false);
        }
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
            if (res.ok) {
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            }
        } finally {
            setActionLoading(null);
        }
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
        } finally {
            setActionLoading(null);
        }
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
            </div>

            {stats && (
                <div className="admin-stats">
                    <div className="admin-stat-card">
                        <Users size={20} />
                        <div>
                            <span className="stat-value">{stats.totalUsers}</span>
                            <span className="stat-label">Total Users</span>
                        </div>
                    </div>
                    <div className="admin-stat-card">
                        <Activity size={20} />
                        <div>
                            <span className="stat-value">{stats.todayLogins}</span>
                            <span className="stat-label">Active (24h)</span>
                        </div>
                    </div>
                    <div className="admin-stat-card">
                        <Crown size={20} />
                        <div>
                            <span className="stat-value">{stats.admins}</span>
                            <span className="stat-label">Admins</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="admin-users-table">
                <div className="admin-table-header">
                    <span>User</span>
                    <span>Role</span>
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
                        <span>
                            <span className={`role-badge ${u.role}`}>
                                {u.role === 'admin' ? <Crown size={12} /> : <UserCheck size={12} />}
                                {u.role}
                            </span>
                        </span>
                        <span className="admin-date">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</span>
                        <span className="admin-date">{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</span>
                        <span className="admin-actions">
                            {u.id !== currentUser.id && (
                                <>
                                    <button
                                        className="admin-action-btn role-btn"
                                        onClick={() => toggleRole(u.id, u.role)}
                                        disabled={actionLoading === u.id}
                                        title={u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                                    >
                                        {u.role === 'admin' ? <UserX size={14} /> : <Crown size={14} />}
                                    </button>
                                    <button
                                        className="admin-action-btn delete-btn"
                                        onClick={() => deleteUser(u.id, u.username)}
                                        disabled={actionLoading === u.id}
                                        title="Delete user"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </>
                            )}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
