import React, { useState, useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import './TransactionHistory.css';

// Transaction logger — call from App.jsx when adding/removing stocks
export const logTransaction = (type, ticker, shares, price, currency = 'USD') => {
    const txs = JSON.parse(localStorage.getItem('lumina_transactions') || '[]');
    txs.unshift({
        id: Date.now(),
        type, // 'BUY' or 'SELL'
        ticker,
        shares,
        price,
        currency,
        total: shares * price,
        date: new Date().toISOString(),
    });
    localStorage.setItem('lumina_transactions', JSON.stringify(txs));
};

const TransactionHistory = () => {
    const { format } = useCurrency();
    const [filterTicker, setFilterTicker] = useState('');
    const [filterType, setFilterType] = useState('ALL');

    const transactions = useMemo(() => {
        return JSON.parse(localStorage.getItem('lumina_transactions') || '[]');
    }, []);

    const filtered = useMemo(() => {
        return transactions.filter(tx => {
            if (filterType !== 'ALL' && tx.type !== filterType) return false;
            if (filterTicker && !tx.ticker.includes(filterTicker.toUpperCase())) return false;
            return true;
        });
    }, [transactions, filterTicker, filterType]);

    const totals = useMemo(() => {
        let totalBought = 0;
        let totalSold = 0;
        filtered.forEach(tx => {
            if (tx.type === 'BUY') totalBought += tx.total;
            else totalSold += tx.total;
        });
        return { totalBought, totalSold, net: totalSold - totalBought };
    }, [filtered]);

    return (
        <div className="tx-history">
            <div className="tx-header">
                <h3 className="tx-title">Transaction History</h3>
                <div className="tx-filters">
                    <div className="tx-filter-input">
                        <Filter size={12} />
                        <input
                            type="text"
                            placeholder="Filter ticker..."
                            value={filterTicker}
                            onChange={(e) => setFilterTicker(e.target.value)}
                            spellCheck={false}
                        />
                    </div>
                    <div className="tx-type-btns">
                        {['ALL', 'BUY', 'SELL'].map(t => (
                            <button
                                key={t}
                                className={`tx-type-btn ${filterType === t ? 'active' : ''}`}
                                onClick={() => setFilterType(t)}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {filtered.length > 0 && (
                <div className="tx-summary">
                    <div className="tx-summary-item">
                        <span className="tx-summary-label">Total Bought</span>
                        <span className="tx-summary-value text-down">${totals.totalBought.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="tx-summary-item">
                        <span className="tx-summary-label">Total Sold</span>
                        <span className="tx-summary-value text-up">${totals.totalSold.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="tx-summary-item">
                        <span className="tx-summary-label">Transactions</span>
                        <span className="tx-summary-value">{filtered.length}</span>
                    </div>
                </div>
            )}

            <div className="tx-table-wrapper">
                <table className="tx-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Ticker</th>
                            <th>Shares</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="tx-empty">No transactions recorded yet</td>
                            </tr>
                        ) : (
                            filtered.map(tx => (
                                <tr key={tx.id}>
                                    <td>{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</td>
                                    <td>
                                        <span className={`tx-badge ${tx.type === 'BUY' ? 'tx-buy' : 'tx-sell'}`}>
                                            {tx.type === 'BUY' ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                                            {tx.type}
                                        </span>
                                    </td>
                                    <td className="tx-ticker">{tx.ticker}</td>
                                    <td>{tx.shares}</td>
                                    <td>${tx.price?.toFixed(2)}</td>
                                    <td className="tx-total">${tx.total?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TransactionHistory;
