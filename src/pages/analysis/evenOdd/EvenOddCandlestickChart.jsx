import React, { useEffect, useState } from 'react';
import { Card, Typography, Alert, Button, Select, Spin } from 'antd';
import Chart from 'react-apexcharts';
import PropTypes from 'prop-types';

const { Text } = Typography;
const { Option } = Select;

const symbolPriceRanges = {
  'R_10': { min: 6000, max: 7000 },
  '1HZ10V': { min: 9000, max: 9200 },
  'R_25': { min: 7000, max: 8000 },
  '1HZ25V': { min: 6900, max: 8100 },
  'R_50': { min: 8000, max: 9000 },
  '1HZ50V': { min: 7900, max: 9100 },
  'R_75': { min: 9000, max: 10000 },
  '1HZ75V': { min: 8900, max: 10100 },
  'R_100': { min: 10000, max: 11000 },
  '1HZ100V': { min: 9000, max: 11100 },
};

const CandlestickChart = ({ ticks, simpleMode, symbol }) => {
  const [chartError, setChartError] = useState(null);
  const [series, setSeries] = useState([]);
  const [intervalSeconds, setIntervalSeconds] = useState(10);
  const [lastSymbol, setLastSymbol] = useState(symbol);
  const [isLoading, setIsLoading] = useState(false);

  const [chartOptions, setChartOptions] = useState({
    chart: {
      type: 'candlestick',
      height: 400,
      zoom: { enabled: true },
      toolbar: { show: true },
      events: {
        mounted: (chart) => {
          if (series.length > 0 && series[0].data.length > 0) {
            const lastCandleTime = series[0].data[series[0].data.length - 1].x;
            chart.zoomX(lastCandleTime - 30 * intervalSeconds * 1000, lastCandleTime);
          }
        },
      },
    },
    title: { text: 'Price Candlestick Chart', align: 'left' },
    xaxis: { type: 'datetime', labels: { format: 'HH:mm:ss' } },
    yaxis: { tooltip: { enabled: true }, tickAmount: 8, labels: { formatter: (value) => value.toFixed(2) } },
    tooltip: {
      custom: ({ series, seriesIndex, dataPointIndex, w }) => {
        const data = w.globals.initialSeries[0].data[dataPointIndex];
        const lastDigit = parseInt(data.y[3].toString().slice(-1));
        return `
          <div style="padding: 8px; background: #fff; border: 1px solid #d9d9d9; border-radius: 4px;">
            <div><strong>Time:</strong> ${new Date(data.x).toLocaleTimeString()}</div>
            <div><strong>Open:</strong> ${data.y[0].toFixed(2)}</div>
            <div><strong>High:</strong> ${data.y[1].toFixed(2)}</div>
            <div><strong>Low:</strong> ${data.y[2].toFixed(2)}</div>
            <div><strong>Close:</strong> ${data.y[3].toFixed(2)}</div>
            <div><strong>Last Digit:</strong> ${lastDigit} (${lastDigit % 2 === 0 ? 'Even' : 'Odd'})</div>
          </div>
        `;
      },
    },
    plotOptions: { candlestick: { colors: { upward: '#52c41a', downward: '#f5222d' }, wickUseTheme: false, barWidth: 10 } },
  });

  const aggregateCandles = (ticks, intervalSeconds) => {
    if (!ticks || ticks.length === 0) return [];
    const candles = [];
    const intervalMs = intervalSeconds * 1000;
    let currentCandle = null;
    let currentTimeBucket = null;

    ticks.forEach((tick) => {
      const timestamp = Math.floor(tick.timestamp * 1000);
      const price = parseFloat(tick.price);
      const timeBucket = Math.floor(timestamp / intervalMs) * intervalMs;

      if (timeBucket !== currentTimeBucket) {
        if (currentCandle) candles.push(currentCandle);
        currentCandle = {
          time: timeBucket,
          open: price,
          high: price,
          low: price,
          close: price,
          lastDigit: parseInt(price.toString().slice(-1)),
        };
        currentTimeBucket = timeBucket;
      } else {
        currentCandle.high = Math.max(currentCandle.high, price);
        currentCandle.low = Math.min(currentCandle.low, price);
        currentCandle.close = price;
        currentCandle.lastDigit = parseInt(price.toString().slice(-1));
      }
    });

    if (currentCandle) candles.push(currentCandle);
    return simpleMode ? candles.slice(-30) : candles;
  };

  const calculateSMA = (candles, period) => {
    if (candles.length < period) return [];
    const sma = [];
    for (let i = period - 1; i < candles.length; i++) {
      const slice = candles.slice(i - period + 1, i + 1);
      const avg = slice.reduce((sum, candle) => sum + candle.lastDigit, 0) / period;
      sma.push({ x: candles[i].time, y: avg });
    }
    return sma;
  };

  useEffect(() => {
    if (symbol !== lastSymbol) {
      setIsLoading(true);
      setSeries([]);
      setLastSymbol(symbol);
      setChartOptions((prev) => ({
        ...prev,
        yaxis: { ...prev.yaxis, min: undefined, max: undefined, labels: { formatter: (value) => value.toFixed(2) } },
      }));
      const timer = setTimeout(() => setIsLoading(false), 500); // Minimal loading for UX
      return () => clearTimeout(timer);
    }

    try {
      const candles = aggregateCandles(ticks, intervalSeconds);
      if (candles.length === 0) {
        setSeries([]);
        const latestTick = ticks[ticks.length - 1];
        let yAxisMin, yAxisMax;
        if (latestTick && latestTick.price) {
          const price = parseFloat(latestTick.price);
          yAxisMin = price - 5;
          yAxisMax = price + 5;
        } else {
          const fallbackRange = symbolPriceRanges[symbol] || { min: 9000, max: 9200 };
          yAxisMin = fallbackRange.min;
          yAxisMax = fallbackRange.max;
        }
        setChartOptions((prev) => ({
          ...prev,
          yaxis: { ...prev.yaxis, min: yAxisMin, max: yAxisMax, tickAmount: 8, labels: { formatter: (value) => value.toFixed(2) } },
        }));
        setIsLoading(false);
        return;
      }

      const recentCandles = candles.slice(-30);
      const prices = recentCandles.flatMap((candle) => [candle.open, candle.high, candle.low, candle.close]);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice;

      const isHighVolatility = ['R_100', '1HZ100V', 'R_75', '1HZ75V'].includes(symbol);
      const paddingFactor = isHighVolatility ? 0.25 : 0.15;
      const padding = Math.max(priceRange * paddingFactor, 1);

      let yAxisMin = minPrice - padding;
      let yAxisMax = maxPrice + padding;

      if (yAxisMin >= yAxisMax) {
        console.warn('Invalid y-axis range, using fallback...');
        const fallbackRange = symbolPriceRanges[symbol] || { min: minPrice - 5, max: maxPrice + 5 };
        yAxisMin = fallbackRange.min;
        yAxisMax = fallbackRange.max;
      }

      setChartOptions((prev) => ({
        ...prev,
        yaxis: { ...prev.yaxis, min: yAxisMin, max: yAxisMax, tickAmount: 8, labels: { formatter: (value) => value.toFixed(2) } },
      }));

      console.log('Symbol:', symbol, 'Y-Axis Range:', { yAxisMin, yAxisMax, minPrice, maxPrice });

      const candlestickData = candles.map((candle) => ({
        x: candle.time,
        y: [candle.open, candle.high, candle.low, candle.close],
        fillColor: candle.lastDigit % 2 === 0 ? '#52c41a' : '#f5222d',
        strokeColor: candle.lastDigit % 2 === 0 ? '#52c41a' : '#f5222d',
      }));

      const seriesData = [{ name: 'Candlestick', type: 'candlestick', data: candlestickData }];

      if (!simpleMode) {
        const fastSMA = calculateSMA(candles, 5);
        const slowSMA = calculateSMA(candles, 10);
        seriesData.push(
          { name: 'SMA 5', type: 'line', data: fastSMA, color: '#1890ff' },
          { name: 'SMA 10', type: 'line', data: slowSMA, color: '#faad14' }
        );
      }

      setSeries(seriesData);
      setIsLoading(false);
    } catch (error) {
      console.error('Chart data processing failed:', error);
      setChartError(`Failed to process chart data: ${error.message}`);
      setIsLoading(false);
    }
  }, [ticks, simpleMode, symbol, intervalSeconds, lastSymbol]);

  const handleIntervalChange = (value) => {
    setIntervalSeconds(value);
  };

  if (chartError) {
    return (
      <Card size="small" title="Price Candlestick Chart" style={{ width: '100%' }}>
        <Alert
          message={chartError}
          type="error"
          showIcon
          action={<Button size="small" onClick={() => window.location.reload()}>Refresh Page</Button>}
        />
      </Card>
    );
  }

  return (
    <Card size="small" title="Price Candlestick Chart" style={{ width: '100%' }}>
      {isLoading && <Spin style={{ margin: '20px auto', display: 'block' }} />}
      <div style={{ marginBottom: 8 }}>
        <Text style={{ marginRight: 8 }}>Candle Interval:</Text>
        <Select value={intervalSeconds} onChange={handleIntervalChange} style={{ width: 120 }}>
          <Option value={5}>5 seconds</Option>
          <Option value={10}>10 seconds</Option>
          <Option value={30}>30 seconds</Option>
          <Option value={60}>1 minute</Option>
        </Select>
      </div>
      <Chart options={chartOptions} series={series} type="candlestick" height={400} />
      <Text type="secondary">
        <small>
          Showing {ticks.length} ticks aggregated into {intervalSeconds}-second candles for {symbol}
          {simpleMode ? ' (Simplified View)' : ' with SMA Indicators'}
        </small>
      </Text>
    </Card>
  );
};

CandlestickChart.propTypes = {
  ticks: PropTypes.arrayOf(
    PropTypes.shape({
      price: PropTypes.number.isRequired,
      timestamp: PropTypes.number.isRequired,
    })
  ).isRequired,
  simpleMode: PropTypes.bool,
  symbol: PropTypes.string,
};

CandlestickChart.defaultProps = {
  simpleMode: false,
  symbol: '',
};

export default CandlestickChart;