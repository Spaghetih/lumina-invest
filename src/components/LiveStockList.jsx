import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import './LiveStockList.css';

const StockLogo = ({ ticker }) => {
    const [imgError, setImgError] = useState(false);
    const logoUrl = `https://assets.parqet.com/logos/symbol/${ticker}`;

    if (imgError) {
        return (
            <div className="stock-avatar stock-avatar-text">
                {ticker.substring(0, 2)}
            </div>
        );
    }
    return (
        <img
            src={logoUrl}
            alt={ticker}
            className="stock-avatar stock-avatar-img"
            onError={() => setImgError(true)}
            loading="lazy"
        />
    );
};

const StockRow = ({ stock, onDelete }) => {
    const [flashClass, setFlashClass] = useState('');
    const { format, hideBalances } = useCurrency();

    useEffect(() => {
        if (stock.direction) {
            setFlashClass(stock.direction === 'up' ? 'flash-up' : 'flash-down');
            const timer = setTimeout(() => setFlashClass(''), 1000);
            return () => clearTimeout(timer);
        }
    }, [stock.price, stock.direction]);

    const change = stock.price - stock.prevClose;
    const changePercent = (change / stock.prevClose) * 100;
    const isUp = change >= 0;
    const qc = stock.quoteCurrency || 'USD';

    // PNL calculation
    const costBasis = (stock.avgPrice || stock.prevClose) * (stock.shares || 0);
    const currentValue = stock.price * (stock.shares || 0);
    const pnl = currentValue - costBasis;
    const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    const pnlUp = pnl >= 0;

    return (
        <div className="stock-row">
            {/* Left: Logo + info */}
            <div className="stock-info">
                <StockLogo ticker={stock.id} />
                <div className="stock-text">
                    <div className="stock-symbol">{stock.id}</div>
                    <div className="stock-name">{stock.name}</div>
                </div>
            </div>

            {/* Center: Shares */}
            <div className="stock-shares-col">
                <span className="stock-shares-count">{hideBalances ? '•••' : stock.shares?.toFixed(4)}</span>
                <span className="stock-shares-label">shares</span>
            </div>

            {/* PNL */}
            <div className="stock-pnl-col">
                <span className={`stock-pnl-value ${pnlUp ? 'text-up' : 'text-down'}`}>
                    {pnlUp ? '+' : ''}{format(pnl, qc)}
                </span>
                <span className={`stock-pnl-pct ${pnlUp ? 'text-up' : 'text-down'}`}>
                    {pnlUp ? '+' : ''}{pnlPercent.toFixed(2)}%
                </span>
            </div>

            {/* Right: Price + Change */}
            <div className="stock-price-col">
                <div className={`stock-price ${flashClass}`}>
                    {format(stock.price, qc)}
                </div>
                <div className={`stock-change-badge ${isUp ? 'badge-up' : 'badge-down'}`}>
                    {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    <span>{isUp ? '+' : ''}{changePercent.toFixed(2)}%</span>
                </div>
            </div>

            {/* Delete button */}
            {onDelete && (
                <button
                    className="delete-stock-btn"
                    onClick={(e) => { e.stopPropagation(); onDelete(stock.id); }}
                    title="Remove position"
                >
                    <Trash2 size={15} />
                </button>
            )}
        </div>
    );
};

const LiveStockList = ({ stocks, onDeleteStock }) => {
    const { hideBalances } = useCurrency();
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedStocks = React.useMemo(() => {
        const sortableItems = [...stocks];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue, bValue;

                // Calculate values dynamically for sorting
                const aCostBasis = (a.avgPrice || a.prevClose) * (a.shares || 0);
                const aCurrentValue = a.price * (a.shares || 0);
                const aPnl = aCurrentValue - aCostBasis;

                const bCostBasis = (b.avgPrice || b.prevClose) * (b.shares || 0);
                const bCurrentValue = b.price * (b.shares || 0);
                const bPnl = bCurrentValue - bCostBasis;

                switch (sortConfig.key) {
                    case 'asset':
                        aValue = a.name.toLowerCase();
                        bValue = b.name.toLowerCase();
                        break;
                    case 'shares':
                        aValue = a.shares || 0;
                        bValue = b.shares || 0;
                        break;
                    case 'pnl':
                        aValue = aPnl;
                        bValue = bPnl;
                        break;
                    case 'value':
                        aValue = aCurrentValue;
                        bValue = bCurrentValue;
                        break;
                    default:
                        aValue = 0;
                        bValue = 0;
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [stocks, sortConfig]);

    const getSortIcon = (columnName) => {
        if (sortConfig.key !== columnName) return null;
        return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
    };

    return (
        <div className="live-stocks-card glass-panel">
            <div className="card-header">
                <h3 className="card-title">Live Markets</h3>
                <span className="live-indicator">
                    <span className="live-dot"></span> Live
                </span>
            </div>

            <div className="stocks-list">
                {stocks.length > 0 && (
                    <div className="list-header">
                        <div className="header-col" onClick={() => handleSort('asset')}>
                            Asset {getSortIcon('asset')}
                        </div>
                        <div className="header-col" onClick={() => handleSort('shares')} style={{ justifyContent: 'flex-end' }}>
                            Shares {getSortIcon('shares')}
                        </div>
                        <div className="header-col" onClick={() => handleSort('pnl')} style={{ justifyContent: 'flex-end' }}>
                            Total PNL {getSortIcon('pnl')}
                        </div>
                        <div className="header-col" onClick={() => handleSort('value')} style={{ justifyContent: 'flex-end' }}>
                            Price / Value {getSortIcon('value')}
                        </div>
                        <div className="header-col"></div> {/* Spacer for delete button */}
                    </div>
                )}

                {sortedStocks.length > 0 ? (
                    sortedStocks.map(stock => (
                        <StockRow key={stock.id} stock={stock} onDelete={onDeleteStock} />
                    ))
                ) : (
                    <div className="empty-stocks">
                        <p>No positions yet. Add your first stock!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveStockList;
