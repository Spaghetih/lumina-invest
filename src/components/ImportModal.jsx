import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, X, ArrowRight, Pencil, Search, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNotifications } from '../contexts/NotificationContext';
import './ImportModal.css';
import { fetchAuth } from '../services/fetchAuth';

// Known Revolut ticker → Yahoo Finance ticker mappings
const REVOLUT_TICKER_MAP = {
    'TOTB': 'TTE',      // TotalEnergies
    'DHER': 'DHER.DE',  // Delivery Hero
    'SAP': 'SAP',       // SAP SE
    'SIE': 'SIE.DE',    // Siemens
    'AIR': 'AIR.PA',    // Airbus
    'BNP': 'BNP.PA',    // BNP Paribas
    'SAN': 'SAN.PA',    // Sanofi
    'MC': 'MC.PA',      // LVMH
    'OR': 'OR.PA',      // L'Oréal
    'ACA': 'ACA.PA',    // Crédit Agricole
    'CS': 'CS.PA',      // AXA
    'DG': 'DG.PA',      // Vinci
    'BN': 'BN.PA',      // Danone
    'RI': 'RI.PA',      // Pernod Ricard
    'KER': 'KER.PA',    // Kering
    'AIL': 'AI.PA',      // Air Liquide
    'SND': 'SU.PA',      // Schneider Electric
    'CAP': 'CAP.PA',    // Capgemini
    'SGO': 'SGO.PA',    // Saint-Gobain
    'VIV': 'VIV.PA',    // Vivendi
    'GLE': 'GLE.PA',    // Société Générale
    'ORA': 'ORA.PA',    // Orange
    'EN': 'EN.PA',      // Bouygues
    'RMS': 'RMS.PA',    // Hermès
    'DSY': 'DSY.PA',    // Dassault Systèmes
    'STM': 'STM.PA',    // STMicroelectronics
    'TEP': 'TEP.PA',    // Teleperformance
    'ML': 'ML.PA',      // Michelin
    'XAGUSD': 'SI=F',   // Silver
    'XAUUSD': 'GC=F',   // Gold
};

// Apply ticker mapping
const mapTicker = (revolut) => REVOLUT_TICKER_MAP[revolut] || revolut;

// Parse Revolut CSV format
const parseRevolutCSV = (csvText) => {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) throw new Error('File is empty or has no data rows.');

    const headerLine = lines[0];
    const separator = headerLine.includes('\t') ? '\t' :
        headerLine.includes(';') ? ';' : ',';

    const headers = headerLine.split(separator).map(h => h.trim().replace(/^"|"$/g, ''));

    const find = (name) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
    const dateIdx = find('Date');
    const tickerIdx = find('Ticker');
    const typeIdx = find('Type');
    const qtyIdx = find('Quantity');
    const priceIdx = find('Price');
    const totalIdx = find('Total');
    const currencyIdx = find('Currency');
    const fxIdx = find('FX');

    if (tickerIdx === -1 || typeIdx === -1) {
        throw new Error('Could not find required columns (Ticker, Type). Make sure this is a Revolut stocks export.');
    }

    const transactions = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 3) continue;

        const type = cols[typeIdx] || '';
        if (!type.toUpperCase().includes('BUY')) continue;

        const rawTicker = (cols[tickerIdx] || '').trim();
        if (!rawTicker) continue;

        const quantity = parseFloat(cols[qtyIdx]) || 0;
        if (quantity <= 0) continue;

        let priceRaw = cols[priceIdx] || '0';
        let priceValue = parseFloat(priceRaw.replace(/[^0-9.\-]/g, '')) || 0;

        let totalRaw = cols[totalIdx] || '0';
        let totalValue = parseFloat(totalRaw.replace(/[^0-9.\-]/g, '')) || 0;

        if (priceValue === 0 && totalValue > 0 && quantity > 0) {
            priceValue = totalValue / quantity;
        }

        let currency = 'USD';
        if (currencyIdx >= 0 && cols[currencyIdx]) {
            currency = cols[currencyIdx].trim().toUpperCase();
        } else if (priceRaw.includes('EUR')) {
            currency = 'EUR';
        }

        let fxRate = 1;
        if (fxIdx >= 0 && cols[fxIdx]) {
            fxRate = parseFloat(cols[fxIdx]) || 1;
        }

        // Keep the original price in its original currency (don't convert)
        let priceNative = priceValue;
        let priceCurrency = currency; // EUR or USD

        // For EUR stocks with FX rate > 1, we also compute the USD equivalent
        // But we keep the native price for accurate cost basis
        let priceUSD = priceValue;
        if (currency === 'EUR' && fxRate && fxRate !== 1) {
            priceUSD = priceValue * fxRate;
        }
        let priceEUR = priceValue;
        if (currency === 'USD' && fxRate && fxRate !== 1) {
            priceEUR = priceValue / fxRate;
        }

        let dateStr = '';
        if (dateIdx >= 0 && cols[dateIdx]) {
            try {
                const d = new Date(cols[dateIdx]);
                if (!isNaN(d.getTime())) {
                    dateStr = d.toISOString().split('T')[0];
                }
            } catch (e) { /* skip */ }
        }

        transactions.push({
            ticker: rawTicker,
            mappedTicker: mapTicker(rawTicker),
            quantity,
            priceNative,
            priceCurrency,
            priceUSD,
            priceEUR,
            date: dateStr,
            currency,
            originalPrice: priceValue,
            fxRate,
            type
        });
    }

    return transactions;
};

