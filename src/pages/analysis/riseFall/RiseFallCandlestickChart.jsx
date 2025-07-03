import React, { useEffect, useState, useRef } from 'react';
import { Card, Typography, Alert, Button, Select, Spin } from 'antd';
import Chart from 'react-apexcharts';
import PropTypes from 'prop-types';
import debounce from 'lodash/debounce';

const { Text } = Typography;
const { Option } = Select;

const symbolPriceRanges = {
  R_10: { min: 6000, max: 7000 },
  '1HZ10V': { min: 9000, max: 9200 },
  R_25: { min: 7000, max: 8000 },
  '1HZ25V': { min: 6900, max: 8100 },
  R_50: { min: 8000, max: 9000 },
  '1HZ50V': { min: 7900, max: 9100 },
  R_75: { min: 9000, max: 10000 },
  '1HZ75V': { min: 8900, max: 10100 },
  R_100: { min: 10000, max: 11000 },
  '1HZ100V': { min: 9000, max: 11100 },
};

const RiseFallCandlestickChart = ({ ticks, simpleMode, symbol }) => {
  const [chartError, setChartError] = useState(null);
  const [series, setSeries] = useState([]);
  const [intervalSeconds, setIntervalSeconds] = useState(10);
  const [lastSymbol, setLastSymbol] = useState(symbol);
  const [isLoading, setIsLoading] = useState(false);
  const [insufficientData, setInsufficientData] = useState(false);

  const [chartOptions, setChartOptions] = useState({
    chart: {
      type: 'candlestick',
      height: 400,
      zoom: { enabled: true },
      toolbar: { show: true },
      events: {
        mounted: (chart) => {
          if (series.length > 0 && series[0]?.data?.length > 0) {
            const lastCandleTime = series[0].data[series[0].data.length - 1].x;
            if (typeof lastCandleTime === 'number' && !isNaN(lastCandleTime)) {
              chart.zoomX(lastCandleTime - 30 * intervalSeconds * 1000, lastCandleTime);
            }
          }
        },
      },
    },
    title: { text: 'Price Candlestick Chart', align: 'left' },
    xaxis: { type: 'datetime', labels: { format: 'HH:mm:ss' } },
    yaxis: {
      logarithmic: false,
      tooltip: { enabled: true },
      tickAmount: 8,
      labels: { formatter: (value) => (typeof value === 'number' && !isNaN(value) ? value.toFixed(2) : '') },
    },
    tooltip: {
      custom: ({ series, seriesIndex, dataPointIndex, w }) => {
        const data = w.globals.initialSeries[0]?.data?.[dataPointIndex];
        if (!data || !data.y) return '<div>No data</div>';
        const direction = data.y[3] > data.y[0] ? 'Upward' : data.y[3] < data.y[0] ? 'Downward' : 'Neutral';
        return `
          <div style="padding: 8px; background: #fff; border: 1px solid #d9d9d9; border-radius: 4px;">
            <div><strong>Time:</strong> ${new Date(data.x).toLocaleTimeString()}</div>
            <div><strong>Open:</strong> ${data.y[0].toFixed(2)}</div>
            <div><strong>High:</strong> ${data.y[1].toFixed(2)}</div>
            <div><strong>Low:</strong> ${data.y[2].toFixed(2)}</div>
            <div><strong>Close:</strong> ${data.y[3].toFixed(2)}</div>
            <div><strong>Direction:</strong> ${direction}</div>
          </div>
        `;
      },
    },
    plotOptions: { candlestick: { colors: { upward: '#52c41a', downward: '#f5222d' }, wickUseTheme: false, barWidth: 10 } },
  });

  const aggregateCandles = (ticks, intervalSeconds) => {
    if (!ticks || ticks.length === 0) {
      console.warn(`No ticks provided for candle aggregation (symbol: ${symbol})`);
      return [];
    }
    //console.log(`Aggregating ticks for ${symbol}:`, ticks.length, 'Interval:', intervalSeconds, 'Ticks:', ticks);
    const candles = [];
    const intervalMs = intervalSeconds * 1000;
    let currentCandle = null;
    let currentTimeBucket = null;

    // Sort ticks by timestamp to ensure chronological order
    const sortedTicks = [...ticks].sort((a, b) => a.timestamp - b.timestamp);

    sortedTicks.forEach((tick, index) => {
      if (!tick || typeof tick.timestamp !== 'number' || isNaN(tick.timestamp) || typeof tick.price !== 'number' || isNaN(tick.price)) {
        console.warn(`Invalid tick for ${symbol}:`, tick);
        return;
      }
      // Adjust timestamp to spread ticks across buckets
      const adjustedTimestamp = Math.floor(tick.timestamp * 1000);
      const timeBucket = Math.floor(adjustedTimestamp / intervalMs) * intervalMs;

      if (timeBucket !== currentTimeBucket) {
        if (currentCandle) candles.push(currentCandle);
        currentCandle = {
          time: timeBucket,
          open: tick.price,
          high: tick.price,
          low: tick.price,
          close: tick.price,
        };
        currentTimeBucket = timeBucket;
      } else {
        currentCandle.high = Math.max(currentCandle.high, tick.price);
        currentCandle.low = Math.min(currentCandle.low, tick.price);
        currentCandle.close = tick.price;
      }
    });

    if (currentCandle) candles.push(currentCandle);
    //console.log(`Generated candles for ${symbol}:`, candles.length, 'Candles:', candles);
    return simpleMode ? candles.slice(-30) : candles;
  };

  const calculateSMA = (candles, period) => {
    if (candles.length < period) {
      console.warn(`Insufficient candles for SMA (period: ${period}, got: ${candles.length}) for ${symbol}`);
      return [];
    }
    const sma = [];
    for (let i = period - 1; i < candles.length; i++) {
      const slice = candles.slice(i - period + 1, i + 1);
      if (slice.some((candle) => typeof candle.close !== 'number' || isNaN(candle.close))) {
        console.warn(`Invalid candle data for SMA at index ${i} for ${symbol}:`, slice);
        continue;
      }
      const avg = slice.reduce((sum, candle) => sum + candle.close, 0) / period;
      if (typeof candles[i].time === 'number' && !isNaN(candles[i].time)) {
        sma.push({ x: candles[i].time, y: avg });
      }
    }
    return sma;
  };

  // Debounced function to update chart data
  const debouncedUpdateChart = useRef(
    debounce((ticks, simpleMode, symbol, intervalSeconds) => {
      try {
        //console.log(`Updating chart for ${symbol} with ticks:`, ticks);
        const candles = aggregateCandles(ticks, intervalSeconds);
        if (candles.length === 0) {
          console.warn(`No candles generated for ${symbol}, setting insufficient data`);
          setSeries([]); // Ensure series is empty but valid
          setInsufficientData(true);
          const latestTick = ticks[ticks.length - 1];
          let yAxisMin, yAxisMax;
          if (latestTick && typeof latestTick.price === 'number' && !isNaN(latestTick.price)) {
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
            yaxis: {
              ...prev.yaxis,
              min: yAxisMin,
              max: yAxisMax,
              logarithmic: false,
              labels: { formatter: (value) => (typeof value === 'number' && !isNaN(value) ? value.toFixed(2) : '') },
            },
          }));
          setIsLoading(false);
          return;
        }

        // Allow rendering with any number of candles
        setInsufficientData(false);

        const recentCandles = candles.slice(-30);
        const prices = recentCandles
          .flatMap((candle) => [candle.open, candle.high, candle.low, candle.close])
          .filter((p) => typeof p === 'number' && !isNaN(p));
        const minPrice = prices.length > 0 ? Math.min(...prices) : undefined;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : undefined;
        const priceRange = maxPrice && minPrice ? maxPrice - minPrice : 0;

        const isHighVolatility = ['R_100', '1HZ100V', 'R_75', '1HZ75V'].includes(symbol);
        const paddingFactor = isHighVolatility ? 0.25 : 0.15;
        const padding = priceRange ? Math.max(priceRange * paddingFactor, 1) : 5;

        let yAxisMin = minPrice ? minPrice - padding : undefined;
        let yAxisMax = maxPrice ? maxPrice + padding : undefined;

        if (!yAxisMin || !yAxisMax || yAxisMin >= yAxisMax) {
          console.warn(`Invalid y-axis range for ${symbol}, using fallback...`);
          const fallbackRange = symbolPriceRanges[symbol] || { min: 9000, max: 9200 };
          yAxisMin = fallbackRange.min;
          yAxisMax = fallbackRange.max;
        }

        setChartOptions((prev) => ({
          ...prev,
          yaxis: {
            ...prev.yaxis,
            min: yAxisMin,
            max: yAxisMax,
            logarithmic: false,
            labels: { formatter: (value) => (typeof value === 'number' && !isNaN(value) ? value.toFixed(2) : '') },
          },
        }));

        const candlestickData = candles
          .map((candle) => {
            if (
              typeof candle.time !== 'number' ||
              isNaN(candle.time) ||
              typeof candle.open !== 'number' ||
              isNaN(candle.open) ||
              typeof candle.high !== 'number' ||
              isNaN(candle.high) ||
              typeof candle.low !== 'number' ||
              isNaN(candle.low) ||
              typeof candle.close !== 'number' ||
              isNaN(candle.close)
            ) {
              console.warn(`Invalid candlestick data for ${symbol}:`, candle);
              return null;
            }
            return {
              x: candle.time,
              y: [candle.open, candle.high, candle.low, candle.close],
            };
          })
          .filter((data) => data !== null);

        //console.log(`Candlestick data for ApexCharts (${symbol}):`, candlestickData);

        if (candlestickData.length === 0) {
          console.warn(`No valid candlestick data for ${symbol}, skipping series update`);
          setSeries([]); // Ensure series is empty but valid
          setInsufficientData(true);
          setIsLoading(false);
          return;
        }

        const seriesData = [{ name: 'Candlestick', type: 'candlestick', data: candlestickData }];

        if (!simpleMode) {
          const fastSMA = calculateSMA(candles, 5);
          const slowSMA = calculateSMA(candles, 10);
          if (fastSMA.length > 0) seriesData.push({ name: 'SMA 5', type: 'line', data: fastSMA, color: '#1890ff' });
          if (slowSMA.length > 0) seriesData.push({ name: 'SMA 10', type: 'line', data: slowSMA, color: '#faad14' });
        }

        //console.log(`Series data for ${symbol}:`, seriesData);
        setSeries(seriesData);
        setIsLoading(false);
      } catch (error) {
        console.error(`Chart data processing failed for ${symbol}:`, error);
        setChartError(`Failed to process chart data: ${error.message}`);
        setIsLoading(false);
      }
    }, 500)
  ).current;

  useEffect(() => {
    if (symbol !== lastSymbol) {
      //console.log(`Symbol changed from ${lastSymbol} to ${symbol}`);
      setIsLoading(true);
      // Do not clear series immediately to prevent ApexCharts error
      setLastSymbol(symbol);
      setChartOptions((prev) => ({
        ...prev,
        yaxis: {
          ...prev.yaxis,
          min: undefined,
          max: undefined,
          logarithmic: false,
          labels: { formatter: (value) => (typeof value === 'number' && !isNaN(value) ? value.toFixed(2) : '') },
        },
      }));
      // Clear series only after a delay to ensure new data is processed
      setTimeout(() => {
        setSeries([]);
        setIsLoading(false);
      }, 500);
      return;
    }

    debouncedUpdateChart(ticks, simpleMode, symbol, intervalSeconds);

    return () => {
      debouncedUpdateChart.cancel();
    };
  }, [ticks, simpleMode, symbol, intervalSeconds, lastSymbol, debouncedUpdateChart]);

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

  if (insufficientData) {
    return (
      <Card size="small" title="Price Candlestick Chart" style={{ width: '100%' }}>
        <Alert
          message="Insufficient data to display chart"
          description="Please wait for more market data to be collected or check your WebSocket connection."
          type="info"
          showIcon
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
      {series.length > 0 && series[0]?.data?.length > 0 ? (
        <Chart options={chartOptions} series={series} type="candlestick" height={400} />
      ) : (
        <Alert
          message="Waiting for chart data"
          description="Chart will render once valid data is available."
          type="info"
          showIcon
        />
      )}
      <Text type="secondary">
        <small>
          Showing {ticks.length} ticks aggregated into {intervalSeconds}-second candles for {symbol}
          {simpleMode ? ' (Simplified View)' : ' with SMA Indicators'}
        </small>
      </Text>
    </Card>
  );
};

RiseFallCandlestickChart.propTypes = {
  ticks: PropTypes.arrayOf(
    PropTypes.shape({
      price: PropTypes.number.isRequired,
      timestamp: PropTypes.number.isRequired,
    })
  ).isRequired,
  simpleMode: PropTypes.bool,
  symbol: PropTypes.string,
};

RiseFallCandlestickChart.defaultProps = {
  simpleMode: false,
  symbol: '',
};

export default RiseFallCandlestickChart;