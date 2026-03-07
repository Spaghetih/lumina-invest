import React, { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();

export const useCurrency = () => useContext(CurrencyContext);

export const CurrencyProvider = ({ children }) => {
    const [currency, setCurrency] = useState(localStorage.getItem('preferredCurrency') || 'EUR');
    const [fxRate, setFxRate] = useState(parseFloat(localStorage.getItem('fxRate')) || 1.08);
    const [hideBalances, setHideBalances] = useState(localStorage.getItem('hideBalances') === 'true');
    // fxRate = EURUSD rate, i.e. 1 EUR = fxRate USD (e.g. 1.08)

    useEffect(() => {
        const fetchRate = async () => {
            try {
                const res = await fetch('http://localhost:3001/api/fx');
                const data = await res.json();
                if (data.rate) {
                    setFxRate(data.rate);
                    localStorage.setItem('fxRate', data.rate.toString());
                }
            } catch (err) {
                console.error('FX rate fetch failed:', err);
            }
        };
        fetchRate();
        const interval = setInterval(fetchRate, 300000);
        return () => clearInterval(interval);
    }, []);

    const toggleCurrency = () => {
        const next = currency === 'EUR' ? 'USD' : 'EUR';
        setCurrency(next);
        localStorage.setItem('preferredCurrency', next);
    };

    const toggleHideBalances = () => {
        const next = !hideBalances;
        setHideBalances(next);
        localStorage.setItem('hideBalances', next.toString());
    };

    // Convert a value from its source currency to the display currency
    // fromCurrency: the currency of the input value ('USD' or 'EUR')
    const convertFrom = (value, fromCurrency = 'USD') => {
        if (!value || isNaN(value)) return 0;
        if (!fromCurrency || fromCurrency === currency) return value;
        // fromCurrency differs from display currency, convert
        if (fromCurrency === 'USD' && currency === 'EUR') return value / fxRate;
        if (fromCurrency === 'EUR' && currency === 'USD') return value * fxRate;
        return value;
    };

    // Convert a value from its source currency to USD (for internal normalization)
    const toUSD = (value, fromCurrency = 'USD') => {
        if (!value || isNaN(value)) return 0;
        if (fromCurrency === 'USD') return value;
        if (fromCurrency === 'EUR') return value * fxRate;
        return value;
    };

    // Format a value for display, converting from its source currency
    const format = (value, fromCurrency = 'USD', decimals = 2) => {
        if (hideBalances) return '•••••';
        const converted = convertFrom(value, fromCurrency);
        const sym = currency === 'EUR' ? '€' : '$';
        return `${sym}${converted.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    };

    const symbol = currency === 'EUR' ? '€' : '$';

    return (
        <CurrencyContext.Provider value={{ currency, fxRate, toggleCurrency, convertFrom, toUSD, format, symbol, hideBalances, toggleHideBalances }}>
            {children}
        </CurrencyContext.Provider>
    );
};