// Aggregate buys by mapped ticker
const aggregateByTicker = (transactions) => {
    const map = {};
    transactions.forEach(tx => {
        const key = tx.mappedTicker;
        if (!map[key]) {
            map[key] = {
                ticker: key,
                originalTicker: tx.ticker,
                totalShares: 0,
                totalCostUSD: 0,
                totalCostEUR: 0,
                totalCostNative: 0,
                predominantCurrency: tx.priceCurrency,
                earliestDate: tx.date,
                transactions: []
            };
        }
        const agg = map[key];
        agg.totalShares += tx.quantity;
        agg.totalCostUSD += tx.quantity * tx.priceUSD;
        agg.totalCostEUR += tx.quantity * tx.priceEUR;
        agg.totalCostNative += tx.quantity * tx.priceNative;
        if (tx.date && (!agg.earliestDate || tx.date < agg.earliestDate)) {
            agg.earliestDate = tx.date;
        }
        agg.transactions.push(tx);
    });

    return Object.values(map).map(agg => ({
        ticker: agg.ticker,
        originalTicker: agg.originalTicker,
        shares: parseFloat(agg.totalShares.toFixed(8)),
        avgPriceUSD: parseFloat((agg.totalCostUSD / agg.totalShares).toFixed(2)),
        avgPriceEUR: parseFloat((agg.totalCostEUR / agg.totalShares).toFixed(2)),
        avgPriceNative: parseFloat((agg.totalCostNative / agg.totalShares).toFixed(2)),
        predominantCurrency: agg.predominantCurrency,
        purchaseDate: agg.earliestDate,
        buyCount: agg.transactions.length,
        status: 'pending',
        yahooName: '',
        quoteCurrency: null // Will be set during validation
    }));
};

