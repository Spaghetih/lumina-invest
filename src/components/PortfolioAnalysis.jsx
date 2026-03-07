import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Calendar, ChevronUp, ChevronDown } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import './PortfolioAnalysis.css';

const COLORS = ['#0A84FF', '#5E5CE6', '#30D158', '#FF9F0A', '#FF453A', '#BF5AF2', '#64D2FF', '#FFD60A'];

const CustomPieTooltip = ({ active, payload, format }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="pie-tooltip glass-panel">
                <p className="pie-tooltip-name">{data.name}</p>
                <p className="pie-tooltip-value">{format(data.value, data.qc || 'USD')}</p>
                <p className="pie-tooltip-pct">{data.percent.toFixed(1)}%</p>
            </div>
        );
    }
    return null;
};

const PortfolioAnalysis = ({ stocks }) => {
    const { format, symbol: currSymbol, hideBalances } = useCurrency();

    if (!stocks || stocks.length === 0) {
        return (
            <div className="portfolio-analysis fade-in">
                <div className="glass-panel empty-portfolio-msg">
                    <BarChart3 size={48} strokeWidth={1.5} />
                    <h3>No Positions Yet</h3>
                    <p>Add your first stock position to see your portfolio analysis here.</p>
                </div>
            </div>
        );
    }

    // Calculate per-stock metrics
    const totalPortfolioValue = stocks.reduce((acc, s) => acc + s.price * s.shares, 0);

    const positions = stocks.map((stock, idx) => {
        const currentValue = stock.price * stock.shares;
        const costBasis = (stock.avgPrice || stock.prevClose) * stock.shares;
        const pnl = currentValue - costBasis;
        const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
        const allocation = totalPortfolioValue > 0 ? (currentValue / totalPortfolioValue) * 100 : 0;
        const todayChange = (stock.price - stock.prevClose) * stock.shares;
        const todayChangePct = stock.prevClose > 0 ? ((stock.price - stock.prevClose) / stock.prevClose) * 100 : 0;

        return {
            ...stock,
            currentValue,
            costBasis,
            pnl,
            pnlPercent,
            allocation,
            todayChange,
            todayChangePct,
            qc: stock.quoteCurrency || 'USD',
            colorIdx: idx % COLORS.length
        };
    });

    const [sortConfig, setSortConfig] = React.useState({ key: 'currentValue', direction: 'desc' });

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedPositions = React.useMemo(() => {
        const sortable = [...positions];
        sortable.sort((a, b) => {
            let aVal, bVal;
            switch (sortConfig.key) {
                case 'asset': aVal = a.id; bVal = b.id; break;
                case 'shares': aVal = a.shares; bVal = b.shares; break;
                case 'avgPrice': aVal = a.avgPrice || a.prevClose; bVal = b.avgPrice || b.prevClose; break;
                case 'price': aVal = a.price; bVal = b.price; break;
                case 'currentValue': aVal = a.currentValue; bVal = b.currentValue; break;
                case 'pnl': aVal = a.pnl; bVal = b.pnl; break;
                case 'todayChange': aVal = a.todayChange; bVal = b.todayChange; break;
                case 'purchaseDate':
                    aVal = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
                    bVal = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
                    break;
                default: aVal = 0; bVal = 0;
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sortable;
    }, [positions, sortConfig]);

    const getSortIcon = (columnName) => {
        if (sortConfig.key !== columnName) return null;
        return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="pa-sort-icon" /> : <ChevronDown size={14} className="pa-sort-icon" />;
    };

    // Pie chart data
    const pieData = positions.map(p => ({
        name: p.id,
        value: p.currentValue,
        percent: p.allocation,
        qc: p.qc,
        fill: COLORS[p.colorIdx]
    }));

    // Summary stats
    const totalInvested = positions.reduce((acc, p) => acc + p.costBasis, 0);
    const totalPnl = totalPortfolioValue - totalInvested;
    const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const bestPerformer = [...positions].sort((a, b) => b.pnlPercent - a.pnlPercent)[0];
    const worstPerformer = [...positions].sort((a, b) => a.pnlPercent - b.pnlPercent)[0];

    return (
        <div className="portfolio-analysis fade-in">
            {/* Top Stats Row */}
            <div className="pa-stats-row">
                <div className="pa-stat-card glass-panel">
                    <div className="pa-stat-icon" style={{ background: 'rgba(10, 132, 255, 0.15)' }}>
                        <DollarSign size={20} color="#0A84FF" />
                    </div>
                    <div>
                        <span className="pa-stat-label">Total Invested</span>
                        <span className="pa-stat-value">{format(totalInvested, 'EUR')}</span>
                    </div>
                </div>
                <div className="pa-stat-card glass-panel">
                    <div className="pa-stat-icon" style={{ background: totalPnl >= 0 ? 'var(--status-up-bg)' : 'var(--status-down-bg)' }}>
                        {totalPnl >= 0 ? <TrendingUp size={20} color="var(--status-up)" /> : <TrendingDown size={20} color="var(--status-down)" />}
                    </div>
                    <div>
                        <span className="pa-stat-label">Total Return</span>
                        <span className={`pa-stat-value ${totalPnl >= 0 ? 'text-up' : 'text-down'}`}>
                            {totalPnl >= 0 ? '+' : ''}{format(totalPnl, 'EUR')} ({totalPnlPct.toFixed(2)}%)
                        </span>
                    </div>
                </div>
                <div className="pa-stat-card glass-panel">
                    <div className="pa-stat-icon" style={{ background: 'rgba(48, 209, 88, 0.15)' }}>
                        <TrendingUp size={20} color="#30D158" />
                    </div>
                    <div>
                        <span className="pa-stat-label">Best Performer</span>
                        <span className="pa-stat-value text-up">{bestPerformer.id} ({bestPerformer.pnlPercent >= 0 ? '+' : ''}{bestPerformer.pnlPercent.toFixed(2)}%)</span>
                    </div>
                </div>
                <div className="pa-stat-card glass-panel">
                    <div className="pa-stat-icon" style={{ background: 'rgba(255, 69, 58, 0.15)' }}>
                        <TrendingDown size={20} color="#FF453A" />
                    </div>
                    <div>
                        <span className="pa-stat-label">Worst Performer</span>
                        <span className={`pa-stat-value ${worstPerformer.pnlPercent >= 0 ? 'text-up' : 'text-down'}`}>{worstPerformer.id} ({worstPerformer.pnlPercent >= 0 ? '+' : ''}{worstPerformer.pnlPercent.toFixed(2)}%)</span>
                    </div>
                </div>
            </div>

            {/* Main Content: Pie Chart + Table */}
            <div className="pa-main-grid">
                {/* Allocation Pie Chart */}
                <div className="pa-allocation glass-panel">
                    <h3 className="pa-section-title">Asset Allocation</h3>
                    <div className="pa-pie-wrapper">
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={110}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                    animationDuration={800}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomPieTooltip format={format} />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="pa-legend">
                        {positions.map(p => (
                            <div key={p.id} className="pa-legend-item">
                                <span className="pa-legend-dot" style={{ background: COLORS[p.colorIdx] }}></span>
                                <span className="pa-legend-label">{p.id}</span>
                                <span className="pa-legend-pct">{p.allocation.toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Positions Table */}
                <div className="pa-positions glass-panel">
                    <h3 className="pa-section-title">Your Positions</h3>
                    <div className="pa-table-wrapper">
                        <table className="pa-table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('asset')} className="sortable-th">Asset {getSortIcon('asset')}</th>
                                    <th onClick={() => handleSort('shares')} className="sortable-th">Shares {getSortIcon('shares')}</th>
                                    <th onClick={() => handleSort('avgPrice')} className="sortable-th">Avg Cost {getSortIcon('avgPrice')}</th>
                                    <th onClick={() => handleSort('price')} className="sortable-th">Price {getSortIcon('price')}</th>
                                    <th onClick={() => handleSort('currentValue')} className="sortable-th">Value {getSortIcon('currentValue')}</th>
                                    <th onClick={() => handleSort('pnl')} className="sortable-th">PNL {getSortIcon('pnl')}</th>
                                    <th onClick={() => handleSort('todayChange')} className="sortable-th">Today {getSortIcon('todayChange')}</th>
                                    <th onClick={() => handleSort('purchaseDate')} className="sortable-th">Purchased {getSortIcon('purchaseDate')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedPositions.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <div className="pa-asset-cell">
                                                <span className="pa-asset-dot" style={{ background: COLORS[p.colorIdx] }}></span>
                                                <div>
                                                    <span className="pa-asset-symbol">{p.id}</span>
                                                    <span className="pa-asset-name">{p.name}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{hideBalances ? '•••' : p.shares}</td>
                                        <td>{format(p.avgPrice || p.prevClose, p.qc)}</td>
                                        <td>{format(p.price, p.qc)}</td>
                                        <td className="pa-value-cell">{format(p.currentValue, p.qc)}</td>
                                        <td className={p.pnl >= 0 ? 'text-up' : 'text-down'}>
                                            {p.pnl >= 0 ? '+' : ''}{format(p.pnl, p.qc)}
                                            <span className="pa-pnl-pct"> ({p.pnlPercent >= 0 ? '+' : ''}{p.pnlPercent.toFixed(1)}%)</span>
                                        </td>
                                        <td className={p.todayChange >= 0 ? 'text-up' : 'text-down'}>
                                            {p.todayChange >= 0 ? '+' : ''}{format(p.todayChange, p.qc)}
                                        </td>
                                        <td className="pa-date-cell">
                                            {p.purchaseDate ? (
                                                <span className="pa-date-badge">
                                                    <Calendar size={12} />
                                                    {new Date(p.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                                                </span>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PortfolioAnalysis;
