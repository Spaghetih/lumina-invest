import React, { useState, useEffect, useCallback } from 'react';
import { Filter, Loader } from 'lucide-react';
import './Screener.css';
import { fetchAuth } from '../services/fetchAuth';

const PRESETS = [
    { key: 'gainers', label: 'Top Gainers' },
    { key: 'losers', label: 'Top Losers' },
    { key: 'most_actives', label: 'Most Active' },
    { key: 'trending', label: 'Trending' },
    { key: 'undervalued_large_caps', label: 'Undervalued Large Caps' },
    { key: 'growth_technology_stocks', label: 'Growth Tech' },
    { key: 'small_cap_gainers', label: 'Small Cap Gainers' },
];

const formatVolume = (vol) => {
    if (!vol && vol !== 0) return '--';
    if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
    if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
    if (vol >= 1e3) return (vol / 1e3).toFixed(1) + 'K';
    return vol.toLocaleString();
};

const formatMarketCap = (cap) => {
    if (!cap && cap !== 0) return '--';
    if (cap >= 1e12) return '$' + (cap / 1e12).toFixed(2) + 'T';
    if (cap >= 1e9) return '$' + (cap / 1e9).toFixed(2) + 'B';
    if (cap >= 1e6) return '$' + (cap / 1e6).toFixed(1) + 'M';
    return '$' + cap.toLocaleString();
};

const formatPrice = (val) => {
    if (val == null) return '--';
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Screener = ({ onViewChart }) => {
    const [activePreset, setActivePreset] = useState('gainers');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchScreener = useCallback(async (preset) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchAuth(`/api/screener?preset=${encodeURIComponent(preset)}`);
            if (!res.ok) throw new Error('Failed to fetch screener data');
            const data = await res.json();
            const list = Array.isArray(data) ? data : data.quotes || data.results || data.stocks || [];
            setResults(list);
        } catch (err) {
            setError(err.message);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchScreener(activePreset);
    }, [activePreset, fetchScreener]);

    const handlePreset = (key) => {
        setActivePreset(key);
    };

    const handleRowClick = (stock) => {
        if (onViewChart) {
            const sym = stock.symbol || stock.ticker;
            onViewChart(sym);
        }
    };

    return (
        <div className="screener-container">
            <div className="screener-header">
                <div className="screener-title-row">
                    <Filter size={16} className="screener-icon" />
                    <h3 className="screener-title">Stock Screener</h3>
                </div>
                <div className="screener-presets">
                    {PRESETS.map((p) => (
                        <button
                            key={p.key}
                            className={`preset-btn ${activePreset === p.key ? 'preset-active' : ''}`}
                            onClick={() => handlePreset(p.key)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="screener-body">
                {loading ? (
                    <div className="screener-loading">
                        <Loader size={20} className="screener-spinner" />
                        <span>Loading {PRESETS.find((p) => p.key === activePreset)?.label}...</span>
                    </div>
                ) : error ? (
                    <div className="screener-error">
                        <span>Error: {error}</span>
                    </div>
                ) : results.length === 0 ? (
                    <div className="screener-empty">
                        <span>No results for this preset.</span>
                    </div>
                ) : (
                    <div className="screener-table-wrap">
                        <table className="screener-table">
                            <thead>
                                <tr>
                                    <th>Ticker</th>
                                    <th>Name</th>
                                    <th className="text-right">Price</th>
                                    <th className="text-right">Change%</th>
                                    <th className="text-right">Market Cap</th>
                                    <th className="text-right">Volume</th>
                                    <th className="text-right">P/E Ratio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((stock) => {
                                    const sym = stock.symbol || stock.ticker;
                                    const name = stock.shortName || stock.longName || stock.name || '--';
                                    const price = stock.regularMarketPrice ?? stock.price;
                                    const changePct = stock.regularMarketChangePercent ?? stock.changePercent ?? stock.changesPercentage;
                                    const marketCap = stock.marketCap ?? stock.regularMarketMarketCap;
                                    const volume = stock.regularMarketVolume ?? stock.volume;
                                    const pe = stock.trailingPE ?? stock.peRatio ?? stock.pe;
                                    const isUp = changePct != null ? changePct >= 0 : null;

                                    return (
                                        <tr
                                            key={sym}
                                            className={`screener-row ${onViewChart ? 'clickable' : ''}`}
                                            onClick={() => handleRowClick(stock)}
                                        >
                                            <td className="cell-ticker">{sym}</td>
                                            <td className="cell-name">{name}</td>
                                            <td className="cell-price text-right">
                                                {price != null ? formatPrice(price) : '--'}
                                            </td>
                                            <td className={`cell-changepct text-right ${isUp === true ? 'text-up' : isUp === false ? 'text-down' : ''}`}>
                                                {changePct != null ? (isUp ? '+' : '') + changePct.toFixed(2) + '%' : '--'}
                                            </td>
                                            <td className="cell-mcap text-right">{formatMarketCap(marketCap)}</td>
                                            <td className="cell-volume text-right">{formatVolume(volume)}</td>
                                            <td className="cell-pe text-right">
                                                {pe != null ? pe.toFixed(2) : '--'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Screener;
