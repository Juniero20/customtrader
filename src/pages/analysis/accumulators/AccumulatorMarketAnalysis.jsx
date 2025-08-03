import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Select,
  Spin,
  Typography,
  Space,
  Row,
  Col,
  Statistic,
  theme,
  Alert,
  Collapse,
  Tooltip,
  Tabs,
  Badge,
  Progress
} from 'antd';
import {
  ThunderboltOutlined,
  InfoCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { publicWebSocket } from '../../../services/public_websocket_client';
import PriceMovementChart from './PriceMovementChart';
import { useUser } from '../../../context/AuthContext';
import {
  analyzePriceChange,
  analyzeResetCount,
  analyzeTicksBeforeReset,
  analyzeTickMomentum,
  analyzeVolatilitySpike,
  analyzeRisk,
  combineSignals,
} from './accumulatorAnalysis';

const { Option } = Select;
const { Text, Title } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;

const volatilityOptions = [
  { value: 'R_10', label: 'Volatility 10 Index' },
  { value: '1HZ10V', label: 'Volatility 10 (1s) Index' },
  { value: 'R_25', label: 'Volatility 25 Index' },
  { value: '1HZ25V', label: 'Volatility 25 (1s) Index' },
  { value: 'R_50', label: 'Volatility 50 Index' },
  { value: '1HZ50V', label: 'Volatility 50 (1s) Index' },
  { value: 'R_75', label: 'Volatility 75 Index' },
  { value: '1HZ75V', label: 'Volatility 75 (1s) Index' },
  { value: 'R_100', label: 'Volatility 100 Index' },
  { value: '1HZ100V', label: 'Volatility 100 (1s) Index' },
];

const growthRates = [
  { value: 1, label: '1%' },
  { value: 2, label: '2%' },
  { value: 3, label: '3%' },
  { value: 4, label: '4%' },
  { value: 5, label: '5%' },
];

// Barrier lookup table (in points)
const barrierLookup = {
  'R_10': { 1: 0.3829, 2: 0.3579, 3: 0.3356, 4: 0.3193, 5: 0.3039 },
  '1HZ10V': { 1: 0.377, 2: 0.352, 3: 0.331, 4: 0.315, 5: 0.299 },
  'R_25': { 1: 0.4420, 2: 0.4123, 3: 0.3875, 4: 0.3688, 5: 0.3509 },
  '1HZ25V': { 1: 69.493, 2: 64.924, 3: 60.876, 4: 57.925, 5: 55.121 },
  'R_50': { 1: 0.03975, 2: 0.03715, 3: 0.03486, 4: 0.03315, 5: 0.03156 },
  '1HZ50V': { 1: 44.502, 2: 41.612, 3: 39.014, 4: 37.145, 5: 35.353 },
  'R_75': { 1: 40.89002, 2: 38.1887, 3: 35.7975, 4: 34.03113, 5: 32.37661 },
  '1HZ75V': { 1: 1.390, 2: 1.301, 3: 1.220, 4: 1.160, 5: 1.105 },
  'R_100': { 1: 0.641, 2: 0.598, 3: 0.561, 4: 0.533, 5: 0.508 },
  '1HZ100V': { 1: 0.321, 2: 0.300, 3: 0.282, 4: 0.268, 5: 0.256 },
};

// Signal Indicator
const SignalIndicator = ({ signal, strength, size = 'default' }) => {
  const signalConfig = {
    continue: { color: '#52c41a', icon: <ArrowUpOutlined />, label: 'CONTINUE', explanation: 'Price is stable within the range, favorable for accumulator growth' },
    reset: { color: '#f5222d', icon: <ArrowDownOutlined />, label: 'RESET', explanation: 'Price breached the range, triggering a reset' },
    warning: { color: '#fa541c', icon: <WarningOutlined />, label: 'WARNING', explanation: 'High risk of reset due to volatility or barrier proximity' },
  };
  const config = signalConfig[signal] || signalConfig.continue;
  const isSmall = size === 'small';
  return (
    <Tooltip title={config.explanation}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: isSmall ? '4px 8px' : '8px 12px',
          backgroundColor: isSmall ? 'transparent' : '#fafafa',
          borderRadius: 8,
          border: isSmall ? 'none' : `1px solid ${config.color}`,
        }}
      >
        <span style={{ color: isSmall ? config.color : 'inherit', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
          {config.icon} {!isSmall && config.label}
        </span>
        {strength > 0 && (
          <Progress
            percent={Math.round(strength * 100)}
            strokeColor={config.color}
            size={isSmall ? 'small' : 'default'}
            showInfo={!isSmall}
            style={{ width: isSmall ? 60 : 120 }}
          />
        )}
      </div>
    </Tooltip>
  );
};

// Analysis Explanation
const AnalysisExplanation = ({ title, content }) => (
  <Tooltip title={<div style={{ padding: 8 }}><Text strong>{title}</Text><div style={{ marginTop: 4 }}>{content}</div></div>} overlayStyle={{ maxWidth: 300 }} placement="right">
    <InfoCircleOutlined style={{ color: '#1890ff', marginLeft: 8 }} />
  </Tooltip>
);

const AccumulatorAnalysis = () => {
  const { balance } = useUser();
  const { token } = theme.useToken();
  const [symbol, setSymbol] = useState('R_10');
  const [growthRate, setGrowthRate] = useState(1); // Default to 1%
  const [tickData, setTickData] = useState({});
  const [resetEvents, setResetEvents] = useState({}); // Track reset events per symbol
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoized barriers and reset times
  const { upperBarrier, lowerBarrier, resetTimes } = useMemo(() => {
    const ticks = tickData[symbol] || [];
    if (ticks.length === 0) return { upperBarrier: 0, lowerBarrier: 0, resetTimes: [] };

    const latestPrice = ticks[ticks.length - 1].price;
    const barrier = barrierLookup[symbol]?.[growthRate] || 0.3829; // Fallback to R_10 1% barrier
    return {
      upperBarrier: latestPrice + barrier,
      lowerBarrier: latestPrice - barrier,
      resetTimes: resetEvents[symbol] || [],
    };
  }, [tickData, symbol, growthRate, resetEvents]);

  // Memoized combined signal
  const combinedSignal = useMemo(() => {
    const ticks = tickData[symbol] || [];
    return combineSignals(ticks, symbol, growthRate / 100, balance, upperBarrier, lowerBarrier, ticks.length, resetTimes);
  }, [tickData, symbol, growthRate, balance, upperBarrier, lowerBarrier, resetTimes]);

  // Price movements with reset markers and ticks before reset
  const priceMovements = useMemo(() => {
    const ticks = tickData[symbol] || [];
    const resetTimestamps = (resetEvents[symbol] || []).map(event => event.timestamp);
    const movements = [];
    let tickCounter = 0;

    for (let i = 1; i < ticks.length; i++) {
      tickCounter++;
      const isReset = resetTimestamps.includes(ticks[i].timestamp);
      const movement = {
        type: ticks[i].price > ticks[i - 1].price ? 'up' : 'down',
        isReset,
        timestamp: ticks[i].timestamp,
      };

      if (isReset) {
        movement.ticksBeforeReset = tickCounter;
        tickCounter = 0;
      }

      movements.push(movement);
    }

    return movements.reverse();
  }, [tickData, symbol, resetEvents]);

  // WebSocket subscription
  useEffect(() => {
    let unsubscribers = [];
    let isMounted = true;

    const subscribeToAllSymbols = async () => {
      setLoading(true);
      let retryCount = 0;
      const maxRetries = 5;
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

      try {
        const connected = await connectWithRetry();
        if (!connected) {
          setError('Unable to connect after multiple attempts. Please try again later.');
          setLoading(false);
          return;
        }
        if (!isMounted) return;

        setTickData((prev) => {
          const updated = { ...prev };
          volatilityOptions.forEach((option) => {
            if (!updated[option.value]) updated[option.value] = [];
          });
          return updated;
        });
        setResetEvents((prev) => {
          const updated = { ...prev };
          volatilityOptions.forEach((option) => {
            if (!updated[option.value]) updated[option.value] = [];
          });
          return updated;
        });

        const handleTick = (event, data) => {
          if (!isMounted) return;
          if (event === 'message' && data.msg_type === 'tick') {
            const { symbol: tickSymbol, quote, epoch } = data.tick;
            setTickData((prev) => {
              const ticks = [...(prev[tickSymbol] || []), { price: quote, timestamp: epoch }].slice(-300);
              // Check for reset
              const barrier = barrierLookup[tickSymbol]?.[growthRate] || 0.3829;
              const prevPrice = ticks.length > 1 ? ticks[ticks.length - 2].price : quote;
              const upper = prevPrice + barrier;
              const lower = prevPrice - barrier;
              if (quote > upper || quote < lower) {
                setResetEvents((prevEvents) => {
                  const existing = prevEvents[tickSymbol] || [];
                  const alreadyExists = existing.some(r => r.timestamp === epoch);
                  if (alreadyExists) return prevEvents;

                  return {
                    ...prevEvents,
                    [tickSymbol]: [
                      ...existing.slice(-49),
                      { timestamp: epoch, price: quote, upperBarrier: upper, lowerBarrier: lower },
                    ],
                  };
                });
              }
              return { ...prev, [tickSymbol]: ticks };
            });
          } else if (event === 'message' && data.msg_type === 'history') {
            const { ticks_history: symbol, prices, times } = data.echo_req;
            if (prices && times) {
              const historicalTicks = prices.map((price, index) => ({
                price,
                timestamp: times[index],
              }));
              setTickData((prev) => ({
                ...prev,
                [symbol]: historicalTicks.slice(-60),
              }));
              // Check historical ticks for resets
              setResetEvents((prev) => {
                const barrier = barrierLookup[symbol]?.[growthRate] || 0.3829;
                const resets = [];
                let refPrice = historicalTicks[0]?.price || 0;
                for (let i = 1; i < historicalTicks.length; i++) {
                  const price = historicalTicks[i].price;
                  const upper = refPrice + barrier;
                  const lower = refPrice - barrier;
                  if (price > upper || price < lower) {
                    resets.push({
                      timestamp: historicalTicks[i].timestamp,
                      price,
                      upperBarrier: upper,
                      lowerBarrier: lower,
                    });
                    refPrice = price; // Update reference price after reset
                  }
                  refPrice = price; // Update reference price each tick
                }
                return { ...prev, [symbol]: resets.slice(-50) };
              });
            }
            setLoading(false);
          } else if (event === 'error') {
            console.error('WebSocket error:', data);
            setError('A connection issue occurred while retrieving data.');
            setLoading(false);
          }
        };

        volatilityOptions.forEach((option) => {
          const unsubscribe = publicWebSocket.subscribe(handleTick);
          unsubscribers.push(unsubscribe);
          publicWebSocket.subscribeToTicks(option.value);
        });

        const fetchHistorical = async () => {
          const batchSize = 5;
          for (let i = 0; i < volatilityOptions.length; i += batchSize) {
            if (!isMounted) return;
            const batch = volatilityOptions.slice(i, i + batchSize);
            await Promise.all(
              batch.map((option) => publicWebSocket.fetchHistoricalTicks(option.value, 60))
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        };

        await fetchHistorical();
      } catch (err) {
        console.error('WebSocket connection error:', err);
        if (isMounted) {
          setError('Unable to connect to market data. Please try again later.');
          setLoading(false);
        }
      }
    };

    subscribeToAllSymbols();

    return () => {
      isMounted = false;
      unsubscribers.forEach((unsub) => unsub());
      volatilityOptions.forEach((option) => publicWebSocket.unsubscribe(option.value));
      publicWebSocket.close();
    };
  }, [growthRate]);

  // Analysis functions
  const analyses = [
    {
      key: 'priceChange',
      name: 'Price Stability',
      func: () => analyzePriceChange(tickData[symbol] || [], symbol, growthRate / 100, upperBarrier, lowerBarrier),
      explanation: 'Analyzes price stability relative to the accumulator’s range.',
    },
    {
      key: 'resetCount',
      name: 'Reset Count',
      func: () => analyzeResetCount(tickData[symbol] || [], resetTimes),
      explanation: 'Counts reset events when the price breaches the range.',
    },
    {
      key: 'ticksBeforeReset',
      name: 'Ticks Before Reset',
      func: () => analyzeTicksBeforeReset(tickData[symbol] || [], resetTimes),
      explanation: 'Calculates the average number of ticks before a reset occurs.',
    },
    {
      key: 'momentum',
      name: 'Tick Momentum',
      func: () => analyzeTickMomentum(tickData[symbol] || [], symbol, upperBarrier, lowerBarrier),
      explanation: 'Evaluates price momentum relative to barriers.',
    },
    {
      key: 'volatility',
      name: 'Volatility Spike',
      func: () => analyzeVolatilitySpike(tickData[symbol] || []),
      explanation: 'Detects sudden increases in volatility that may trigger resets.',
    },
    {
      key: 'risk',
      name: 'Risk Analysis',
      func: () => analyzeRisk(balance, symbol, combinedSignal.signal === 'reset' ? 100 : 50),
      explanation: 'Recommends stake size based on balance and volatility.',
    },
    {
      key: 'combined',
      name: 'Summary',
      func: () => combinedSignal,
      explanation: 'Aggregates indicators to recommend whether to trade an accumulator contract.',
    },
  ];

  // Render analysis result
  const renderAnalysis = (analysis) => {
    if (!analysis || !tickData[symbol] || tickData[symbol].length === 0) {
      return <Text>No data available for analysis.</Text>;
    }

    const result = analysis.func();
    if (!result) {
      return <Text>Analysis unavailable.</Text>;
    }

    if (analysis.key === 'combined') {
      const { signal, confidence, details, individualSignals } = result;
      return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            message={
              <Space>
                <Text strong>Recommendation:</Text>
                <SignalIndicator signal={signal} strength={confidence} />
              </Space>
            }
            description={details}
            type={signal === 'continue' ? 'success' : signal === 'reset' ? 'error' : signal === 'warning' ? 'warning' : 'info'}
            showIcon
          />
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <PriceMovementChart movements={priceMovements} />
            </Col>
          </Row>
          <Collapse ghost>
            <Panel header={<Text style={{ color: 'var(--text-color)' }}>Detailed Indicators</Text>} key="details">
              <Row gutter={[16, 16]}>
                {Object.entries(individualSignals).map(([key, res]) => (
                  <Col xs={24} sm={12} md={8} key={key}>
                    <Card
                      size="small"
                      title={
                        <Space>
                          <Text>{key.toUpperCase()}</Text>
                          <AnalysisExplanation
                            title={analyses.find((a) => a.key === key)?.name}
                            content={analyses.find((a) => a.key === key)?.explanation}
                          />
                        </Space>
                      }
                    >
                      <Space direction="vertical">
                        <SignalIndicator signal={res?.signal} strength={res?.strength} size="small" />
                        <Text style={{ color: 'var(--text-color)' }}>{res?.details || 'No details'}</Text>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Panel>
          </Collapse>
        </Space>
      );
    }

    const { signal, strength, details } = result;
    return (
      <Card size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <SignalIndicator signal={signal} strength={strength} size="small" />
            <AnalysisExplanation title={analysis.name} content={analysis.explanation} />
          </Space>
          <Text>{details}</Text>
        </Space>
      </Card>
    );
  };

  return (
    <div className="accumulator-analysis-container">
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
      <Card
        title={
          <Space>
            <ThunderboltOutlined style={{ color: token.colorPrimary }} />
            <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>Accumulator Analysis</Title>
          </Space>
        }
        className="accumulator-analysis-card"
        style={{ padding: 16 }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Select
                value={symbol}
                onChange={setSymbol}
                style={{ width: '100%' }}
                placeholder="Select Symbol"
                optionLabelProp="label"
              >
                {volatilityOptions.map((option) => (
                  <Option
                    key={option.value}
                    value={option.value}
                    label={
                      <Space>
                        <Text strong>{option.value}</Text>
                        <Text type="secondary">{option.label}</Text>
                      </Space>
                    }
                  >
                    <div>
                      <Text strong>{option.value}</Text>
                      <div style={{ fontSize: 12 }}>{option.label}</div>
                    </div>
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} md={12}>
              <Select
                value={growthRate}
                onChange={setGrowthRate}
                style={{ width: '100%' }}
                placeholder="Select Growth Rate"
              >
                {growthRates.map((option) => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24}>
              <Card size="small" style={{ padding: '8px 16px' }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title={<Text style={{ color: 'var(--text-color)' }}>Current Price</Text>}
                      value={tickData[symbol]?.length > 0 ? tickData[symbol][tickData[symbol].length - 1].price : '--'}
                      precision={2}
                      valueStyle={{
                        color: tickData[symbol]?.length > 1
                          ? tickData[symbol][tickData[symbol].length - 1].price > tickData[symbol][tickData[symbol].length - 2].price
                            ? '#52c41a'
                            : '#f5222d'
                          : 'inherit',
                      }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title={<Text style={{ color: 'var(--text-color)' }}>Last Change</Text>}
                      value={
                        tickData[symbol]?.length > 1
                          ? (tickData[symbol][tickData[symbol].length - 1].price - tickData[symbol][tickData[symbol].length - 2].price).toFixed(2)
                          : '--'
                      }
                      valueStyle={{
                        color: tickData[symbol]?.length > 1
                          ? tickData[symbol][tickData[symbol].length - 1].price > tickData[symbol][tickData[symbol].length - 2].price
                            ? '#52c41a'
                            : '#f5222d'
                          : 'inherit',
                      }}
                      prefix={
                        tickData[symbol]?.length > 1
                          ? tickData[symbol][tickData[symbol].length - 1].price > tickData[symbol][tickData[symbol].length - 2].price
                            ? <ArrowUpOutlined />
                            : <ArrowDownOutlined />
                          : null
                      }
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title={<Text style={{ color: 'var(--text-color)' }}>Reset Count</Text>}
                      value={resetTimes.length}
                      valueStyle={{ color: resetTimes.length > 2 ? '#f5222d' : 'inherit' }}
                    />
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 8 }}>
                  <Col span={12}>
                    <Statistic
                      title={<Text style={{ color: 'var(--text-color)' }}>Upper Barrier</Text>}
                      value={upperBarrier ? upperBarrier.toFixed(2) : '--'}
                      precision={2}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={<Text style={{ color: 'var(--text-color)' }}>Lower Barrier</Text>}
                      value={lowerBarrier ? lowerBarrier.toFixed(2) : '--'}
                      precision={2}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
          {error && <Alert message={error} type="error" showIcon />}
          <Spin spinning={loading} tip="Loading market data...">
            <Tabs defaultActiveKey="combined" size="small" tabPosition="top" type="line" style={{ marginTop: 8 }}>
              {analyses.map((analysis) => (
                <TabPane
                  tab={
                    <Space size={4}>
                      <span>{analysis.name}</span>
                      {analysis.key === 'combined' && (
                        <Badge dot color={combinedSignal.signal === 'continue' ? '#52c41a' : combinedSignal.signal === 'reset' ? '#f5222d' : '#fa541c'} />
                      )}
                    </Space>
                  }
                  key={analysis.key}
                >
                  {renderAnalysis(analysis)}
                </TabPane>
              ))}
            </Tabs>
          </Spin>
        </Space>
      </Card>
    </div>
  );
};

export default AccumulatorAnalysis;