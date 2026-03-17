import React, { useState, useEffect } from 'react';
import { Grid3x3 } from 'lucide-react';
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

const CorrelationMatrix = ({ stocks }) => {
    const [matrix, setMatrix] = useState([]);
    const [tickers, setTickers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!stocks || stocks.length < 2) return;

        const symbols = stocks.map(s => s.id);
        setTickers(symbols);

        const fetchAll = async () => {
            setLoading(true);
            const returns = {};

            for (const sym of symbols) {
                try {
                    const res = await fetchAuth(`/api/historical/${sym}?range=3M`);
                    const data = await res.json();
                    // Calculate daily returns
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

            // Build correlation matrix
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
    }, [stocks]);

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

    return (
        <div className="corr-matrix">
            <div className="corr-header">
                <h4 className="corr-title"><Grid3x3 size={14} /> Correlation Matrix (3M)</h4>
                <div className="corr-legend">
                    <span style={{ color: '#00ff41' }}>+1.0 Correlated</span>
                    <span style={{ color: '#888' }}>0.0 Neutral</span>
                    <span style={{ color: '#ff3333' }}>-1.0 Inverse</span>
                </div>
            </div>

            {loading ? (
                <div className="corr-loading">Calculating correlations...</div>
            ) : (
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
                                        return (
                                            <td
                                                key={t2}
                                                className="corr-cell"
                                                style={{
                                                    color: getColor(val),
                                                    background: getBg(val),
                                                }}
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
            )}
        </div>
    );
};

export default CorrelationMatrix;
