import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, X, Info, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import './NotificationCenter.css';

export default function NotificationCenter() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="notif-icon success" size={18} />;
            case 'error': return <AlertCircle className="notif-icon error" size={18} />;
            case 'warning': return <AlertTriangle className="notif-icon warning" size={18} />;
            default: return <Info className="notif-icon info" size={18} />;
        }
    };

    const formatTime = (ts) => {
        const d = new Date(ts);
        const today = new Date();
        const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();

        let timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (isToday) return `Today at ${timeStr}`;

        const isYesterday = new Date(today.setDate(today.getDate() - 1)).toDateString() === d.toDateString();
        if (isYesterday) return `Yesterday at ${timeStr}`;

        return `${d.toLocaleDateString()} ${timeStr}`;
    };

    return (
        <div className="notification-center" ref={dropdownRef}>
            <button className="notification-trigger" onClick={toggleDropdown} title="Notifications">
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="notification-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown glass-panel fade-in">
                    <div className="notif-header">
                        <h3>Notifications</h3>
                        <div className="notif-actions">
                            {unreadCount > 0 && (
                                <button onClick={markAllAsRead} className="notif-action-btn" title="Mark all as read">
                                    <Check size={14} />
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button onClick={clearNotifications} className="notif-action-btn danger" title="Clear all">
                                    <Trash2 size={14} />
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="notif-action-btn close-btn">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="notif-body">
                        {notifications.length === 0 ? (
                            <div className="notif-empty">
                                <Bell size={32} className="empty-icon" />
                                <p>No new notifications</p>
                            </div>
                        ) : (
                            <ul className="notif-list">
                                {notifications.map((notif) => (
                                    <li
                                        key={notif.id}
                                        className={`notif-item ${notif.read ? 'read' : 'unread'}`}
                                        onClick={() => !notif.read && markAsRead(notif.id)}
                                    >
                                        <div className="notif-icon-wrapper">
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="notif-content-wrapper">
                                            <div className="notif-title-row">
                                                <span className="notif-title">{notif.title}</span>
                                                <span className="notif-time">{formatTime(notif.timestamp)}</span>
                                            </div>
                                            <p className="notif-message">{notif.message}</p>
                                        </div>
                                        {!notif.read && <div className="notif-unread-dot" />}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