const ImportModal = ({ isOpen, onClose, onImport }) => {
    const { addNotification } = useNotifications();
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState(null);
    const [error, setError] = useState('');
    const [importing, setImporting] = useState(false);
    const [editingIdx, setEditingIdx] = useState(-1);
    const [editValue, setEditValue] = useState('');
    const [validating, setValidating] = useState(false);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const resetState = () => {
        setFile(null);
        setParsedData(null);
        setError('');
        setImporting(false);
        setEditingIdx(-1);
        setEditValue('');
        setValidating(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    // Validate all tickers against Yahoo Finance
    const validateTickers = async (positions) => {
        setValidating(true);
        const symbols = positions.map(p => p.ticker).join(',');
        try {
            const response = await fetchAuth(`/api/quotes?symbols=${symbols}`);
            const quotes = response.ok ? await response.json() : [];

            const updated = positions.map(p => {
                const quote = quotes.find(q => q.symbol === p.ticker);
                if (quote && quote.regularMarketPrice) {
                    return { ...p, status: 'valid', yahooName: quote.shortName || '', quoteCurrency: quote.currency || 'USD' };
                }
                return { ...p, status: 'invalid', yahooName: '' };
            });
            setParsedData(prev => ({ ...prev, positions: updated }));
        } catch (err) {
            // Mark all as pending if API fails
            console.error('Validation error:', err);
        }
        setValidating(false);
    };

    const processFile = (f) => {
        setFile(f);
        setError('');
        setParsedData(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const transactions = parseRevolutCSV(text);
                if (transactions.length === 0) {
                    setError('No BUY transactions found in this file.');
                    return;
                }
                const aggregated = aggregateByTicker(transactions);
                const data = {
                    totalTransactions: transactions.length,
                    positions: aggregated
                };
                setParsedData(data);
                // Auto-validate tickers
                validateTickers(aggregated);
            } catch (err) {
                setError(err.message || 'Failed to parse file.');
            }
        };
        reader.onerror = () => setError('Failed to read file.');
        reader.readAsText(f);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        if (e.type === 'dragleave') setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    // Remap a ticker
    const handleTickerRemap = async (idx, newTicker) => {
        const upper = newTicker.trim().toUpperCase();
        if (!upper) return;

        setEditingIdx(-1);
        const updated = [...parsedData.positions];
        updated[idx] = { ...updated[idx], ticker: upper, status: 'pending', yahooName: '' };
        setParsedData(prev => ({ ...prev, positions: updated }));

        // Validate the remapped ticker
        try {
            const response = await fetchAuth(`/api/quotes?symbols=${upper}`);
            const quotes = response.ok ? await response.json() : [];
            const quote = quotes.find(q => q.symbol === upper);
            const newUpdated = [...updated];
            if (quote && quote.regularMarketPrice) {
                newUpdated[idx] = { ...newUpdated[idx], status: 'valid', yahooName: quote.shortName || '' };
            } else {
                newUpdated[idx] = { ...newUpdated[idx], status: 'invalid', yahooName: '' };
            }
            setParsedData(prev => ({ ...prev, positions: newUpdated }));
        } catch (err) {
            console.error('Remap validation error:', err);
        }
    };

    const handleImport = async () => {
        if (!parsedData) return;
        setImporting(true);
        setError('');

        try {
            const validPositions = parsedData.positions.filter(p => p.status === 'valid');
            if (validPositions.length === 0) {
                setError('No valid tickers to import. Fix the unrecognized ones first.');
                setImporting(false);
                return;
            }

            const symbols = validPositions.map(p => p.ticker).join(',');
            const response = await fetchAuth(`/api/quotes?symbols=${symbols}`);
            const quotes = response.ok ? await response.json() : [];

            for (const pos of validPositions) {
                const quote = quotes.find(q => q.symbol === pos.ticker);
                const livePrice = quote?.regularMarketPrice || pos.avgPriceUSD;
                const prevClose = quote?.regularMarketPreviousClose || livePrice;
                const name = quote?.shortName || pos.ticker;
                const quoteCurrency = quote?.currency || 'USD';

                // Use avgPrice in the stock's quote currency for accurate PNL
                const avgPrice = quoteCurrency === 'EUR' ? pos.avgPriceEUR : pos.avgPriceUSD;

                await onImport({
                    id: pos.ticker,
                    name: name,
                    price: livePrice,
                    prevClose: prevClose,
                    shares: pos.shares,
                    avgPrice: avgPrice,
                    quoteCurrency: quoteCurrency,
                    purchaseDate: pos.purchaseDate
                });
            }

            const skipped = parsedData.positions.filter(p => p.status !== 'valid').length;
            if (skipped > 0) {
                // Don't close, show how many were skipped
                setImporting(false);
                addNotification({
                    type: 'success',
                    title: 'Partial Import Successful',
                    message: `Imported ${validPositions.length} positions. ${skipped} skipped.`
                });
                return;
            }
        } catch (err) {
            console.error('Import error:', err);
            toast.error('Import failed. Check your connection.');
            setImporting(false);
            return;
        }

        addNotification({
            type: 'success',
            title: 'Import Successful',
            message: `Successfully imported ${validCount} positions from Revolut!`
        });
        setImporting(false);
        handleClose();
    };

    const validCount = parsedData?.positions?.filter(p => p.status === 'valid').length || 0;
    const invalidCount = parsedData?.positions?.filter(p => p.status === 'invalid').length || 0;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={handleClose}><X size={20} /></button>

                <h2>Import from Revolut</h2>
                <p className="modal-subtitle">Upload your Revolut stocks CSV export to import all your positions at once.</p>

                {!parsedData ? (
                    <>
                        <div
                            className={`import-dropzone ${dragActive ? 'active' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.txt,.tsv"
                                onChange={handleFileSelect}
                                hidden
                            />
                            <Upload size={40} strokeWidth={1.5} className="import-upload-icon" />
                            <p className="import-drop-title">
                                {file ? file.name : 'Drop your CSV here'}
                            </p>
                            <p className="import-drop-sub">or click to browse</p>
                        </div>

                        {error && (
                            <div className="validation-message error" style={{ marginTop: '1rem' }}>
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}

                        <div className="import-help">
                            <div className="import-help-header">
                                <FileSpreadsheet size={18} />
                                <span>How to export from Revolut</span>
                            </div>
                            <ol className="import-help-steps">
                                <li>Open the <strong>Revolut</strong> app</li>
                                <li>Go to <strong>Stocks</strong> tab</li>
                                <li>Tap the <strong>gear icon</strong> (Settings)</li>
                                <li>Select <strong>Account Statement</strong></li>
                                <li>Choose your date range and export as <strong>CSV</strong></li>
                            </ol>
                            <p className="import-help-note">Only BUY transactions will be imported. Multiple buys of the same stock are automatically merged.</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="import-summary">
                            <div className="import-summary-stat">
                                <span className="import-stat-number">{parsedData.totalTransactions}</span>
                                <span className="import-stat-label">BUY Orders</span>
                            </div>
                            <ArrowRight size={20} className="import-arrow" />
                            <div className="import-summary-stat">
                                <span className="import-stat-number">{parsedData.positions.length}</span>
                                <span className="import-stat-label">Positions</span>
                            </div>
                            {validating && (
                                <div className="import-validating">
                                    <Loader size={16} className="spin" /> Validating...
                                </div>
                            )}
                        </div>

                        {invalidCount > 0 && (
                            <div className="import-warning">
                                <AlertCircle size={14} />
                                <span>{invalidCount} ticker{invalidCount > 1 ? 's' : ''} not recognized by Yahoo Finance. Click the <Pencil size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> icon to remap.</span>
                            </div>
                        )}

                        <div className="import-preview-list">
                            <table className="import-table">
                                <thead>
                                    <tr>
                                        <th>Status</th>
                                        <th>Ticker</th>
                                        <th>Shares</th>
                                        <th>Avg Cost</th>
                                        <th>Buys</th>
                                        <th>First Buy</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedData.positions.map((p, i) => (
                                        <tr key={i} className={p.status === 'invalid' ? 'import-row-invalid' : ''}>
                                            <td>
                                                {p.status === 'valid' && <Check size={16} className="import-status-ok" />}
                                                {p.status === 'invalid' && <AlertCircle size={16} className="import-status-err" />}
                                                {p.status === 'pending' && <Loader size={16} className="import-status-pending spin" />}
                                            </td>
                                            <td>
                                                {editingIdx === i ? (
                                                    <div className="import-edit-row">
                                                        <input
                                                            className="import-edit-input"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleTickerRemap(i, editValue);
                                                                if (e.key === 'Escape') setEditingIdx(-1);
                                                            }}
                                                            autoFocus
                                                            placeholder="Yahoo ticker..."
                                                        />
                                                        <button className="import-edit-ok" onClick={() => handleTickerRemap(i, editValue)}>
                                                            <Check size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="import-ticker-cell">
                                                        <div>
                                                            <span className="import-ticker">{p.ticker}</span>
                                                            {p.originalTicker !== p.ticker && (
                                                                <span className="import-original-ticker">Revolut: {p.originalTicker}</span>
                                                            )}
                                                            {p.yahooName && (
                                                                <span className="import-yahoo-name">{p.yahooName}</span>
                                                            )}
                                                        </div>
                                                        <button
                                                            className="import-edit-btn"
                                                            onClick={() => { setEditingIdx(i); setEditValue(p.ticker); }}
                                                            title="Change ticker symbol"
                                                        >
                                                            <Pencil size={13} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                            <td>{p.shares.toFixed(4)}</td>
                                            <td>{p.predominantCurrency === 'EUR' ? '€' : '$'}{p.avgPriceNative.toFixed(2)}</td>
                                            <td>{p.buyCount}×</td>
                                            <td className="import-date">
                                                {p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {error && (
                            <div className="validation-message error" style={{ marginBottom: '0.5rem' }}>
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}

                        <div className="import-actions">
                            <button className="btn-secondary" onClick={resetState}>← Back</button>
                            <button
                                className="btn-primary"
                                onClick={handleImport}
                                disabled={importing || validCount === 0}
                            >
                                {importing ? 'Importing...' : `Import ${validCount} Position${validCount !== 1 ? 's' : ''}`}
                                {invalidCount > 0 && !importing && ` (${invalidCount} skipped)`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ImportModal;
