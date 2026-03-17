import React from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import './PortfolioSummary.css';

const PortfolioSummary = ({ metrics, historicalData }) => {
    const { format } = useCurrency();
    const formatPercent = (val) => `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
    const fc = metrics.baseCurrency || 'EUR';

    // Compute ATH and ATL from historical data
    let ath = { value: 0, date: '' };
    let atl = { value: Infinity, date: '' };

    if (historicalData && historicalData.length > 0) {
        historicalData.forEach(point => {
            if (point.balance > 0) {
                if (point.balance > ath.value) {
                    ath = { value: point.balance, date: point.date };
                }
                if (point.balance < atl.value) {
                    atl = { value: point.balance, date: point.date };
                }
            }
        });
    }
    if (atl.value === Infinity) atl = { value: 0, date: '—' };

    return (
        <>
        {/* Mobile Hero Summary */}
        <div className="mobile-portfolio-hero">
            <div className="mph-balance">
                <span className="mph-label">Total Balance</span>
                <h1 className="mph-value">{format(metrics.totalBalance, fc)}</h1>
            </div>
            <div className="mph-stats">
                <div className={`mph-stat ${metrics.todayPnl >= 0 ? 'up' : 'down'}`}>
                    <span className="mph-stat-label">Today</span>
                    <span className="mph-stat-value">
                        {metrics.todayPnl >= 0 ? '+' : ''}{format(metrics.todayPnl, fc)}
                        <span className="mph-stat-pct"> ({formatPercent(metrics.todayPnlPercent)})</span>
                    </span>
                </div>
                <div className={`mph-stat ${metrics.totalPnl >= 0 ? 'up' : 'down'}`}>
                    <span className="mph-stat-label">Total P&L</span>
                    <span className="mph-stat-value">
                        {metrics.totalPnl >= 0 ? '+' : ''}{format(metrics.totalPnl, fc)}
                        <span className="mph-stat-pct"> ({formatPercent(metrics.totalPnlPercent)})</span>
                    </span>
                </div>
            </div>
        </div>

        <div className="summary-cards">
            {/* Total Balance Card */}
            <div className="summary-card hero-card">
                <div className="card-header">
                    <div className="card-icon-wrapper">
                        <Wallet size={24} className="icon-blue" />
                    </div>
                    <span className="card-title">Total Balance</span>
                </div>
                <div className="card-body">
                    <h2 className="card-value hero-value">{format(metrics.totalBalance, fc)}</h2>
                </div>
            </div>

            {/* Total Invested Card */}
            <div className="summary-card">
                <div className="card-header">
                    <div className="card-icon-wrapper icon-wrapper-purple">
                        <PiggyBank size={18} className="icon-purple" style={{ color: 'var(--accent-purple)' }} />
                    </div>
                    <span className="card-title">Total Invested</span>
                </div>
                <div className="card-body">
                    <h2 className="card-value">{format(metrics.totalInvested || 0, fc)}</h2>
                </div>
            </div>

            {/* Today's PNL Card */}
            <div className="summary-card">
                <div className="card-header">
                    <span className="card-title">Today's PNL</span>
                    <span className={`status-badge ${metrics.todayPnl >= 0 ? 'up-badge' : 'down-badge'}`}>
                        {metrics.todayPnl >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {formatPercent(metrics.todayPnlPercent)}
                    </span>
                </div>
                <div className="card-body">
                    <h2 className={`card-value ${metrics.todayPnl >= 0 ? 'text-up' : 'text-down'}`}>
                        {metrics.todayPnl > 0 ? '+' : ''}{format(metrics.todayPnl, fc)}
                    </h2>
                </div>
            </div>

            {/* Total PNL Card */}
            <div className="summary-card">
                <div className="card-header">
                    <span className="card-title">Total PNL</span>
                    <span className={`status-badge ${metrics.totalPnl >= 0 ? 'up-badge' : 'down-badge'}`}>
                        {metrics.totalPnl >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {formatPercent(metrics.totalPnlPercent)}
                    </span>
                </div>
                <div className="card-body">
                    <h2 className={`card-value ${metrics.totalPnl >= 0 ? 'text-up' : 'text-down'}`}>
                        {metrics.totalPnl > 0 ? '+' : ''}{format(metrics.totalPnl, fc)}
                    </h2>
                </div>
            </div>

            {/* ATH Card */}
            <div className="summary-card">
                <div className="card-header">
                    <div className="card-icon-wrapper icon-wrapper-green">
                        <TrendingUp size={18} className="icon-green" />
                    </div>
                    <span className="card-title">ATH</span>
                </div>
                <div className="card-body">
                    <h2 className="card-value text-up">{format(ath.value, fc)}</h2>
                    <span className="card-date">{ath.date}</span>
                </div>
            </div>

            {/* ATL Card */}
            <div className="summary-card">
                <div className="card-header">
                    <div className="card-icon-wrapper icon-wrapper-red">
                        <TrendingDown size={18} className="icon-red" />
                    </div>
                    <span className="card-title">ATL</span>
                </div>
                <div className="card-body">
                    <h2 className="card-value text-down">{format(atl.value, fc)}</h2>
                    <span className="card-date">{atl.date}</span>
                </div>
            </div>
        </div>
        </>
    );
};

export default PortfolioSummary;
