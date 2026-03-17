import React, { useState, useEffect, useMemo } from 'react';
import { Grid3x3, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, ArrowRightLeft, Info } from 'lucide-react';
import './CorrelationMatrix.css';
import { fetchAuth } from '../services/fetchAuth';

const calculateCorrelation = (x, y) => {
    const n = Math.min(x.length, y.length);
    if (n < 5) return 0;
    const xs = x.slice(0, n);
    const ys = y.slice(0, n);

    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;

    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
        const dx = xs[i] - meanX;
        const dy = ys[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
    }

    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : num / den;
};

const calculateVolatility = (returns) => {
    if (!returns || returns.length < 2) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1);
    return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized %
};

const calculateBeta = (stockReturns, marketReturns) => {
    if (!stockReturns || !marketReturns || stockReturns.length < 5) return null;
    const n = Math.min(stockReturns.length, marketReturns.length);
    const sx = stockReturns.slice(0, n);
    const mx = marketReturns.slice(0, n);
    const meanS = sx.reduce((a, b) => a + b, 0) / n;
    const meanM = mx.reduce((a, b) => a + b, 0) / n;
    let cov = 0, varM = 0;
    for (let i = 0; i < n; i++) {
        cov += (sx[i] - meanS) * (mx[i] - meanM);
        varM += (mx[i] - meanM) ** 2;
    }
    return varM === 0 ? 0 : cov / varM;
};

