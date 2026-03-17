import { useState, useEffect } from 'react';
import { X, Search, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchAuth } from '../services/fetchAuth';

const TICKER_ALIASES = {
    'XAGUSD': 'SI=F', 'XAUUSD': 'GC=F', 'SILVER': 'SI=F', 'GOLD': 'GC=F',
};
const resolveTicker = (t) => TICKER_ALIASES[t.toUpperCase()] || t;

export default function AddStockModal({ isOpen, onClose, onAdd, initialTicker = '' }) {
    const [ticker, setTicker] = useState(initialTicker);
    const [shares, setShares] = useState('');
    const [avgPrice, setAvgPrice] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState('');
    const [successQuote, setSuccessQuote] = useState(null);

    const validateTicker = async (symOverride) => {
        const raw = typeof symOverride === 'string' ? symOverride : ticker;
        const targetTicker = resolveTicker(raw);
        if (!targetTicker) {
            setError('Please enter a ticker symbol.');
            return;
        }

        setIsValidating(true);
        setError('');
        setSuccessQuote(null);

        try {
            const response = await fetchAuth(`/api/quotes?symbols=${targetTicker.toUpperCase()}`);
            if (!response.ok) throw new Error('API Error');

            const data = await response.json();
            const quote = data.find(q => q.symbol === targetTicker.toUpperCase());

            if (!quote) {
                setError(`Ticker ${targetTicker} not found.`);
            } else {
                setSuccessQuote(quote);
                if (targetTicker !== raw) setTicker(targetTicker);
                // Pre-fill avg price with current market price if empty
                if (!avgPrice) {
                    setAvgPrice(quote.regularMarketPrice.toFixed(2));
                }
            }
        } catch (err) {
            console.error(err);
            setError('Failed to validate ticker. Check connection.');
        } finally {
            setIsValidating(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setTicker(initialTicker);
            setShares('');
            setAvgPrice('');
            setPurchaseDate(new Date().toISOString().split('T')[0]);
            setError('');
            setSuccessQuote(null);

            if (initialTicker && typeof initialTicker === 'string') {
                validateTicker(initialTicker);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialTicker]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!successQuote) {
            setError('Please validate the ticker first.');
            return;
        }
        if (!shares || Number(shares) <= 0) {
            setError('Please enter a valid number of shares.');
            return;
        }
        if (!avgPrice || Number(avgPrice) <= 0) {
            setError('Please enter a valid average price.');
            return;
        }
        if (!purchaseDate) {
            setError('Please enter a purchase date.');
            return;
        }

        const newStock = {
            id: successQuote.symbol,
            name: successQuote.shortName || successQuote.longName || successQuote.symbol,
            shares: Number(shares),
            avgPrice: Number(avgPrice), // User's custom average price
            prevClose: successQuote.regularMarketPreviousClose || successQuote.regularMarketPrice, // Market's prev close
            price: successQuote.regularMarketPrice,
            purchaseDate: purchaseDate
        };

        onAdd(newStock);
        toast.success(`Position ${newStock.symbol || newStock.id} added to portfolio`);
        resetAndClose();
    };

    const resetAndClose = () => {
        setTicker('');
        setShares('');
        setAvgPrice('');
        setPurchaseDate(new Date().toISOString().split('T')[0]);
        setError('');
        setSuccessQuote(null);
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close" onClick={resetAndClose}>
                    <X size={20} />
                </button>

                <h2>Add Custom Position</h2>
                <p className="modal-subtitle">Track your existing stock investments.</p>

                <form onSubmit={handleSubmit} className="add-stock-form">
                    <div className="form-group">
                        <label>Ticker Symbol</label>
                        <div className="input-with-action">
                            <input
                                type="text"
                                placeholder="e.g. AAPL"
                                value={ticker}
                                onChange={(e) => {
                                    setTicker(e.target.value.toUpperCase());
                                    setSuccessQuote(null); // Reset validation on change
                                }}
                                className="themed-input"
                            />
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => validateTicker()}
                                disabled={isValidating || !ticker}
                            >
                                {isValidating ? '...' : <Search size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="validation-message error">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    {successQuote && (
                        <div className="validation-message success">
                            <CheckCircle size={14} /> Found: {successQuote.shortName} (${successQuote.regularMarketPrice.toFixed(2)})
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label>Number of Shares</label>
                            <input
                                type="number"
                                step="any"
                                placeholder="0.0"
                                value={shares}
                                onChange={(e) => setShares(e.target.value)}
                                className="themed-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Avg Price ($)</label>
                            <input
                                type="number"
                                step="any"
                                placeholder="0.00"
                                value={avgPrice}
                                onChange={(e) => setAvgPrice(e.target.value)}
                                className="themed-input"
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label>Purchase Date</label>
                        <input
                            type="date"
                            value={purchaseDate}
                            onChange={(e) => setPurchaseDate(e.target.value)}
                            className="themed-input"
                        />
                    </div>

                    <button type="submit" className="btn-primary full-width" disabled={!successQuote}>
                        Add to Portfolio
                    </button>
                </form>
            </div>
        </div>
    );
}
