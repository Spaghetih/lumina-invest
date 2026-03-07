import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, ArrowUpRight, TrendingUp, PiggyBank, RefreshCw, Info } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import './DividendCalendar.css';

const DividendCalendar = ({ stocks }) => {
    const { format } = useCurrency();
    const [dividends, setDividends] = useState([]);
    const [loading, setLoading] = useState(true);

    // Stable dependency based on what actually matters for dividends (tickers and shares)
    const stockDepString = React.useMemo(() => {
        if (!stocks) return '';
        return stocks.map(s => `${s.id}:${s.shares}`).join('|');
    }, [stocks]);

    useEffect(() => {
        const fetchDividends = async () => {
            if (!stocks || stocks.length === 0) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const symbols = stocks.map(s => s.id).join(',');
                const res = await fetch(`http://localhost:3001/api/dividends?symbols=${symbols}`);
                const data = await res.json();

                // Merge dividend data with user's share count
                const merged = data.map(div => {
                    const stock = stocks.find(s => s.id === div.symbol);
                    const shares = stock ? (stock.shares || 0) : 0;
                    const annualIncome = (div.dividendRate || 0) * shares;
                    return { ...div, shares, annualIncome };
                });

                setDividends(merged);
            } catch (err) {
                console.error("Failed to fetch dividend data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDividends();
    }, [stockDepString]); // Use the stringified dependency instead of the array reference

    const totalAnnualIncome = dividends.reduce((acc, curr) => acc + (curr.annualIncome || 0), 0);
    const averageYield = dividends.length > 0
        ? dividends.reduce((acc, curr) => acc + (curr.dividendYield || 0), 0) / dividends.length
        : 0;

    // Sort by chronological Ex-Dividend date
    const sortedDividends = [...dividends].sort((a, b) => {
        if (!a.exDividendDate) return 1;
        if (!b.exDividendDate) return -1;
        return new Date(a.exDividendDate) - new Date(b.exDividendDate);
    });

    const isUpcoming = (dateString) => {
        if (!dateString) return false;
        return new Date(dateString) >= new Date();
    };

    if (loading) {
        return (
            <div className="dividend-calendar fade-in" style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
                <div className="spinner"><RefreshCw size={24} className="spin" color="var(--accent-glow)" /></div>
            </div>
        );
    }

    if (!stocks || stocks.length === 0 || dividends.length === 0) {
        return (
            <div className="dividend-calendar fade-in">
                <div className="glass-panel empty-message">
                    <PiggyBank size={48} strokeWidth={1.5} color="var(--accent-purple)" />
                    <h3>No Dividends Found</h3>
                    <p>None of the assets in your current portfolio pay dividends, or you haven't added any stocks yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dividend-calendar fade-in">
            {/* Hero Metrics */}
            <div className="dividend-hero glass-panel">
                <div className="hero-icon">
                    <PiggyBank size={32} color="#BF5AF2" />
                </div>
                <div className="hero-content">
                    <div className="hero-label">Estimated Yearly Passive Income</div>
                    <div className="hero-value text-up">
                        {format(totalAnnualIncome, 'USD')}
                    </div>
                </div>
                <div className="hero-stats">
                    <div className="stat-block">
                        <span className="stat-label">Avg Yield</span>
                        <span className="stat-val">{(averageYield * 100).toFixed(2)}%</span>
                    </div>
                    <div className="stat-block">
                        <span className="stat-label">Paying Assets</span>
                        <span className="stat-val">{dividends.length}</span>
                    </div>
                </div>
            </div>

            {/* Calendar Table */}
            <div className="glass-panel div-table-container">
                <h3 className="section-title">Upcoming & Recent Payouts</h3>
                <div className="div-table-wrapper">
                    <table className="div-table">
                        <thead>
                            <tr>
                                <th>Asset</th>
                                <th>Shares</th>
                                <th>Dividend Yield</th>
                                <th>Payout Rate</th>
                                <th>
                                    <div className="tooltip-container" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        Ex-Dividend Date
                                        <Info size={14} className="info-icon" />
                                        <div className="custom-tooltip">
                                            <strong>Ex-Dividend Date</strong>
                                            <p>You must own the stock <strong>BEFORE</strong> this date to receive the upcoming dividend payout.</p>
                                        </div>
                                    </div>
                                </th>
                                <th>Est. Annual Cash</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedDividends.map((div, idx) => {
                                const upcomingLine = isUpcoming(div.exDividendDate);
                                return (
                                    <tr key={idx} className={upcomingLine ? 'row-upcoming' : 'row-past'}>
                                        <td className="div-asset">
                                            <div className="asset-icon">
                                                <img
                                                    src={`https://assets.parqet.com/logos/symbol/${div.symbol}`}
                                                    alt={div.symbol}
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.style.display = 'none';
                                                        e.target.parentElement.innerHTML = div.symbol.substring(0, 2);
                                                    }}
                                                />
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{div.symbol}</span>
                                        </td>
                                        <td>{div.shares.toFixed(2)}</td>
                                        <td>{div.dividendYield ? (div.dividendYield * 100).toFixed(2) + '%' : '—'}</td>
                                        <td>{div.dividendRate ? format(div.dividendRate, 'USD') : '—'}</td>
                                        <td>
                                            {div.exDividendDate
                                                ? <span className={`date-badge ${upcomingLine ? 'badge-future' : 'badge-past'}`}>
                                                    <Calendar size={12} />
                                                    {new Date(div.exDividendDate).toLocaleDateString()}
                                                </span>
                                                : '—'}
                                        </td>
                                        <td className="text-up" style={{ fontWeight: 600 }}>
                                            {format(div.annualIncome, 'USD')}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DividendCalendar;
