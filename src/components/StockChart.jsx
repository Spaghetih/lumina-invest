import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Search, TrendingUp, TrendingDown, Volume2, GitCompare } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import NewsFeed from './NewsFeed';
import './StockChart.css';

const TIMEFRAMES = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'];

const ChartTooltip = ({ active, payload, label, compareMode, primaryTicker, secondaryTicker }) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;

        if (compareMode) {
            return (
                <div className="sc-tooltip">
                    <p className="sc-tooltip-date">{label}</p>
                    {d.primaryPct !== undefined && (
                        <div className="sc-tooltip-row">
                            <span style={{ color: '#ff9900' }}>{primaryTicker}</span>
                            <span style={{ color: '#ff9900' }}>{d.primaryPct >= 0 ? '+' : ''}{d.primaryPct.toFixed(2)}%</span>
                        </div>
                    )}
                    {d.secondaryPct !== undefined && (
                        <div className="sc-tooltip-row">
                            <span style={{ color: '#00bcd4' }}>{secondaryTicker}</span>
                            <span style={{ color: '#00bcd4' }}>{d.secondaryPct >= 0 ? '+' : ''}{d.secondaryPct.toFixed(2)}%</span>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="sc-tooltip">
                <p className="sc-tooltip-date">{label}</p>
                <div className="sc-tooltip-row">
                    <span>O</span><span>{d.open?.toFixed(2)}</span>
                </div>
                <div className="sc-tooltip-row">
                    <span>H</span><span>{d.high?.toFixed(2)}</span>
                </div>
                <div className="sc-tooltip-row">
                    <span>L</span><span>{d.low?.toFixed(2)}</span>
                </div>
                <div className="sc-tooltip-row">
                    <span>C</span><span className="sc-tooltip-close">{d.close?.toFixed(2)}</span>
                </div>
            </div>
        );
    }
    return null;
};

const StockChart = ({ stocks = [] }) => {
    const { format } = useCurrency();
    const [ticker, setTicker] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [timeframe, setTimeframe] = useState('1M');
    const [chartData, setChartData] = useState([]);
    const [quoteInfo, setQuoteInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const intervalRef = useRef(null);

    // Compare mode state
    const [compareMode, setCompareMode] = useState(false);
    const [compareTicker, setCompareTicker] = useState('');
    const [compareInput, setCompareInput] = useState('');
    const [compareData, setCompareData] = useState([]);
    const [mergedData, setMergedData] = useState([]);

    // Format date label based on timeframe
    const formatDate = useCallback((item, tf) => {
        const d = new Date(item.date);
        if (tf === '1D') return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        if (tf === '1W') return d.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
        if (tf === '5Y') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }, []);

    // Fetch historical data for a given symbol
    const fetchHistorical = useCallback(async (sym, tf) => {
        const res = await fetch(`http://localhost:3001/api/historical/${sym}?range=${tf}`);
        if (!res.ok) throw new Error(`Failed to fetch data for ${sym}`);
        const data = await res.json();
        return data.map(item => ({
            date: formatDate(item, tf),
            close: item.close,
            open: item.open,
            high: item.high,
            low: item.low,
            volume: item.volume,
        }));
    }, [formatDate]);

    // Fetch historical data (primary ticker)
    const fetchChart = useCallback(async (sym, tf) => {
        if (!sym) return;
        setLoading(true);
        setError('');
        try {
            const formatted = await fetchHistorical(sym, tf);
            setChartData(formatted);
        } catch {
            setError(`Unable to load chart for ${sym}`);
            setChartData([]);
        } finally {
            setLoading(false);
        }
    }, [fetchHistorical]);

    // Fetch comparison data
    const fetchCompare = useCallback(async (sym, tf) => {
        if (!sym) {
            setCompareData([]);
            return;
        }
        try {
            const formatted = await fetchHistorical(sym, tf);
            setCompareData(formatted);
        } catch {
            setCompareData([]);
            setError(`Unable to load comparison data for ${sym}`);
        }
    }, [fetchHistorical]);

    // Normalize and merge datasets when in compare mode
    useEffect(() => {
        if (!compareMode || chartData.length === 0) {
            setMergedData([]);
            return;
        }

        const primaryBase = chartData[0]?.close;
        if (!primaryBase) return;

        const secondaryBase = compareData.length > 0 ? compareData[0]?.close : null;
        const maxLen = Math.max(chartData.length, compareData.length);
        const merged = [];

        for (let i = 0; i < maxLen; i++) {
            const primary = chartData[i];
            const secondary = compareData[i];
            const point = {
                date: primary?.date || secondary?.date || '',
            };

            if (primary) {
                point.primaryPct = ((primary.close - primaryBase) / primaryBase) * 100;
            }
            if (secondary && secondaryBase) {
                point.secondaryPct = ((secondary.close - secondaryBase) / secondaryBase) * 100;
            }

            merged.push(point);
        }

        setMergedData(merged);
    }, [compareMode, chartData, compareData]);

    // Fetch live quote
    const fetchQuote = useCallback(async (sym) => {
        if (!sym) return;
        try {
            const res = await fetch(`http://localhost:3001/api/quotes?symbols=${sym}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.length > 0) {
                const q = data[0];
                setQuoteInfo({
                    name: q.shortName || q.longName || sym,
                    price: q.regularMarketPrice,
                    prevClose: q.regularMarketPreviousClose,
                    change: q.regularMarketChange,
                    changePercent: q.regularMarketChangePercent,
                    volume: q.regularMarketVolume,
                    currency: q.currency || 'USD',
                });
            }
        } catch { /* silent */ }
    }, []);

    // Select a ticker
    const selectTicker = useCallback((sym) => {
        const s = sym.toUpperCase().trim();
        if (!s) return;
        setTicker(s);
        setSearchInput(s);
        fetchChart(s, timeframe);
        fetchQuote(s);
    }, [timeframe, fetchChart, fetchQuote]);

    // Handle search submit
    const handleSearch = (e) => {
        e.preventDefault();
        selectTicker(searchInput);
    };

    // Handle compare search submit
    const handleCompareSearch = (e) => {
        e.preventDefault();
        const sym = compareInput.toUpperCase().trim();
        if (!sym) return;
        setCompareTicker(sym);
        fetchCompare(sym, timeframe);
    };

    // Toggle compare mode
    const handleToggleCompare = () => {
        const next = !compareMode;
        setCompareMode(next);
        if (!next) {
            setCompareTicker('');
            setCompareInput('');
            setCompareData([]);
            setMergedData([]);
        }
    };

    // Timeframe change
    const handleTimeframeChange = (tf) => {
        setTimeframe(tf);
        if (ticker) fetchChart(ticker, tf);
        if (compareMode && compareTicker) fetchCompare(compareTicker, tf);
    };

    // Auto-refresh quote every 5s
    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (ticker) {
            intervalRef.current = setInterval(() => fetchQuote(ticker), 5000);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [ticker, fetchQuote]);

    // Auto-select first portfolio stock on mount
    useEffect(() => {
        if (!ticker && stocks.length > 0) {
            selectTicker(stocks[0].id);
        }
    }, [stocks]); // eslint-disable-line react-hooks/exhaustive-deps

    const isUp = quoteInfo ? quoteInfo.change >= 0 : true;
    const firstClose = chartData.length > 0 ? chartData[0].close : 0;
    const lastClose = chartData.length > 0 ? chartData[chartData.length - 1].close : 0;
    const chartIsUp = lastClose >= firstClose;

    const showCompareChart = compareMode && mergedData.length > 0;

    return (
        <div className="stock-chart-page">
            {/* Toolbar */}
            <div className="sc-toolbar">
                <form className="sc-search" onSubmit={handleSearch}>
                    <Search size={14} className="sc-search-icon" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                        placeholder="Ticker symbol..."
                        spellCheck={false}
                    />
                </form>
                <button
                    className={`sc-compare-btn ${compareMode ? 'active' : ''}`}
                    onClick={handleToggleCompare}
                    title="Compare two tickers"
                >
                    <GitCompare size={14} />
                    Compare
                </button>
                {compareMode && (
                    <form className="sc-search sc-compare-input" onSubmit={handleCompareSearch}>
                        <Search size={14} className="sc-search-icon" />
                        <input
                            type="text"
                            value={compareInput}
                            onChange={(e) => setCompareInput(e.target.value.toUpperCase())}
                            placeholder="Compare with..."
                            spellCheck={false}
                            autoFocus
                        />
                    </form>
                )}
                {stocks.length > 0 && (
                    <div className="sc-quick-picks">
                        {stocks.map(s => (
                            <button
                                key={s.id}
                                className={`sc-pick-btn ${ticker === s.id ? 'active' : ''}`}
                                onClick={() => selectTicker(s.id)}
                            >
                                {s.id}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Quote Header */}
            {quoteInfo && (
                <div className="sc-header">
                    <div className="sc-header-left">
                        <h2 className="sc-ticker">{ticker}</h2>
                        <span className="sc-name">{quoteInfo.name}</span>
                        {compareMode && compareTicker && (
                            <span className="sc-compare-label">vs <span style={{ color: '#00bcd4' }}>{compareTicker}</span></span>
                        )}
                    </div>
                    <div className="sc-header-right">
                        <span className="sc-price">{quoteInfo.price?.toFixed(2)} <span className="sc-currency">{quoteInfo.currency}</span></span>
                        <span className={`sc-change ${isUp ? 'text-up' : 'text-down'}`}>
                            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {isUp ? '+' : ''}{quoteInfo.change?.toFixed(2)} ({isUp ? '+' : ''}{quoteInfo.changePercent?.toFixed(2)}%)
                        </span>
                        {quoteInfo.volume && (
                            <span className="sc-volume">
                                <Volume2 size={12} />
                                {(quoteInfo.volume / 1e6).toFixed(1)}M
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Timeframes + Chart */}
            <div className="sc-chart-panel">
                <div className="sc-timeframes">
                    {TIMEFRAMES.map(tf => (
                        <button
                            key={tf}
                            className={`time-btn ${timeframe === tf ? 'active' : ''}`}
                            onClick={() => handleTimeframeChange(tf)}
                        >
                            {tf}
                        </button>
                    ))}
                </div>

                <div className="sc-chart-container">
                    {loading && <div className="sc-loading">Loading...</div>}
                    {error && <div className="sc-error">{error}</div>}
                    {!loading && !error && chartData.length === 0 && !ticker && (
                        <div className="sc-empty">
                            <Search size={32} />
                            <p>Search for a ticker or select from your portfolio</p>
                        </div>
                    )}

                    {/* Normal single-ticker chart */}
                    {!loading && !showCompareChart && chartData.length > 0 && (
                        <ResponsiveContainer width="100%" height={420}>
                            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={chartIsUp ? '#00ff41' : '#ff3333'} stopOpacity={0.25} />
                                        <stop offset="95%" stopColor={chartIsUp ? '#00ff41' : '#ff3333'} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="#222" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#666', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                                    dy={10}
                                    minTickGap={40}
                                />
                                <YAxis
                                    domain={['auto', 'auto']}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#666', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                                    width={70}
                                    orientation="right"
                                    tickFormatter={(v) => v.toFixed(0)}
                                />
                                <Tooltip content={<ChartTooltip compareMode={false} />} />
                                <Area
                                    type="monotone"
                                    dataKey="close"
                                    name="Price"
                                    stroke={chartIsUp ? '#00ff41' : '#ff3333'}
                                    strokeWidth={1.5}
                                    fillOpacity={1}
                                    fill="url(#colorStock)"
                                    animationDuration={400}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}

                    {/* Compare mode chart (normalized % change) */}
                    {!loading && showCompareChart && (
                        <ResponsiveContainer width="100%" height={420}>
                            <AreaChart data={mergedData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ff9900" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#ff9900" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00bcd4" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#00bcd4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="#222" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#666', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                                    dy={10}
                                    minTickGap={40}
                                />
                                <YAxis
                                    domain={['auto', 'auto']}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#666', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                                    width={70}
                                    orientation="right"
                                    tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
                                />
                                <Tooltip content={<ChartTooltip compareMode={true} primaryTicker={ticker} secondaryTicker={compareTicker} />} />
                                <Legend
                                    verticalAlign="top"
                                    height={30}
                                    formatter={(value) => (
                                        <span style={{ color: '#999', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }}>
                                            {value}
                                        </span>
                                    )}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="primaryPct"
                                    name={ticker}
                                    stroke="#ff9900"
                                    strokeWidth={1.5}
                                    fillOpacity={1}
                                    fill="url(#colorPrimary)"
                                    animationDuration={400}
                                    dot={false}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="secondaryPct"
                                    name={compareTicker}
                                    stroke="#00bcd4"
                                    strokeWidth={1.5}
                                    fillOpacity={1}
                                    fill="url(#colorSecondary)"
                                    animationDuration={400}
                                    dot={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* News Feed for selected ticker */}
            {ticker && <NewsFeed symbol={ticker} />}
        </div>
    );
};

export default StockChart;
