import React, { useState, useEffect } from 'react';
import DashboardLayout from './components/DashboardLayout';
import PortfolioSummary from './components/PortfolioSummary';
import LiveStockList from './components/LiveStockList';
import PerformanceChart from './components/PerformanceChart';
import AddStockModal from './components/AddStockModal';
import PortfolioAnalysis from './components/PortfolioAnalysis';
import Insights from './components/Insights';
import DividendCalendar from './components/DividendCalendar';
import ImportModal from './components/ImportModal';
import Settings from './components/Settings';
import AIAssistant from './components/AIAssistant';
import { loadPortfolio, savePortfolio, subscribeToMarketUpdates, calculatePortfolioMetrics, generateHistoricalData } from './services/mockData';

function App() {
  const [stocks, setStocks] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [historicalData, setHistoricalData] = useState([]);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [timeframe, setTimeframe] = useState('1M');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [initialSearchTicker, setInitialSearchTicker] = useState('');
  const [stockVersion, setStockVersion] = useState(0); // bumped on every portfolio change to force re-subscription

  const handleSearch = (query) => {
    setInitialSearchTicker(query.toUpperCase());
    setIsAddModalOpen(true);
  };

  useEffect(() => {
    const initPortfolio = async () => {
      const data = await loadPortfolio();
      setStocks(data);
      setIsLoaded(true);
    };
    initPortfolio();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // Generate initial chart data tied to the actual initial stock amounts
    const initialMetrics = calculatePortfolioMetrics(stocks);
    setHistoricalData(generateHistoricalData(initialMetrics.totalBalance, initialMetrics.todayPnl, stocks));

    // Subscribe to live price ticks
    const unsubscribe = subscribeToMarketUpdates(stocks, (updatedStocks) => {
      setStocks(updatedStocks);

      const liveMetrics = calculatePortfolioMetrics(updatedStocks);

      // Update the very last point of the historical chart to tick in real-time
      setHistoricalData(prevData => {
        if (prevData.length === 0) return prevData;
        const newData = [...prevData];
        newData[newData.length - 1] = {
          ...newData[newData.length - 1],
          balance: liveMetrics.totalBalance
        };
        return newData;
      });
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockVersion, isLoaded]); // Re-run subscription when portfolio changes or data loads

  const handleAddStock = (newStock) => {
    setStocks(prevStocks => {
      // Merge if exists, else add
      const existingIdx = prevStocks.findIndex(s => s.id === newStock.id);
      let updatedStocks;

      if (existingIdx >= 0) {
        updatedStocks = [...prevStocks];
        const existing = updatedStocks[existingIdx];
        const totalShares = existing.shares + newStock.shares;

        const prevTotalValue = existing.shares * (existing.avgPrice || existing.prevClose);
        const newAddValue = newStock.shares * (newStock.avgPrice || newStock.prevClose);
        const newAvgCost = (prevTotalValue + newAddValue) / totalShares;

        let mergedDate = existing.purchaseDate;
        if (existing.purchaseDate && newStock.purchaseDate && existing.purchaseDate !== newStock.purchaseDate) {
          const d1 = new Date(existing.purchaseDate).getTime();
          const d2 = new Date(newStock.purchaseDate).getTime();
          const weightedTime = ((d1 * existing.shares) + (d2 * newStock.shares)) / totalShares;
          mergedDate = new Date(weightedTime).toISOString().split('T')[0];
        }

        updatedStocks[existingIdx] = {
          ...existing,
          shares: totalShares,
          avgPrice: newAvgCost,
          price: newStock.price || existing.price,
          prevClose: newStock.prevClose || existing.prevClose,
          name: newStock.name || existing.name,
          quoteCurrency: newStock.quoteCurrency || existing.quoteCurrency || 'USD',
          purchaseDate: mergedDate || existing.purchaseDate
        };
      } else {
        updatedStocks = [...prevStocks, newStock];
      }

      // Save and update chart outside the state updater
      setTimeout(() => {
        savePortfolio(updatedStocks);
        const newMetrics = calculatePortfolioMetrics(updatedStocks);
        setHistoricalData(generateHistoricalData(newMetrics.totalBalance, newMetrics.todayPnl, updatedStocks));
      }, 0);

      return updatedStocks;
    });
    setStockVersion(v => v + 1);
  };

  const handleDeleteStock = (id) => {
    const updatedStocks = stocks.filter(s => s.id !== id);
    setStocks(updatedStocks);
    savePortfolio(updatedStocks);
    setStockVersion(v => v + 1); // force re-subscription with fresh data

    // Auto-update historical chart math
    const newMetrics = calculatePortfolioMetrics(updatedStocks);
    setHistoricalData(generateHistoricalData(newMetrics.totalBalance, newMetrics.todayPnl, updatedStocks));
  };

  const metrics = calculatePortfolioMetrics(stocks);

  if (!isLoaded) {
    return (
      <div className="app-loader fade-in">
        <div className="spinner"></div>
        <p style={{ fontWeight: 500, color: 'var(--text-secondary)', marginTop: '8px' }}>Optimizing Portfolio...</p>
      </div>
    );
  }

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onAddPositionClick={() => {
        setInitialSearchTicker(''); // Reset prefill
        setIsAddModalOpen(true);
      }}
      onImportClick={() => setIsImportModalOpen(true)}
      onSearch={handleSearch}
    >
      {activeTab === 'Dashboard' && (
        <div className="dashboard-content fade-in">
          <PortfolioSummary metrics={metrics} historicalData={historicalData} />

          <div className="main-grid">
            <div className="chart-container glass-panel">
              <PerformanceChart
                data={historicalData}
                activeTimeframe={timeframe}
                onTimeframeChange={setTimeframe}
                metrics={metrics}
              />
            </div>
            <div className="live-list-container glass-panel">
              <LiveStockList stocks={stocks} onDeleteStock={handleDeleteStock} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Markets' && (
        <div className="fade-in">
          <h2>Live Markets</h2>
          <div className="glass-panel" style={{ marginTop: '1rem', padding: '1rem' }}>
            <LiveStockList stocks={stocks} onDeleteStock={handleDeleteStock} />
          </div>
        </div>
      )}

      {activeTab === 'Portfolio' && (
        <div className="fade-in">
          <PortfolioAnalysis stocks={stocks} />
        </div>
      )}

      {activeTab === 'Insights' && (
        <div className="fade-in">
          <Insights stocks={stocks} />
        </div>
      )}

      {activeTab === 'Dividends' && (
        <div className="fade-in">
          <DividendCalendar stocks={stocks} />
        </div>
      )}

      {activeTab === 'Settings' && (
        <div className="fade-in">
          <Settings
            stocks={stocks}
            onImportClick={() => setIsImportModalOpen(true)}
            onClearData={() => setStocks([])}
          />
        </div>
      )}

      {activeTab === 'AI' && (
        <div className="fade-in">
          <AIAssistant stocks={stocks} />
        </div>
      )}

      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddStock}
        initialTicker={initialSearchTicker}
      />
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleAddStock}
      />
    </DashboardLayout>
  );
}

export default App;