const CorrelationMatrix = ({ stocks }) => {
    const [matrix, setMatrix] = useState([]);
    const [tickers, setTickers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState('3M');
    const [returnsData, setReturnsData] = useState({});
    const [hoveredCell, setHoveredCell] = useState(null);

    // Stable key: only re-fetch when the list of tickers or period changes, not on price updates
    const stockIds = stocks ? stocks.map(s => s.id).sort().join(',') : '';

    useEffect(() => {
        if (!stocks || stocks.length < 2) return;

        const symbols = stocks.map(s => s.id);
        setTickers(symbols);

        const fetchAll = async () => {
            setLoading(true);
            const returns = {};

            for (const sym of symbols) {
                try {
                    const res = await fetchAuth(`/api/historical/${sym}?range=${period}`);
                    const data = await res.json();
                    const dailyReturns = [];
                    for (let i = 1; i < data.length; i++) {
                        if (data[i].close && data[i - 1].close) {
                            dailyReturns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
                        }
                    }
                    returns[sym] = dailyReturns;
                } catch {
                    returns[sym] = [];
                }
            }

            setReturnsData(returns);

            const mat = symbols.map(s1 =>
                symbols.map(s2 => {
                    if (s1 === s2) return 1;
                    return calculateCorrelation(returns[s1] || [], returns[s2] || []);
                })
            );

            setMatrix(mat);
            setLoading(false);
        };

        fetchAll();
    }, [stockIds, period]); // eslint-disable-line react-hooks/exhaustive-deps

    // Extract pairs
    const pairs = useMemo(() => {
        if (!matrix.length || !tickers.length) return { most: [], least: [], avgCorr: 0, diversScore: 0 };

        const allPairs = [];
        for (let i = 0; i < tickers.length; i++) {
            for (let j = i + 1; j < tickers.length; j++) {
                allPairs.push({
                    a: tickers[i],
                    b: tickers[j],
                    corr: matrix[i][j]
                });
            }
        }

        allPairs.sort((a, b) => b.corr - a.corr);

        const avgCorr = allPairs.length > 0
            ? allPairs.reduce((s, p) => s + Math.abs(p.corr), 0) / allPairs.length
            : 0;

        // Diversification score: lower avg correlation = better
        const diversScore = Math.round(Math.max(0, Math.min(100, (1 - avgCorr) * 100)));

        return {
            most: allPairs.slice(0, 3),
            least: allPairs.slice(-3).reverse(),
            avgCorr,
            diversScore
        };
    }, [matrix, tickers]);

    // Volatility stats
    const volatilities = useMemo(() => {
        const vols = {};
        Object.entries(returnsData).forEach(([sym, rets]) => {
            vols[sym] = calculateVolatility(rets);
        });
        return vols;
    }, [returnsData]);

    if (!stocks || stocks.length < 2) {
        return (
            <div className="corr-matrix">
                <div className="corr-header">
                    <h4 className="corr-title"><Grid3x3 size={14} /> Correlation Matrix</h4>
                </div>
                <div className="corr-empty">Need at least 2 positions to calculate correlations</div>
            </div>
        );
    }

    const getColor = (val) => {
        if (val >= 0.7) return '#00ff41';
        if (val >= 0.3) return '#88cc44';
        if (val >= -0.3) return '#888';
        if (val >= -0.7) return '#cc6633';
        return '#ff3333';
    };

    const getBg = (val) => {
        if (val >= 0.7) return 'rgba(0, 255, 65, 0.12)';
        if (val >= 0.3) return 'rgba(0, 255, 65, 0.06)';
        if (val >= -0.3) return 'transparent';
        if (val >= -0.7) return 'rgba(255, 51, 51, 0.06)';
        return 'rgba(255, 51, 51, 0.12)';
    };

    const getCorrLabel = (val) => {
        if (val >= 0.7) return 'Strong positive';
        if (val >= 0.3) return 'Moderate positive';
        if (val >= -0.3) return 'Low / neutral';
        if (val >= -0.7) return 'Moderate inverse';
        return 'Strong inverse';
    };

    const getDiversColor = (score) => {
        if (score >= 70) return '#30D158';
        if (score >= 40) return '#FFD60A';
        return '#FF453A';
    };

    return (
        <div className="corr-matrix">
            <div className="corr-header">
                <h4 className="corr-title"><Grid3x3 size={14} /> Correlation Matrix</h4>
                <div className="corr-period-selector">
                    {['1M', '3M', '6M', '1Y'].map(p => (
                        <button
                            key={p}
                            className={`corr-period-btn ${period === p ? 'active' : ''}`}
                            onClick={() => setPeriod(p)}
                        >
                            {p}
                        </button>
                    ))}
                </div>
                <div className="corr-legend">
                    <span style={{ color: '#00ff41' }}>+1.0 Correlated</span>
                    <span style={{ color: '#888' }}>0.0 Neutral</span>
                    <span style={{ color: '#ff3333' }}>-1.0 Inverse</span>
                </div>
            </div>

            {loading ? (
                <div className="corr-loading">Calculating correlations...</div>
            ) : (
                <>
                    {/* Summary Stats Row */}
                    <div className="corr-stats-row">
                        <div className="corr-stat-card">
                            <div className="corr-stat-icon" style={{ color: getDiversColor(pairs.diversScore) }}>
                                <ShieldCheck size={18} />
                            </div>
                            <div className="corr-stat-info">
                                <span className="corr-stat-value" style={{ color: getDiversColor(pairs.diversScore) }}>
                                    {pairs.diversScore}/100
                                </span>
                                <span className="corr-stat-label">Diversification Score</span>
                            </div>
                        </div>
                        <div className="corr-stat-card">
                            <div className="corr-stat-icon" style={{ color: '#ff9900' }}>
                                <ArrowRightLeft size={18} />
                            </div>
                            <div className="corr-stat-info">
                                <span className="corr-stat-value">{pairs.avgCorr.toFixed(2)}</span>
                                <span className="corr-stat-label">Avg |Correlation|</span>
                            </div>
                        </div>
                        <div className="corr-stat-card">
                            <div className="corr-stat-icon" style={{ color: '#5E5CE6' }}>
                                <Grid3x3 size={18} />
                            </div>
                            <div className="corr-stat-info">
                                <span className="corr-stat-value">{tickers.length * (tickers.length - 1) / 2}</span>
                                <span className="corr-stat-label">Pairs Analyzed</span>
                            </div>
                        </div>
                    </div>

                    {/* Top Pairs */}
                    <div className="corr-pairs-row">
                        <div className="corr-pairs-card">
                            <h5 className="corr-pairs-title">
                                <TrendingUp size={14} style={{ color: '#00ff41' }} /> Most Correlated
                            </h5>
                            {pairs.most.map((p, i) => (
                                <div key={i} className="corr-pair-item">
                                    <span className="corr-pair-names">{p.a} — {p.b}</span>
                                    <span className="corr-pair-value" style={{ color: getColor(p.corr) }}>
                                        {p.corr.toFixed(3)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="corr-pairs-card">
                            <h5 className="corr-pairs-title">
                                <TrendingDown size={14} style={{ color: '#ff3333' }} /> Least Correlated
                            </h5>
                            {pairs.least.map((p, i) => (
                                <div key={i} className="corr-pair-item">
                                    <span className="corr-pair-names">{p.a} — {p.b}</span>
                                    <span className="corr-pair-value" style={{ color: getColor(p.corr) }}>
                                        {p.corr.toFixed(3)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="corr-pairs-card">
                            <h5 className="corr-pairs-title">
                                <AlertTriangle size={14} style={{ color: '#FFD60A' }} /> Volatility (Ann.)
                            </h5>
                            {Object.entries(volatilities)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([sym, vol], i) => (
                                    <div key={i} className="corr-pair-item">
                                        <span className="corr-pair-names">{sym}</span>
                                        <span className="corr-pair-value" style={{ color: vol > 40 ? '#FF453A' : vol > 25 ? '#FFD60A' : '#30D158' }}>
                                            {vol.toFixed(1)}%
                                        </span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>

                    {/* Matrix Table */}
                    <div className="corr-table-wrapper">
                        <table className="corr-table">
                            <thead>
                                <tr>
                                    <th></th>
                                    {tickers.map(t => <th key={t}>{t}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {tickers.map((t1, i) => (
                                    <tr key={t1}>
                                        <td className="corr-row-label">{t1}</td>
                                        {tickers.map((t2, j) => {
                                            const val = matrix[i]?.[j] || 0;
                                            const isHovered = hoveredCell?.i === i && hoveredCell?.j === j;
                                            return (
                                                <td
                                                    key={t2}
                                                    className={`corr-cell ${isHovered ? 'corr-cell-hovered' : ''}`}
                                                    style={{
                                                        color: getColor(val),
                                                        background: getBg(val),
                                                    }}
                                                    onMouseEnter={() => i !== j && setHoveredCell({ i, j, t1, t2, val })}
                                                    onMouseLeave={() => setHoveredCell(null)}
                                                >
                                                    {val === 1 ? '1.00' : val.toFixed(2)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Hover tooltip info */}
                    {hoveredCell && (
                        <div className="corr-tooltip-bar">
                            <Info size={14} />
                            <span>
                                <strong>{hoveredCell.t1}</strong> vs <strong>{hoveredCell.t2}</strong>: {hoveredCell.val.toFixed(3)} — {getCorrLabel(hoveredCell.val)}
                                {hoveredCell.val > 0.7 && ' (these assets tend to move together, less diversification benefit)'}
                                {hoveredCell.val < -0.3 && ' (these assets move inversely, good for hedging)'}
                                {hoveredCell.val >= -0.3 && hoveredCell.val <= 0.3 && ' (low correlation, good diversification pair)'}
                            </span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CorrelationMatrix;
