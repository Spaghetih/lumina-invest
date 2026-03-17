import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Trash2, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import './Watchlist.css';
import { fetchAuth } from '../services/fetchAuth';

const STORAGE_KEY = 'lumina_watchlist';
const POLL_INTERVAL = 5000;

const loadWatchlist = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveWatchlist = (symbols) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
};

const formatVolume = (vol) => {
    if (!vol && vol !== 0) return '--';
    if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
    if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
    if (vol >= 1e3) return (vol / 1e3).toFixed(1) + 'K';
    return vol.toLocaleString();
};

const formatPrice = (val) => {
    if (val == null) return '--';
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Watchlist = () => {
    const [symbols, setSymbols] = useState(loadWatchlist);
    const [quotes, setQuotes] = useState({});
    const [prevPrices, setPrevPrices] = useState({});
    const [flashes, setFlashes] = useState({});
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [searching, setSearching] = useState(false);
    const searchRef = useRef(null);
    const debounceRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Search autocomplete
    useEffect(() => {
        if (!query.trim()) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetchAuth(`/api/search?q=${encodeURIComponent(query.trim())}`);
                if (res.ok) {
                    const data = await res.json();
                    const results = (data.quotes || data.results || data || [])
                        .filter((item) => item.symbol && item.symbol !== '')
                        .slice(0, 8);
                    setSuggestions(results);
                    setShowDropdown(results.length > 0);
                }
            } catch {
                // ignore
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [query]);

    // Fetch quotes
    const fetchQuotes = useCallback(async () => {
        if (symbols.length === 0) return;
        try {
            const res = await fetchAuth(`/api/quotes?symbols=${symbols.join(',')}`);
            if (res.ok) {
                const data = await res.json();
                const quotesMap = {};
                const newFlashes = {};
                const arr = Array.isArray(data) ? data : data.quotes || data.results || [];
                arr.forEach((q) => {
                    const sym = q.symbol || q.ticker;
                    if (!sym) return;
                    quotesMap[sym] = q;
                    const prev = prevPrices[sym];
                    const curr = q.regularMarketPrice ?? q.price;
                    if (prev != null && curr != null && prev !== curr) {
                        newFlashes[sym] = curr > prev ? 'flash-up' : 'flash-down';
                    }
                });
                setQuotes(quotesMap);
                setPrevPrices((old) => {
                    const updated = { ...old };
                    Object.entries(quotesMap).forEach(([sym, q]) => {
                        updated[sym] = q.regularMarketPrice ?? q.price;
                    });
                    return updated;
                });
                if (Object.keys(newFlashes).length > 0) {
                    setFlashes(newFlashes);
                    setTimeout(() => setFlashes({}), 1000);
                }
            }
        } catch {
            // ignore
        }
    }, [symbols, prevPrices]);

    useEffect(() => {
        fetchQuotes();
        const interval = setInterval(fetchQuotes, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchQuotes]);

    // Save to localStorage whenever symbols change
    useEffect(() => {
        saveWatchlist(symbols);
    }, [symbols]);

    const addSymbol = (symbol) => {
        const sym = symbol.toUpperCase();
        if (!symbols.includes(sym)) {
            setSymbols((prev) => [...prev, sym]);
        }
        setQuery('');
        setShowDropdown(false);
        setSuggestions([]);
    };

    const removeSymbol = (symbol) => {
        setSymbols((prev) => prev.filter((s) => s !== symbol));
        setQuotes((prev) => {
            const copy = { ...prev };
            delete copy[symbol];
            return copy;
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && query.trim()) {
            addSymbol(query.trim());
        }
        if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    };

    const getQuoteValue = (sym, field) => {
        const q = quotes[sym];
        if (!q) return null;
        // Support various API response shapes
        const fieldMap = {
            price: ['regularMarketPrice', 'price'],
            change: ['regularMarketChange', 'change'],
            changePercent: ['regularMarketChangePercent', 'changePercent', 'changesPercentage'],
            name: ['shortName', 'longName', 'name'],
            volume: ['regularMarketVolume', 'volume'],
            fiftyTwoWeekHigh: ['fiftyTwoWeekHigh', 'yearHigh'],
            fiftyTwoWeekLow: ['fiftyTwoWeekLow', 'yearLow'],
        };
        const keys = fieldMap[field] || [field];
        for (const k of keys) {
            if (q[k] != null) return q[k];
        }
        return null;
    };

    return (
        <div className="watchlist-container">
            <div className="watchlist-header">
                <div className="watchlist-title-row">
                    <Eye size={16} className="watchlist-icon" />
                    <h3 className="watchlist-title">Watchlist</h3>
                    <span className="watchlist-count">{symbols.length} symbols</span>
                </div>
                <div className="watchlist-search" ref={searchRef}>
                    <Search size={14} className="search-icon" />
                    <input
                        type="text"
                        className="watchlist-search-input"
                        placeholder="Search ticker to add..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                    />
                    {searching && <span className="search-spinner" />}
                    {showDropdown && (
                        <div className="search-dropdown">
                            {suggestions.map((item) => {
                                const sym = item.symbol || item.ticker;
                                const name = item.shortname || item.shortName || item.longname || item.longName || item.name || '';
                                const type = item.quoteType || item.typeDisp || item.type || '';
                                const alreadyAdded = symbols.includes(sym);
                                return (
                                    <div
                                        key={sym}
                                        className={`search-dropdown-item ${alreadyAdded ? 'already-added' : ''}`}
                                        onClick={() => !alreadyAdded && addSymbol(sym)}
                                    >
                                        <span className="dropdown-symbol">{sym}</span>
                                        <span className="dropdown-name">{name}</span>
                                        <span className="dropdown-type">{type}</span>
                                        {alreadyAdded && <span className="dropdown-added">ADDED</span>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {symbols.length === 0 ? (
                <div className="watchlist-empty">
                    <Eye size={32} className="empty-icon" />
                    <p>No symbols in your watchlist.</p>
                    <p className="empty-hint">Search for a ticker above to start tracking.</p>
                </div>
            ) : (
                <div className="watchlist-table-wrap">
                    <table className="watchlist-table">
                        <thead>
                            <tr>
                                <th>Ticker</th>
                                <th>Name</th>
                                <th className="text-right">Price</th>
                                <th className="text-right">Change</th>
                                <th className="text-right">Change%</th>
                                <th className="text-right">Volume</th>
                                <th className="text-right">52w High</th>
                                <th className="text-right">52w Low</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {symbols.map((sym) => {
                                const price = getQuoteValue(sym, 'price');
                                const change = getQuoteValue(sym, 'change');
                                const changeP = getQuoteValue(sym, 'changePercent');
                                const name = getQuoteValue(sym, 'name');
                                const volume = getQuoteValue(sym, 'volume');
                                const high52 = getQuoteValue(sym, 'fiftyTwoWeekHigh');
                                const low52 = getQuoteValue(sym, 'fiftyTwoWeekLow');
                                const isUp = change != null ? change >= 0 : null;
                                const flash = flashes[sym] || '';

                                return (
                                    <tr key={sym} className="watchlist-row">
                                        <td className="cell-ticker">{sym}</td>
                                        <td className="cell-name">{name || '--'}</td>
                                        <td className={`cell-price text-right ${flash}`}>
                                            {price != null ? formatPrice(price) : '--'}
                                        </td>
                                        <td className={`cell-change text-right ${isUp === true ? 'text-up' : isUp === false ? 'text-down' : ''}`}>
                                            {change != null ? (isUp ? '+' : '') + formatPrice(change) : '--'}
                                        </td>
                                        <td className={`cell-changepct text-right ${isUp === true ? 'text-up' : isUp === false ? 'text-down' : ''}`}>
                                            {changeP != null ? (isUp ? '+' : '') + changeP.toFixed(2) + '%' : '--'}
                                        </td>
                                        <td className="cell-volume text-right">{formatVolume(volume)}</td>
                                        <td className="cell-52h text-right">{high52 != null ? formatPrice(high52) : '--'}</td>
                                        <td className="cell-52l text-right">{low52 != null ? formatPrice(low52) : '--'}</td>
                                        <td className="cell-actions">
                                            <button
                                                className="watchlist-remove-btn"
                                                onClick={() => removeSymbol(sym)}
                                                title="Remove from watchlist"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Watchlist;
