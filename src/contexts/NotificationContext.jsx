import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext();

export function useNotifications() {
    return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
    const { user } = useAuth();
    const storageKey = user ? `lumina_notifications_${user.id}` : null;

    const [notifications, setNotifications] = useState(() => {
        if (!storageKey) return [];
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Reload notifications when user changes (login/logout)
    useEffect(() => {
        if (!storageKey) { setNotifications([]); return; }
        try {
            const saved = localStorage.getItem(storageKey);
            setNotifications(saved ? JSON.parse(saved) : []);
        } catch {
            setNotifications([]);
        }
    }, [storageKey]);

    useEffect(() => {
        if (!storageKey) return;
        try {
            localStorage.setItem(storageKey, JSON.stringify(notifications));
        } catch {
            // ignore
        }
    }, [notifications, storageKey]);

    const addNotification = useCallback((notification) => {
        const newNotification = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            read: false,
            ...notification
        };
        setNotifications((prev) => [newNotification, ...prev].slice(0, 100)); // Keep last 100

        // --- Discord Webhook Integration ---
        try {
            const discordEnabled = localStorage.getItem('discordEnabled') === 'true';
            const discordWebhookUrl = localStorage.getItem('discordWebhookUrl');

            if (discordEnabled && discordWebhookUrl) {
                // Determine Embed Color
                let embedColor = 3447003; // Default Blue
                if (notification.type === 'success') embedColor = 3200171; // Green
                else if (notification.type === 'error') embedColor = 16729344; // Red
                else if (notification.type === 'warning') embedColor = 16753920; // Orange

                // Fire-and-forget fetch to Discord
                fetch(discordWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: "Lumina Invest",
                        avatar_url: "https://i.imgur.com/8Q5Z2g6.png",
                        embeds: [{
                            title: notification.title || "Lumina Alert",
                            description: notification.message || "",
                            color: embedColor,
                            timestamp: new Date().toISOString()
                        }]
                    })
                }).catch(err => console.error("Discord webhook failed", err));
            }
        } catch (e) {
            console.error("Error processing Discord notification", e);
        }

        return newNotification.id;
    }, []);

    const markAsRead = useCallback((id) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const value = {
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
