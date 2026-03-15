import React, { useMemo } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import './Heatmap.css';

const interpolateColor = (pct) => {
    // Clamp between -5 and +5 for color mapping
    const clamped = Math.max(-5, Math.min(5, pct));
    const t = (clamped + 5) / 10; // 0 = deep red, 0.5 = neutral, 1 = deep green

    if (t < 0.5) {
        // Red to dark gray
        const r = Math.round(255 * (1 - t * 2) + 60 * (t * 2));
        const g = Math.round(20 * (1 - t * 2) + 60 * (t * 2));
        const b = Math.round(20 * (1 - t * 2) + 60 * (t * 2));
        return `rgb(${r}, ${g}, ${b})`;
    } else {
        // Dark gray to green
        const factor = (t - 0.5) * 2;
        const r = Math.round(60 * (1 - factor) + 0 * factor);
        const g = Math.round(60 * (1 - factor) + 200 * factor);
        const b = Math.round(60 * (1 - factor) + 65 * factor);
        return `rgb(${r}, ${g}, ${b})`;
    }
};

const HeatmapContent = (props) => {
    const { x, y, width, height, name, changePct } = props;

    if (width < 2 || height < 2) return null;

    const fill = interpolateColor(changePct || 0);
    const showLabel = width > 30 && height > 20;
    const showPct = width > 40 && height > 38;

    // Generous font sizes that scale with cell dimensions
    const tickerSize = Math.max(14, Math.min(26, width / 3.5, height / 2.5));
    const pctSize = Math.max(12, Math.min(20, width / 4.5, height / 3.5));
    const centerY = y + height / 2;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={fill}
                stroke="#000"
                strokeWidth={2}
                rx={2}
                ry={2}
            />
            {showLabel && (
                <text
                    x={x + width / 2}
                    y={centerY - (showPct ? pctSize * 0.7 : 0)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                    fontSize={tickerSize}
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="800"
                    paintOrder="stroke"
                    stroke="#000000"
                    strokeWidth={3}
                    style={{ textShadow: '0 0 6px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)' }}
                >
                    {name}
                </text>
            )}
            {showPct && (
                <text
                    x={x + width / 2}
                    y={centerY + tickerSize * 0.7}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                    fontSize={pctSize}
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="700"
                    paintOrder="stroke"
                    stroke="#000000"
                    strokeWidth={3}
                    style={{ textShadow: '0 0 6px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)' }}
                >
                    {changePct >= 0 ? '+' : ''}{changePct?.toFixed(2)}%
                </text>
            )}
        </g>
    );
};

const HeatmapTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="hm-tooltip">
                <p className="hm-tooltip-name">{data.fullName}</p>
                <div className="hm-tooltip-row">
                    <span>Ticker</span>
                    <span>{data.name}</span>
                </div>
                <div className="hm-tooltip-row">
                    <span>Price</span>
                    <span>${data.price?.toFixed(2)}</span>
                </div>
                <div className="hm-tooltip-row">
                    <span>Change</span>
                    <span className={data.changePct >= 0 ? 'hm-up' : 'hm-down'}>
                        {data.changePct >= 0 ? '+' : ''}{data.changePct?.toFixed(2)}%
                    </span>
                </div>
                <div className="hm-tooltip-row">
                    <span>Value</span>
                    <span>${data.size?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            </div>
        );
    }
    return null;
};

const Heatmap = ({ stocks = [] }) => {
    const treeData = useMemo(() => {
        if (!stocks || stocks.length === 0) return [];

        return stocks.map(stock => {
            const marketValue = stock.price * (stock.shares || 0);
            const changePct = stock.prevClose > 0
                ? ((stock.price - stock.prevClose) / stock.prevClose) * 100
                : 0;

            return {
                name: stock.id,
                fullName: stock.name || stock.id,
                size: Math.max(marketValue, 1), // Treemap needs positive values
                changePct,
                price: stock.price,
                shares: stock.shares,
            };
        });
    }, [stocks]);

    if (!stocks || stocks.length === 0) {
        return (
            <div className="heatmap-container">
                <div className="hm-header">
                    <h3 className="hm-title">Portfolio Heatmap</h3>
                </div>
                <div className="hm-empty">No positions to display</div>
            </div>
        );
    }

    return (
        <div className="heatmap-container">
            <div className="hm-header">
                <h3 className="hm-title">Portfolio Heatmap</h3>
                <div className="hm-legend-bar">
                    <span className="hm-legend-label">-5%</span>
                    <div className="hm-gradient"></div>
                    <span className="hm-legend-label">+5%</span>
                </div>
            </div>
            <div className="hm-chart-wrapper">
                <ResponsiveContainer width="100%" height={360}>
                    <Treemap
                        data={treeData}
                        dataKey="size"
                        aspectRatio={4 / 3}
                        stroke="#111"
                        content={<HeatmapContent />}
                        animationDuration={400}
                    >
                        <Tooltip content={<HeatmapTooltip />} />
                    </Treemap>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default Heatmap;
