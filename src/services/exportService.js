export const exportPortfolioCSV = (stocks) => {
    if (!stocks || stocks.length === 0) return;

    const headers = ['Ticker', 'Name', 'Shares', 'Avg Price', 'Current Price', 'P&L', 'P&L%', 'Market Value'];

    const rows = stocks.map(stock => {
        const avgPrice = stock.avgPrice || stock.prevClose || 0;
        const currentPrice = stock.price || 0;
        const shares = stock.shares || 0;
        const marketValue = currentPrice * shares;
        const costBasis = avgPrice * shares;
        const pnl = marketValue - costBasis;
        const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

        return [
            stock.id,
            `"${(stock.name || '').replace(/"/g, '""')}"`,
            shares.toFixed(4),
            avgPrice.toFixed(2),
            currentPrice.toFixed(2),
            pnl.toFixed(2),
            pnlPct.toFixed(2) + '%',
            marketValue.toFixed(2),
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lumina-invest-portfolio-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};
