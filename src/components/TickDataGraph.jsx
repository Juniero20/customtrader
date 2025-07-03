// src/components/TickDataGraph.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { publicWebSocket } from '../services/public_websocket_client';
import { Card, Row, Col, Select, Button, Tag, Typography, Skeleton, Alert} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import throttle from 'lodash/throttle';
import '../assets/css/components/VolatilityComparisonChart.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

const { Option } = Select;
const { Title, Text } = Typography;

const VolatilityComparisonChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState('1HZ10V');
  const [showAviator, setShowAviator] = useState(false);
  const [timeRange, setTimeRange] = useState(60);
  const [aviatorLoading, setAviatorLoading] = useState(true);
  const subscriptions = useRef({});
  const lastUpdateTime = useRef({});
  const chartRef = useRef(null);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const processTickData = throttle((newTick) => {
    setData((prevData) => {
      const symbolData = prevData.filter((d) => d.symbol === newTick.symbol).slice(-99);
      const updatedData = [
        ...symbolData,
        { ...newTick, isLatest: true },
      ];
      return updatedData.map((item, index, arr) => ({
        ...item,
        isLatest: index === arr.length - 1,
      }));
    });
  }, 1000);

  const getDisplayData = () => {
    const result = [];
    const timePoints = new Set();
    const now = Date.now() / 1000;

    [...data]
      .reverse()
      .filter((item) => item.symbol === selectedSymbol && now - item.epoch <= timeRange)
      .forEach((item) => {
        if (!timePoints.has(item.time)) {
          timePoints.add(item.time);
          if (timePoints.size <= 8) {
            result.unshift(item);
          }
        }
      });

    return result;
  };

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    let unsub = null;
    let isUnmounted = false;
    const connectWithRetry = async () => {
      while (retryCount < maxRetries) {
        try {
          await publicWebSocket.connect();
          return true;
        } catch (err) {
          retryCount++;
          console.error(`WebSocket connection failed (attempt ${retryCount}/${maxRetries})`, err);
          await new Promise(res => setTimeout(res, 1000 * Math.pow(2, retryCount)));
        }
      }
      return false;
    };
    (async () => {
      setError(null);
      const connected = await connectWithRetry();
      if (!connected) {
        setError('Unable to connect after multiple attempts. Please try again later.');
        return;
      }
      if (isUnmounted) return;
      unsub = publicWebSocket.subscribe((event, data) => {
        if (event === 'message' && data) {
          if (data.error) {
            setError(data.error.message || 'An error occurred');
            setLoading(false);
          } else if (data.tick && data.tick.symbol === selectedSymbol) {
            const tick = {
              time: formatTime(new Date(data.tick.epoch * 1000)),
              value: data.tick.quote,
              symbol: data.tick.symbol,
              epoch: data.tick.epoch,
              isLatest: false,
            };
            processTickData(tick);
          } else if (data.subscription && data.echo_req?.ticks) {
            subscriptions.current[data.echo_req.ticks] = data.subscription.id;
          }
        } else if (event === 'error') {
          setError('WebSocket error occurred');
          setLoading(false);
        }
      });
      if (publicWebSocket.socket) {
        publicWebSocket.socket.onopen = () => {
          subscribeToTicks();
        };
        publicWebSocket.socket.onclose = () => {
          setError('WebSocket disconnected. Attempting to reconnect...');
        };
      }
      subscribeToTicks();
    })();
    return () => {
      isUnmounted = true;
      Object.keys(subscriptions.current).forEach((symbol) => {
        publicWebSocket.send({ forget: subscriptions.current[symbol] });
        delete subscriptions.current[symbol];
      });
      if (unsub) unsub();
      publicWebSocket.close();
    };
  }, [selectedSymbol]);


  const subscribeToTicks = () => {
    setLoading(true);
    setError(null);
    setData([]);
    Object.keys(subscriptions.current).forEach((symbol) => {
      publicWebSocket.send({ forget: subscriptions.current[symbol] });
      delete subscriptions.current[symbol];
    });
    lastUpdateTime.current = { [selectedSymbol]: 0 };
    publicWebSocket.send({
      ticks: selectedSymbol,
      subscribe: 1,
    });
    setLoading(false);
  };

  const unsubscribeFromTicks = () => {
    Object.keys(subscriptions.current).forEach((symbol) => {
      publicWebSocket.send({ forget: subscriptions.current[symbol] });
      delete subscriptions.current[symbol];
    });
    setData([]);
  };

  const handleSymbolChange = (value) => {
    unsubscribeFromTicks();
    setSelectedSymbol(value || '1HZ10V');
    setData([]);
    subscribeToTicks();
  };

  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
    setData([]);
    subscribeToTicks();
  };

  const getSymbolDisplayName = (symbol) => {
    const names = {
      R_10: 'Volatility 10',
      '1HZ10V': 'Volatility 10 (1s)',
      R_25: 'Volatility 25',
      '1HZ25V': 'Volatility 25 (1s)',
      R_50: 'Volatility 50',
      '1HZ50V': 'Volatility 50 (1s)',
      R_75: 'Volatility 75',
      '1HZ75V': 'Volatility 75 (1s)',
      R_100: 'Volatility 100',
      '1HZ100V': 'Volatility 100 (1s)',
    };
    return names[symbol] || symbol;
  };

  const chartData = useMemo(() => {
    const displayData = getDisplayData();
    const colorMap = {
      'Volatility 10': 'rgba(24, 144, 255, 1)',
      'Volatility 10 (1s)': 'rgba(24, 144, 255, 1)',
      'Volatility 25': 'rgba(255, 77, 79, 1)',
      'Volatility 25 (1s)': 'rgba(255, 77, 79, 1)',
      'Volatility 50': 'rgba(82, 196, 26, 1)',
      'Volatility 50 (1s)': 'rgba(82, 196, 26, 1)',
      'Volatility 75': 'rgba(250, 173, 20, 1)',
      'Volatility 75 (1s)': 'rgba(250, 173, 20, 1)',
      'Volatility 100': 'rgba(114, 46, 209, 1)',
      'Volatility 100 (1s)': 'rgba(114, 46, 209, 1)',
    };

    const displayName = getSymbolDisplayName(selectedSymbol);
    const ctx = chartRef.current?.canvas?.getContext('2d');
    let gradient;

    if (ctx) {
      try {
        gradient = ctx.createLinearGradient(0, 0, 0, 400);
        const baseColor = colorMap[displayName].match(/rgba?\([^)]+\)/)?.[0] || 'rgba(24, 144, 255, 1)';
        gradient.addColorStop(0, baseColor.replace(/, 1\)$/, ', 0.3)'));
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        //console.log('Line color:', colorMap[displayName], 'Gradient start:', baseColor.replace(/, 1\)$/, ', 0.3)'));
      } catch (err) {
        console.error('Failed to create gradient:', err);
        gradient = colorMap[displayName];
      }
    }

    const datasets = [{
      label: displayName,
      data: displayData.map((item) => ({
        x: item.time,
        y: item.value,
        isLatest: item.isLatest,
      })),
      borderColor: colorMap[displayName],
      backgroundColor: gradient || colorMap[displayName],
      borderWidth: 2,
      tension: 0.1,
      pointRadius: displayData.map((item) => (item.isLatest ? 6 : 4)),
      pointBackgroundColor: displayData.map((item) =>
        item.isLatest ? 'rgba(255, 77, 79, 1)' : colorMap[displayName]
      ),
      pointBorderColor: 'rgba(255, 255, 255, 1)',
      pointHoverRadius: 7,
      pointHitRadius: 10,
      fill: true,
    }];

    return { datasets };
  }, [data, selectedSymbol]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 14, weight: 'bold' },
          color: 'var(--text-color, whitesmoke)',
        },
      },
      tooltip: {
        backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.05))',
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 4,
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += parseFloat(context.parsed.y).toFixed(4);
            }
            return label;
          },
        },
      },
      annotation: {
        annotations: {
          latestPoint: {
            type: 'line',
            xMin: (ctx) => {
              const latest = ctx.chart.data.datasets[0]?.data.find((d) => d.isLatest)?.x;
              return latest || undefined;
            },
            xMax: (ctx) => {
              const latest = ctx.chart.data.datasets[0]?.data.find((d) => d.isLatest)?.x;
              return latest || undefined;
            },
            borderColor: 'rgba(255, 77, 79, 0.5)',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              content: 'Latest',
              enabled: true,
              position: 'top',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#018786',
            },
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
          font: { size: 12 },
          color: '#018786',
        },
      },
      y: {
        position: 'right',
        grid: {
          display: true,
          color: 'var(--input-bg, rgba(222, 184, 184, 0.2))',
          borderColor: 'var(--text-color, whitesmoke)',
          drawBorder: true,
        },
        ticks: {
          callback: (value) => parseFloat(value).toFixed(4),
          font: { size: 12 },
          color: '#018786',
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return (
    <Card
      className="volatility-chart-card"
      title={
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} className="volatility-chart-title">
              Volatility Index
            </Title>
          </Col>
          <Col>
            {selectedSymbol && !showAviator && (
              <Tag className="volatility-chart-tag volatility-chart-tag-symbols">
                {getSymbolDisplayName(selectedSymbol)}
              </Tag>
            )}
            {showAviator && (
              <Tag className="volatility-chart-tag volatility-chart-tag-aviator">
                Aviator Predictor
              </Tag>
            )}
          </Col>
        </Row>
      }
      extra={
        <Row gutter={8}>
          <Col>
            <Button
              className="aviator-btn"
              onClick={() => setShowAviator(!showAviator)}
              type={showAviator ? 'default' : 'primary'}
            >
              {showAviator ? 'Show Chart' : 'Show Aviator'}
            </Button>
          </Col>
          <Col>
            <Button
              className="retry-btn"
              icon={<ReloadOutlined />}
              onClick={subscribeToTicks}
              loading={loading}
              type="primary"
              disabled={showAviator}
            >
              Retry
            </Button>
          </Col>
        </Row>
      }
    >
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      <Row gutter={[16, 16]} className="volatility-chart-controls">
        <Col xs={24} sm={24} md={16}>
          <Select
            value={selectedSymbol}
            onChange={handleSymbolChange}
            className="volatility-chart-select"
            disabled={loading || showAviator}
            placeholder="Select an index"
            showSearch
            filterOption={(input, option) =>
              option.label.toLowerCase().includes(input.toLowerCase())
            }
          >
            <Option value="R_10" label="V10">Volatility 10 Index</Option>
            <Option value="1HZ10V" label="V10(1s)">Volatility 10(1s) Index</Option>
            <Option value="R_25" label="V25">Volatility 25 Index</Option>
            <Option value="1HZ25V" label="V25(1s)">Volatility 25(1s) Index</Option>
            <Option value="R_50" label="V50">Volatility 50 Index</Option>
            <Option value="1HZ50V" label="V50(1s)">Volatility 50(1s) Index</Option>
            <Option value="R_75" label="V75">Volatility 75 Index</Option>
            <Option value="1HZ75V" label="V75(1s)">Volatility 75(1s) Index</Option>
            <Option value="R_100" label="V100">Volatility 100 Index</Option>
            <Option value="1HZ100V" label="V100(1s)">Volatility 100(1s) Index</Option>
          </Select>
        </Col>
        <Col xs={24} sm={24} md={8}>
          <Select
            value={timeRange}
            onChange={handleTimeRangeChange}
            className="volatility-chart-select"
            disabled={loading || showAviator}
          >
            <Option value={60}>Last 1 Minute</Option>
            <Option value={300}>Last 5 Minutes</Option>
            <Option value={600}>Last 10 Minutes</Option>
          </Select>
        </Col>
      </Row>

      {showAviator ? (
        <div className="volatility-chart-container">
          {aviatorLoading && (
            <div className="volatility-chart-loading">
              <Skeleton active paragraph={{ rows: 4 }} />
              <Text>Loading Aviator Predictor...</Text>
            </div>
          )}
          <iframe
            src={`https://predicto-mocha.vercel.app/?symbol=${selectedSymbol}`}
            className={`volatility-chart-iframe ${aviatorLoading ? 'volatility-chart-iframe-hidden' : ''}`}
            title="Aviator Predictor"
            onLoad={() => setAviatorLoading(false)}
          />
        </div>
      ) : loading ? (
        <div className="volatility-chart-loading">
          <Skeleton active paragraph={{ rows: 4 }} />
          <Text>Loading data...</Text>
        </div>
      ) : data.length > 0 ? (
        <div className="volatility-chart-container">
          <Line ref={chartRef} data={chartData} options={chartOptions} />
        </div>
      ) : (
        <div className="volatility-chart-no-data">
          <Skeleton active paragraph={{ rows: 4 }} />
          <Text className="volatility-chart-no-data-text">
            Select an index and click Refresh to view data
          </Text>
        </div>
      )}
    </Card>
  );
};

export default VolatilityComparisonChart;