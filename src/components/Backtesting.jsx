import React, { useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { History, TrendingUp, TrendingDown, DollarSign, Percent, BarChart3 } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import './Backtesting.css';
import { fetchAuth } from '../services/fetchAuth';

const BacktestTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bt-tooltip">
                <p className="bt-tooltip-date">{label}</p>
                {payload.map((p, i) => (
                    <div key={i} className="bt-tooltip-row">
                        <span style={{ color: p.color }}>{p.name}</span>
                        <span>${p.value?.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const Backtesting = () => {
    const { format } = useCurrency();
    const [ticker, setTicker] = useState('');
    const [amount, setAmount] = useState('10000');
    const [startDate, setStartDate] = useState('2024-01-01');
    const [chartData, setChartData] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const runBacktest = useCallback(async (e) => {
        e.preventDefault();
        if (!ticker || !amount || !startDate) return;

        setLoading(true);
        setError('');
        setStats(null);
        setChartData([]);

        try {
            const res = await fetchAuth(`/api/historical/${ticker.toUpperCase()}?range=5Y`);
            if (!res.ok) throw new Error('Failed to fetch data');
            const data = await res.json();

            const start = new Date(startDate);
            const filtered = data.filter(d => new Date(d.date) >= start && d.close != null);

            if (filtered.length < 2) {
                setError('Not enough data for this period');
                setLoading(false);
                return;
            }

            const investedAmount = parseFloat(amount);
            const entryPrice = filtered[0].close;
            const shares = investedAmount / entryPrice;

            let maxValue = 0;
            let maxDrawdown = 0;

            const series = filtered.map(d => {
                const value = shares * d.close;
                if (value > maxValue) maxValue = value;
                const drawdown = (maxValue - value) / maxValue;
                if (drawdown > maxDrawdown) maxDrawdown = drawdown;

                return {
                    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                    value: parseFloat(value.toFixed(2)),
                    invested: investedAmount,
                };
            });

            const finalValue = series[series.length - 1].value;
            const totalReturn = ((finalValue - investedAmount) / investedAmount) * 100;
            const years = (new Date(filtered[filtered.length - 1].date) - new Date(filtered[0].date)) / (365.25 * 86400000);
            const cagr = years > 0 ? (Math.pow(finalValue / investedAmount, 1 / years) - 1) * 100 : 0;

            setChartData(series);
            setStats({
                ticker: ticker.toUpperCase(),
                invested: investedAmount,
                finalValue,
                totalReturn,
                cagr,
                maxDrawdown: maxDrawdown * 100,
                shares,
                entryPrice,
                exitPrice: filtered[filtered.length - 1].close,
                period: `${filtered.length} days`,
            });
        } catch {
            setError(`Unable to fetch data for ${ticker.toUpperCase()}`);
        } finally {
            setLoading(false);
        }
    }, [ticker, amount, startDate]);

    const isUp = stats ? stats.totalReturn >= 0 : true;

    return (
        <div className="backtesting-page">
            <div className="bt-form-panel">
                <h3 className="bt-title"><History size={18} /> Backtesting Simulator</h3>
                <form className="bt-form" onSubmit={runBacktest}>
                    <div className="bt-field">
                        <label>Ticker</label>
                        <input
                            type="text"
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value.toUpperCase())}
                            placeholder="AAPL"
                            spellCheck={false}
                        />
                    </div>
                    <div className="bt-field">
                        <label>Amount ($)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="10000"
                            min="1"
                        />
                    </div>
                    <div className="bt-field">
                        <label>Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn-primary bt-run-btn" disabled={loading}>
                        {loading ? 'Running...' : 'Run Backtest'}
                    </button>
                </form>
            </div>

            {error && <div className="bt-error">{error}</div>}

            {stats && (
                <div className="bt-stats-row">
                    <div className="bt-stat">
                        <span className="bt-stat-label">Invested</span>
                        <span className="bt-stat-value">${stats.invested.toLocaleString()}</span>
                    </div>
                    <div className="bt-stat">
                        <span className="bt-stat-label">Final Value</span>
                        <span className={`bt-stat-value ${isUp ? 'text-up' : 'text-down'}`}>
                            ${stats.finalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="bt-stat">
                        <span className="bt-stat-label">Total Return</span>
                        <span className={`bt-stat-value ${isUp ? 'text-up' : 'text-down'}`}>
                            {isUp ? '+' : ''}{stats.totalReturn.toFixed(2)}%
                        </span>
                    </div>
                    <div className="bt-stat">
                        <span className="bt-stat-label">CAGR</span>
                        <span className={`bt-stat-value ${stats.cagr >= 0 ? 'text-up' : 'text-down'}`}>
                            {stats.cagr >= 0 ? '+' : ''}{stats.cagr.toFixed(2)}%
                        </span>
                    </div>
                    <div className="bt-stat">
                        <span className="bt-stat-label">Max Drawdown</span>
                        <span className="bt-stat-value text-down">-{stats.maxDrawdown.toFixed(2)}%</span>
                    </div>
                    <div className="bt-stat">
                        <span className="bt-stat-label">Entry / Exit</span>
                        <span className="bt-stat-value">${stats.entryPrice.toFixed(2)} → ${stats.exitPrice.toFixed(2)}</span>
                    </div>
                </div>
            )}

            {chartData.length > 0 && (
                <div className="bt-chart-panel">
                    <ResponsiveContainer width="100%" height={380}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorBt" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={isUp ? '#00ff41' : '#ff3333'} stopOpacity={0.25} />
                                    <stop offset="95%" stopColor={isUp ? '#00ff41' : '#ff3333'} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="#222" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#666', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                                minTickGap={40}
                                dy={10}
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#666', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                                width={70}
                                orientation="right"
                                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                            />
                            <Tooltip content={<BacktestTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="invested"
                                name="Invested"
                                stroke="#555"
                                strokeWidth={1}
                                strokeDasharray="4 4"
                                fillOpacity={0}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                name="Portfolio Value"
                                stroke={isUp ? '#00ff41' : '#ff3333'}
                                strokeWidth={1.5}
                                fillOpacity={1}
                                fill="url(#colorBt)"
                                animationDuration={400}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {!stats && !loading && !error && (
                <div className="bt-empty">
                    <BarChart3 size={32} />
                    <p>Enter a ticker, amount and start date to simulate an investment</p>
                </div>
            )}
        </div>
    );
};

export default Backtesting;
