import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useCurrency } from '../contexts/CurrencyContext';
import './PerformanceChart.css';

const CustomTooltip = ({ active, payload, label, formatFn }) => {
    if (active && payload && payload.length) {
        const value = payload[0].value;
        return (
            <div className="chart-tooltip glass-panel">
                <p className="tooltip-date">{label}</p>
                <p className="tooltip-value">
                    {formatFn ? formatFn(value, 'EUR') : `€${value.toFixed(2)}`}
                </p>
            </div>
        );
    }
    return null;
};

const PerformanceChart = ({ data, metrics, activeTimeframe, onTimeframeChange }) => {
    const { format } = useCurrency();
    const [internalTimeframe, setInternalTimeframe] = useState('1M');
    const timeframe = activeTimeframe || internalTimeframe;
    const setTimeframe = onTimeframeChange || setInternalTimeframe;

    const currentBalance = metrics ? metrics.totalBalance : 0;

    const getFilteredData = () => {
        if (!data || data.length === 0) return [];
        switch (timeframe) {
            case '1D': return data.slice(-2);
            case '1W': return data.slice(-7);
            case '1M': return data.slice(-30);
            case '3M': return data.slice(-90);
            case '1Y': return data.slice(-365);
            case 'ALL': return data;
            default: return data.slice(-30);
        }
    };

    const filteredData = getFilteredData();

    // Calculate PNL for display in subtitle
    const startBalance = filteredData.length > 0 ? filteredData[0].balance : currentBalance;
    const pnl = currentBalance - startBalance;
    const pnlPercent = startBalance > 0 ? (pnl / startBalance) * 100 : (pnl === 0 ? 0 : 100);
    const isUp = pnl >= 0;

    return (
        <div className="chart-card glass-panel">
            <div className="chart-header">
                <div>
                    <h3 className="card-title">Portfolio Performance</h3>
                    <p className={`card-subtitle ${isUp ? 'text-up' : 'text-down'}`} style={{ color: isUp ? 'var(--status-up)' : 'var(--status-down)', marginTop: '4px', fontWeight: '500' }}>
                        {isUp ? '+' : ''}{format(pnl, 'EUR')} ({isUp ? '+' : ''}{pnlPercent.toFixed(2)}%)
                    </p>
                </div>
                <div className="chart-actions">
                    {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map(tf => (
                        <button
                            key={tf}
                            className={`time-btn ${timeframe === tf ? 'active' : ''}`}
                            onClick={() => setTimeframe(tf)}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            <div className="chart-container" style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={filteredData}
                        margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0A84FF" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#0A84FF" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#a0a0ab', fontSize: 12 }}
                            dy={10}
                            minTickGap={30}
                        />
                        <YAxis
                            hide={false}
                            domain={['auto', 'auto']}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#a0a0ab', fontSize: 12 }}
                            tickFormatter={(val) => format(val, 'EUR').replace(/\.\d+/, '')}
                            width={80}
                            orientation="right"
                        />
                        <Tooltip content={<CustomTooltip formatFn={format} />} />
                        <Legend verticalAlign="top" height={36} iconType="circle" />
                        <Area
                            type="monotone"
                            dataKey="balance"
                            name="Portfolio Balance"
                            stroke="#0A84FF"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorBalance)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PerformanceChart;
