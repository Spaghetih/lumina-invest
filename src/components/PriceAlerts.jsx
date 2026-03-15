import React, { useState, useEffect } from 'react';
import { Bell, Trash2, Zap, AlertTriangle } from 'lucide-react';
import './PriceAlerts.css';

const STORAGE_KEY = 'lumina_price_alerts';

const loadAlerts = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const saveAlerts = (alerts) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
};

const PriceAlerts = ({ stocks }) => {
    const [alerts, setAlerts] = useState(loadAlerts);
    const [ticker, setTicker] = useState('');
    const [condition, setCondition] = useState('above');
    const [price, setPrice] = useState('');

    // Check alerts against current prices whenever stocks change
    useEffect(() => {
        if (!stocks || stocks.length === 0) return;

        const stockMap = {};
        stocks.forEach(s => {
            stockMap[s.id.toUpperCase()] = s.price;
        });

        let changed = false;
        const updated = alerts.map(alert => {
            if (alert.triggered) return alert;
            const currentPrice = stockMap[alert.ticker.toUpperCase()];
            if (currentPrice === undefined) return alert;

            const shouldTrigger =
                (alert.condition === 'above' && currentPrice >= alert.price) ||
                (alert.condition === 'below' && currentPrice <= alert.price);

            if (shouldTrigger) {
                changed = true;
                return { ...alert, triggered: true };
            }
            return alert;
        });

        if (changed) {
            setAlerts(updated);
            saveAlerts(updated);
        }
    }, [stocks, alerts]);

    const handleAdd = (e) => {
        e.preventDefault();
        const trimmedTicker = ticker.trim().toUpperCase();
        const parsedPrice = parseFloat(price);

        if (!trimmedTicker || isNaN(parsedPrice) || parsedPrice <= 0) return;

        const newAlert = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            ticker: trimmedTicker,
            condition,
            price: parsedPrice,
            triggered: false,
            createdAt: new Date().toISOString()
        };

        const next = [...alerts, newAlert];
        setAlerts(next);
        saveAlerts(next);
        setTicker('');
        setPrice('');
    };

    const handleDelete = (id) => {
        const next = alerts.filter(a => a.id !== id);
        setAlerts(next);
        saveAlerts(next);
    };

    // Build a lookup for current prices
    const stockMap = {};
    if (stocks) {
        stocks.forEach(s => {
            stockMap[s.id.toUpperCase()] = s.price;
        });
    }

    const activeCount = alerts.filter(a => !a.triggered).length;

    return (
        <div className="price-alerts">
            <div className="price-alerts-header">
                <Bell size={16} color="#ff9900" />
                <h4>Price Alerts</h4>
                {alerts.length > 0 && (
                    <span className="price-alerts-count">{activeCount} active</span>
                )}
            </div>

            <form className="pa-add-form" onSubmit={handleAdd}>
                <input
                    type="text"
                    className="pa-ticker-input"
                    placeholder="AAPL"
                    value={ticker}
                    onChange={e => setTicker(e.target.value.toUpperCase())}
                    maxLength={10}
                />
                <select
                    className="pa-condition-select"
                    value={condition}
                    onChange={e => setCondition(e.target.value)}
                >
                    <option value="above">Above</option>
                    <option value="below">Below</option>
                </select>
                <input
                    type="number"
                    className="pa-price-input"
                    placeholder="150.00"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    min="0"
                    step="0.01"
                />
                <button type="submit" className="pa-add-btn">+ Add</button>
            </form>

            {alerts.length > 0 ? (
                <table className="pa-alerts-table">
                    <thead>
                        <tr>
                            <th>Ticker</th>
                            <th>Condition</th>
                            <th>Target</th>
                            <th>Current</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {alerts.map(alert => {
                            const currentPrice = stockMap[alert.ticker.toUpperCase()];
                            return (
                                <tr key={alert.id}>
                                    <td className="pa-alert-ticker">{alert.ticker}</td>
                                    <td>
                                        <span className={`pa-alert-condition ${alert.condition}`}>
                                            {alert.condition === 'above' ? '\u2191 Above' : '\u2193 Below'}
                                        </span>
                                    </td>
                                    <td className="pa-alert-price">${alert.price.toFixed(2)}</td>
                                    <td className="pa-alert-current">
                                        {currentPrice !== undefined ? `$${currentPrice.toFixed(2)}` : '\u2014'}
                                    </td>
                                    <td>
                                        {alert.triggered ? (
                                            <span className="pa-alert-status triggered">
                                                <Zap size={10} /> Triggered
                                            </span>
                                        ) : (
                                            <span className="pa-alert-status active">
                                                <AlertTriangle size={10} /> Active
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            className="pa-alert-delete"
                                            onClick={() => handleDelete(alert.id)}
                                            title="Delete alert"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                <div className="pa-alerts-empty">No alerts configured. Add one above.</div>
            )}
        </div>
    );
};

export default PriceAlerts;
