import React from 'react';
import { Shield, AlertTriangle, TrendingUp, TrendingDown, Lightbulb, PieChart, Activity, Clock, Zap, Target } from 'lucide-react';
import './Insights.css';

// Compute a diversification score from 0-100
const calcDiversificationScore = (stocks) => {
    if (!stocks || stocks.length === 0) return 0;
    if (stocks.length === 1) return 15;

    const totalValue = stocks.reduce((a, s) => a + s.price * s.shares, 0);
    if (totalValue === 0) return 0;

    // Use Herfindahl-Hirschman Index (HHI) — lower = more diversified
    const hhi = stocks.reduce((a, s) => {
        const weight = (s.price * s.shares) / totalValue;
        return a + weight * weight;
    }, 0);

    // HHI ranges from 1/n (perfectly diversified) to 1 (single stock)
    // Convert to 0-100 score where 100 = perfectly diversified
    const n = stocks.length;
    const minHHI = 1 / n;
    const normalized = 1 - (hhi - minHHI) / (1 - minHHI + 0.001);
    const baseScore = Math.round(normalized * 70) + (n >= 5 ? 30 : n >= 3 ? 20 : 10);
    return Math.min(100, Math.max(0, baseScore));
};

const getScoreColor = (score) => {
    if (score >= 75) return '#30D158';
    if (score >= 50) return '#FFD60A';
    if (score >= 25) return '#FF9F0A';
    return '#FF453A';
};

const getScoreLabel = (score) => {
    if (score >= 75) return 'Excellent';
    if (score >= 50) return 'Good';
    if (score >= 25) return 'Fair';
    return 'Poor';
};

// Generate smart alerts based on portfolio state
const generateAlerts = (stocks) => {
    const alerts = [];
    if (!stocks || stocks.length === 0) return alerts;

    const totalValue = stocks.reduce((a, s) => a + s.price * s.shares, 0);

    // Check concentration risk
    stocks.forEach(s => {
        const weight = (s.price * s.shares) / totalValue * 100;
        if (weight > 50) {
            alerts.push({
                type: 'warning',
                icon: AlertTriangle,
                title: `High Concentration: ${s.id}`,
                desc: `${s.id} represents ${weight.toFixed(1)}% of your portfolio. Consider diversifying to reduce risk.`
            });
        }
    });

    // Check PNL alerts
    stocks.forEach(s => {
        const cost = (s.avgPrice || s.prevClose);
        const pnlPct = cost > 0 ? ((s.price - cost) / cost) * 100 : 0;
        if (pnlPct > 50) {
            alerts.push({
                type: 'success',
                icon: TrendingUp,
                title: `Strong Gainer: ${s.id}`,
                desc: `${s.id} is up ${pnlPct.toFixed(1)}% from your cost basis. Consider taking partial profits.`
            });
        }
        if (pnlPct < -20) {
            alerts.push({
                type: 'danger',
                icon: TrendingDown,
                title: `Significant Loss: ${s.id}`,
                desc: `${s.id} is down ${Math.abs(pnlPct).toFixed(1)}% from your cost basis. Review your thesis.`
            });
        }
    });

    // Portfolio size recommendation
    if (stocks.length < 3) {
        alerts.push({
            type: 'info',
            icon: Lightbulb,
            title: 'Diversification Tip',
            desc: `You only hold ${stocks.length} position${stocks.length > 1 ? 's' : ''}. Consider adding more stocks across different sectors.`
        });
    }

    if (stocks.length >= 5) {
        alerts.push({
            type: 'success',
            icon: Shield,
            title: 'Well Diversified',
            desc: `You hold ${stocks.length} positions. Your portfolio has good diversification.`
        });
    }

    return alerts;
};

// Generate recommendations
const generateRecommendations = (stocks) => {
    const recs = [];
    if (!stocks || stocks.length === 0) {
        recs.push({
            icon: Target,
            title: 'Start Building Your Portfolio',
            desc: 'Add your first position to begin tracking your investments and receiving personalized insights.'
        });
        return recs;
    }

    const totalValue = stocks.reduce((a, s) => a + s.price * s.shares, 0);
    const totalInvested = stocks.reduce((a, s) => a + (s.avgPrice || s.prevClose) * s.shares, 0);
    const totalReturn = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;

    if (totalReturn > 20) {
        recs.push({
            icon: Zap,
            title: 'Consider Rebalancing',
            desc: `Your portfolio is up ${totalReturn.toFixed(1)}% overall. Consider rebalancing your winners to lock in gains.`
        });
    }

    // Check holding period
    const now = new Date();
    stocks.forEach(s => {
        if (s.purchaseDate) {
            const purchased = new Date(s.purchaseDate);
            const daysHeld = Math.floor((now - purchased) / (1000 * 60 * 60 * 24));
            if (daysHeld > 365) {
                recs.push({
                    icon: Clock,
                    title: `Long-Term Holder: ${s.id}`,
                    desc: `You've held ${s.id} for ${daysHeld} days. Long-term holdings may qualify for favorable tax treatment.`
                });
            }
        }
    });

    // Always add a general tip
    recs.push({
        icon: Activity,
        title: 'Regular Monitoring',
        desc: 'Check your portfolio weekly. Set price alerts for significant moves and review your allocation quarterly.'
    });

    return recs;
};

