import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Select, Tabs, Spin, Progress, Typography, Collapse, Space, Row, Col, Statistic,theme, Tooltip, Badge, Switch, Alert,
} from 'antd';
import {
  LineChartOutlined, QuestionCircleOutlined, ArrowUpOutlined, ArrowDownOutlined, PauseOutlined, WarningOutlined, InfoCircleOutlined, BellOutlined,
} from '@ant-design/icons';
import { publicWebSocket } from '../../../services/public_websocket_client';
import {
  analyzeSMACrossover, analyzeStochastic, analyzeTickStreak, analyzeVolatilitySpike, analyzeRisk, combineSignals,
} from './riseFallAnalysis';
// import RiseFallCandlestickChart from './RiseFallCandlestickChart';
import PriceMovementChart from './PriceMovementChart';
import '../../../assets/css/pages/analysis/MarketAnalysis.css';
import { useUser } from '../../../context/AuthContext';

const { Option } = Select;
const { TabPane } = Tabs;
const { Text,Title } = Typography;
const { Panel } = Collapse;

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

// Signal Indicator
const SignalIndicator = ({ signal, strength, size = 'default', showAlert = false }) => {
  const signalConfig = {
    rise: { color: '#52c41a', icon: <ArrowUpOutlined />, label: 'RISE', explanation: 'The market is showing upward momentum' },
    fall: { color: '#f5222d', icon: <ArrowDownOutlined />, label: 'FALL', explanation: 'The market is showing downward momentum' },
    neutral: { color: '#faad14', icon: <PauseOutlined />, label: 'NEUTRAL', explanation: 'The market shows no clear direction' },
    warning: { color: '#fa541c', icon: <WarningOutlined />, label: 'WARNING', explanation: 'High volatility detected - trade with caution' },
    hold: { color: '#1890ff', icon: <InfoCircleOutlined />, label: 'HOLD', explanation: 'Not recommended to trade at this time' },
  };
  const config = signalConfig[signal] || signalConfig.neutral;
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
          position: 'relative',
        }}
      >
        {showAlert && strength > 0.7 && (
          <div style={{ position: 'absolute', left: -12, top: -4, color: config.color, animation: 'pulse 1.5s infinite' }}>
            <BellOutlined />
          </div>
        )}
        <Badge
          color={config.color}
          text={
            <span style={{ color: isSmall ? config.color : 'inherit', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
              {config.icon} {!isSmall && config.label}
            </span>
          }
        />
        {strength > 0 && (
          <Progress
            percent={Math.round(strength * 100)}
            strokeColor={config.color}
            size={isSmall ? 'small' : 'default'}
            showInfo={!isSmall}
            format={isSmall ? () => `${Math.round(strength * 100)}%` : null}
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
    <QuestionCircleOutlined style={{ color: '#1890ff', marginLeft: 8 }} />
  </Tooltip>
);

const RiseFallMarketAnalysis = () => {
  const { balance } = useUser();
  const { token } = theme.useToken();
  const [symbol, setSymbol] = useState('R_10');
  const [tickData, setTickData] = useState({});
  const [loading, setLoading] = useState(true);
  const [simpleMode, setSimpleMode] = useState(false);
  const [showAlert, setShowAlert] = useState(true);
  const userBalance = balance;
  const [error, setError] = useState(null);

  // Memoized combined signal
  const combinedSignal = useMemo(() => combineSignals(tickData[symbol] || [], symbol, userBalance), [tickData, symbol, userBalance]);

  // Get price movements
  const priceMovements = useMemo(() => {
    const ticks = tickData[symbol] || [];
    const movements = [];
    for (let i = 1; i < ticks.length; i++) {
      movements.push(ticks[i].price > ticks[i - 1].price ? 'up' : 'down');
    }
    return movements.reverse();
  }, [tickData, symbol]);

  // WebSocket subscription for all symbols
  useEffect(() => {
    let unsubscribers = [];
    let isMounted = true;

    const subscribeToAllSymbols = async () => {
      setLoading(true);
      // Retry logic with exponential backoff
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

        // Initialize tickData for all symbols
        setTickData((prev) => {
          const updated = { ...prev };
          volatilityOptions.forEach((option) => {
            if (!updated[option.value]) updated[option.value] = [];
          });
          return updated;
        });

        // Handle WebSocket messages
        const handleTick = (event, data) => {
          if (!isMounted) return;
          if (event === 'message' && data.msg_type === 'tick') {
            const { symbol: tickSymbol, quote, epoch } = data.tick;
            setTickData((prev) => ({
              ...prev,
              [tickSymbol]: [...(prev[tickSymbol] || []), { price: quote, timestamp: epoch }].slice(-60),
            }));
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
            }
            setLoading(false);
          } else if (event === 'error') {
            console.error('WebSocket error:', data);
            setError('A connection issue occurred while retrieving data.');
            setLoading(false);
          }
        };

        // Subscribe to all symbols
        volatilityOptions.forEach((option) => {
          const unsubscribe = publicWebSocket.subscribe(handleTick);
          unsubscribers.push(unsubscribe);
          publicWebSocket.subscribeToTicks(option.value);
        });

        // Fetch historical ticks with batching
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
  }, []);

  // Analysis functions with explanations
  const analyses = [
    { key: 'sma', name: 'SMA', func: () => analyzeSMACrossover(tickData[symbol] || [], symbol), explanation: 'Moving averages smooth price data to identify trend direction. A crossover suggests a potential trend change.' },
    { key: 'stochastic', name: 'Stochastic', func: () => analyzeStochastic(tickData[symbol] || [], symbol), explanation: 'Measures momentum by comparing closing prices to recent price ranges. Overbought/oversold levels may signal reversals.' },
    { key: 'streak', name: 'Streak', func: () => analyzeTickStreak(tickData[symbol] || [], symbol), explanation: 'Tracks consecutive price movements in one direction. Extended streaks often precede reversals.' },
    { key: 'volatility', name: 'Volatility', func: () => analyzeVolatilitySpike(tickData[symbol] || []), explanation: 'Measures price fluctuation intensity. High volatility indicates larger price swings and higher risk.' },
    { key: 'risk', name: 'Risk', func: () => analyzeRisk(userBalance, symbol), explanation: 'Calculates optimal stake size based on account balance and market conditions.' },
    { key: 'combined', name: 'Summary', func: () => combinedSignal, explanation: 'Aggregates all indicators to provide a comprehensive trading recommendation.' },
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
                <SignalIndicator signal={signal} strength={confidence} showAlert={showAlert && confidence > 0.7} />
              </Space>
            }
            description={details}
            type={signal === 'rise' ? 'success' : signal === 'fall' ? 'error' : signal === 'warning' ? 'warning' : 'info'}
            showIcon
          />
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card size="small" title={<Text style={{ color: 'var(--text-color)' }}>Recent Price Movements</Text>}>
                <PriceMovementChart movements={priceMovements} />
              </Card>
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
    <div className="market-analysis-container">
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
            <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>Rise/Fall Market Analysis</Title>
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="Toggle simple mode">
              <Switch size="small" checked={simpleMode} onChange={setSimpleMode} />
            </Tooltip>
          </Space>
        }
        className="market-analysis-card"
        Style={{ padding: simpleMode ? '16px 8px' : 16 }}
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
              <Card size="small" Style={{ padding: '8px 16px' }}>
                <Row gutter={16}>
                  <Col span={12}>
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
                  <Col span={12}>
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
                </Row>
              </Card>
            </Col>
          </Row>
          <Card size="small" title={<Text style={{ color: 'var(--text-color)' }}>Alert Configuration</Text>}>
            <Space>
              <Text>Visual Alerts:</Text>
              <Switch size="small" checked={showAlert} onChange={setShowAlert} />
            </Space>
          </Card>
          {error && (
            <Alert message={error} type="error" showIcon />
          )}
          <Spin spinning={loading} tip="Loading market data...">
            {simpleMode ? (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Card>
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <SignalIndicator signal={combinedSignal.signal} strength={combinedSignal.confidence} showAlert={showAlert && combinedSignal.confidence > 0.7} />
                    <Text>{combinedSignal.details}</Text>
                    <Text type="secondary" style={{color:'var(--text-color)'}}><small>Based on {(tickData[symbol] || []).length} recent ticks</small></Text>
                  </Space>
                </Card>
                <PriceMovementChart movements={priceMovements.slice(0, 10)} />
              </Space>
            ) : (
              <Tabs defaultActiveKey="combined" size="small" tabPosition="top" type="line" style={{ marginTop: 8 }}>
                {analyses.map((analysis) => (
                  <TabPane
                    tab={
                      <Space size={4}>
                        <span>{analysis.name}</span>
                        {analysis.key === 'combined' && (
                          <Badge dot color={combinedSignal.signal === 'rise' ? '#52c41a' : combinedSignal.signal === 'fall' ? '#f5222d' : '#faad14'} />
                        )}
                      </Space>
                    }
                    key={analysis.key}
                  >
                    {renderAnalysis(analysis)}
                  </TabPane>
                ))}
              </Tabs>
            )}
          </Spin>
        </Space>
      </Card>
    </div>
  );
};

export default RiseFallMarketAnalysis;