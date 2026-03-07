// Mock Data Service for Stock Dashboard

const DEFAULT_STOCKS = [];

export const loadPortfolio = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/portfolio');
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem('lumina_portfolio', JSON.stringify(data));
        return data;
      }
    }
  } catch (e) {
    console.error("Failed to load portfolio from backend", e);
  }

  const saved = localStorage.getItem('lumina_portfolio');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse saved portfolio", e);
    }
  }
  return DEFAULT_STOCKS;
};

export const savePortfolio = async (stocks) => {
  localStorage.setItem('lumina_portfolio', JSON.stringify(stocks));
  try {
    await fetch('http://localhost:3001/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stocks)
    });
  } catch (e) {
    console.error("Failed to save portfolio to backend", e);
  }
};

export const generateHistoricalData = (initialBalance = 0, todayPnl = 0, stocks = []) => {
  const data = [];
  let balance = initialBalance;
  const prevCloseBalance = balance - todayPnl;

  let earliestDate = null;
  if (stocks && stocks.length > 0) {
    stocks.forEach(s => {
      if (s.purchaseDate) {
        const d = new Date(s.purchaseDate);
        d.setHours(0, 0, 0, 0);
        if (!earliestDate || d < earliestDate) earliestDate = d;
      }
    });
  }

  for (let i = 0; i <= 365; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    let currentPointBalance = balance;
    if (!stocks || stocks.length === 0 || (earliestDate && date < earliestDate)) {
      currentPointBalance = 0;
    }

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      balance: currentPointBalance,
    });

    if (i === 0) {
      balance = prevCloseBalance;
    } else {
      if (balance > 0) {
        // Deterministic pseudo-random generation based on the day index
        // This ensures the chart shape and ATH remain stable across page reloads
        const pseudoRandom = (Math.sin(i * 12.9898) * 43758.5453) % 1;
        const normalizedRandom = Math.abs(pseudoRandom);
        const change = ((normalizedRandom * 0.031) - 0.015);
        balance = Math.max(0, balance / (1 + change));
      } else {
        balance = 0;
      }
    }
  }
  return data.reverse();
};

// Start live price updates simulation / API fetching
export const subscribeToMarketUpdates = (stocks, callback) => {
  const fetchQuotes = async () => {
    try {
      const symbols = stocks.map(s => s.id).join(',');
      const response = await fetch(`http://localhost:3001/api/quotes?symbols=${symbols}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();

      const updatedStocks = stocks.map(stock => {
        const quote = data.find(q => q.symbol === stock.id);
        if (!quote) return stock;

        const newPrice = quote.regularMarketPrice || stock.price;
        const direction = newPrice > stock.price ? 'up' : newPrice < stock.price ? 'down' : null;

        return {
          ...stock,
          name: quote.shortName || stock.name,
          price: newPrice,
          prevClose: quote.regularMarketPreviousClose || stock.prevClose,
          quoteCurrency: quote.currency || stock.quoteCurrency || 'USD',  // Track the stock's native currency
          avgPrice: stock.avgPrice,
          purchaseDate: stock.purchaseDate,
          lastUpdated: Date.now(),
          direction
        };
      });
      callback(updatedStocks);
    } catch (error) {
      console.error("Error fetching live quotes:", error);
    }
  };

  fetchQuotes();
  const interval = setInterval(fetchQuotes, 5000);

  return () => clearInterval(interval);
};

// Get the current FX rate (EURUSD) - used for normalization in metrics
const getFxRate = () => {
  return parseFloat(localStorage.getItem('fxRate')) || 1.08;
};

// Normalize a value from its native currency to EUR (our base for comparison with Revolut)
const toEUR = (value, fromCurrency, fxRate) => {
  if (fromCurrency === 'EUR') return value;
  if (fromCurrency === 'USD') return value / fxRate;
  return value;
};

// Calculate Portfolio Metrics
// All internal calculations normalize to EUR to avoid currency mixing
export const calculatePortfolioMetrics = (stocks) => {
  const fxRate = getFxRate();
  let totalBalanceEUR = 0;
  let todayPnlEUR = 0;
  let totalInvestedEUR = 0;

  stocks.forEach(stock => {
    const qc = stock.quoteCurrency || 'USD';
    // price, prevClose, avgPrice are all in the stock's quoteCurrency
    const currentVal = stock.price * stock.shares;
    const prevCloseVal = stock.prevClose * stock.shares;
    const investedVal = (stock.avgPrice || stock.prevClose) * stock.shares;

    // Normalize everything to EUR
    totalBalanceEUR += toEUR(currentVal, qc, fxRate);
    todayPnlEUR += toEUR(currentVal - prevCloseVal, qc, fxRate);
    totalInvestedEUR += toEUR(investedVal, qc, fxRate);
  });

  return {
    totalBalance: totalBalanceEUR,
    totalInvested: totalInvestedEUR,
    todayPnl: todayPnlEUR,
    todayPnlPercent: totalBalanceEUR > 0 ? (todayPnlEUR / (totalBalanceEUR - todayPnlEUR)) * 100 : 0,
    totalPnl: totalBalanceEUR - totalInvestedEUR,
    totalPnlPercent: totalInvestedEUR > 0 ? ((totalBalanceEUR - totalInvestedEUR) / totalInvestedEUR) * 100 : 0,
    baseCurrency: 'EUR'  // Metrics are always in EUR internally
  };
};