const Insights = ({ stocks }) => {
    const score = calcDiversificationScore(stocks);
    const scoreColor = getScoreColor(score);
    const scoreLabel = getScoreLabel(score);
    const alerts = generateAlerts(stocks);
    const recommendations = generateRecommendations(stocks);

    const totalValue = stocks ? stocks.reduce((a, s) => a + s.price * s.shares, 0) : 0;
    const totalInvested = stocks ? stocks.reduce((a, s) => a + (s.avgPrice || s.prevClose) * s.shares, 0) : 0;
    const totalPnl = totalValue - totalInvested;
    const numPositions = stocks ? stocks.length : 0;

    // Find largest position
    let largestPos = null;
    if (stocks && stocks.length > 0) {
        largestPos = stocks.reduce((max, s) =>
            (s.price * s.shares) > (max.price * max.shares) ? s : max, stocks[0]);
    }

    if (!stocks || stocks.length === 0) {
        return (
            <div className="insights-page fade-in">
                <div className="glass-panel insights-empty">
                    <Lightbulb size={48} strokeWidth={1.5} />
                    <h3>No Insights Yet</h3>
                    <p>Add positions to your portfolio to receive personalized insights, risk analysis, and smart recommendations.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="insights-page fade-in">
            {/* Diversification Score + Quick Stats */}
            <div className="insights-top-grid">
                {/* Score Card */}
                <div className="glass-panel score-card">
                    <h3 className="insights-section-title">
                        <Shield size={18} /> Portfolio Health
                    </h3>
                    <div className="score-ring-container">
                        <svg viewBox="0 0 120 120" className="score-ring">
                            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                            <circle
                                cx="60" cy="60" r="52"
                                fill="none"
                                stroke={scoreColor}
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray={`${score * 3.267} 326.7`}
                                transform="rotate(-90 60 60)"
                                style={{ transition: 'stroke-dasharray 1s ease' }}
                            />
                        </svg>
                        <div className="score-inner">
                            <span className="score-number" style={{ color: scoreColor }}>{score}</span>
                            <span className="score-label">{scoreLabel}</span>
                        </div>
                    </div>
                    <div className="score-details">
                        <div className="score-detail-item">
                            <span className="score-detail-label">Positions</span>
                            <span className="score-detail-value">{numPositions}</span>
                        </div>
                        <div className="score-detail-item">
                            <span className="score-detail-label">Largest</span>
                            <span className="score-detail-value">{largestPos ? largestPos.id : '—'}</span>
                        </div>
                        <div className="score-detail-item">
                            <span className="score-detail-label">Total PNL</span>
                            <span className={`score-detail-value ${totalPnl >= 0 ? 'text-up' : 'text-down'}`}>
                                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(0)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Alerts Column */}
                <div className="glass-panel alerts-card">
                    <h3 className="insights-section-title">
                        <AlertTriangle size={18} /> Smart Alerts
                    </h3>
                    <div className="alerts-list">
                        {alerts.length === 0 ? (
                            <div className="no-alerts">
                                <Shield size={32} />
                                <p>All clear! No alerts at this time.</p>
                            </div>
                        ) : (
                            alerts.map((alert, i) => (
                                <div key={i} className={`alert-item alert-${alert.type}`}>
                                    <div className={`alert-icon-wrapper alert-icon-${alert.type}`}>
                                        <alert.icon size={16} />
                                    </div>
                                    <div className="alert-content">
                                        <span className="alert-title">{alert.title}</span>
                                        <span className="alert-desc">{alert.desc}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            <div className="glass-panel recs-card">
                <h3 className="insights-section-title">
                    <Lightbulb size={18} /> Recommendations
                </h3>
                <div className="recs-grid">
                    {recommendations.map((rec, i) => (
                        <div key={i} className="rec-item">
                            <div className="rec-icon-wrapper">
                                <rec.icon size={20} />
                            </div>
                            <div className="rec-content">
                                <span className="rec-title">{rec.title}</span>
                                <span className="rec-desc">{rec.desc}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Position Breakdown (mini horizontal bars) */}
            <div className="glass-panel breakdown-card">
                <h3 className="insights-section-title">
                    <PieChart size={18} /> Allocation Breakdown
                </h3>
                <div className="breakdown-bars">
                    {stocks.map((s, i) => {
                        const weight = totalValue > 0 ? (s.price * s.shares) / totalValue * 100 : 0;
                        const colors = ['#0A84FF', '#5E5CE6', '#30D158', '#FF9F0A', '#FF453A', '#BF5AF2', '#64D2FF', '#FFD60A'];
                        return (
                            <div key={s.id} className="breakdown-row">
                                <div className="breakdown-label">
                                    <span className="breakdown-dot" style={{ background: colors[i % colors.length] }}></span>
                                    <span className="breakdown-ticker">{s.id}</span>
                                    <span className="breakdown-pct">{weight.toFixed(1)}%</span>
                                </div>
                                <div className="breakdown-bar-track">
                                    <div
                                        className="breakdown-bar-fill"
                                        style={{
                                            width: `${weight}%`,
                                            background: colors[i % colors.length],
                                            transition: 'width 0.8s ease'
                                        }}
                                    ></div>
                                </div>
                                <span className="breakdown-value">${(s.price * s.shares).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Insights;
