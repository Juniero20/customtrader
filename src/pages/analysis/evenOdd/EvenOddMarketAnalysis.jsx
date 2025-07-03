import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Select,
  Tabs,
  Spin,
  Progress,
  Typography,
  Collapse,
  theme,
  Space,
  Row,
  Col,
  Statistic,
  Tooltip,
  Alert,
  Badge,
  Switch,
  Grid,
} from 'antd';
import {
  LineChartOutlined,
  QuestionCircleOutlined,
  NumberOutlined,
  PauseOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { publicWebSocket } from '../../../services/public_websocket_client';
import {
  analyzeSMACrossover,
  analyzeStochastic,
  analyzeTickStreak,
  analyzeVolatilitySpike,
  analyzeRisk,
  combineSignals,
} from './evenOddAnalysis';
import '../../../assets/css/pages/analysis/MarketAnalysis.css';
import { useUser } from '../../../context/AuthContext';

const { Option } = Select;
const { TabPane } = Tabs;
const { Text, Title } = Typography;
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

// Unchanged components: DigitHistoryChart, EvenOddIndicator, SignalIndicator, AnalysisExplanation
const DigitHistoryChart = ({ digits }) => {
  const { md } = Grid.useBreakpoint();
  const chunkSize = md ? 12 : 5;
  const digitGroups = [];
  for (let i = 0; i < digits.length; i += chunkSize) {
    digitGroups.push(digits.slice(i, i + chunkSize));
  }
  return (
    <Card size="small" title={<Text style={{ color: 'var(--text-color)' }}>Recent Digits History</Text>}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {digitGroups.map((group, groupIndex) => (
          <div key={groupIndex} style={{ display: 'flex', justifyContent: 'center' }}>
            {group.map((digit, index) => (
              <div
                key={`${groupIndex}-${index}`}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: digit % 2 === 0 ? '#52c41a' : '#f5222d',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: 4,
                  fontWeight: 'bold',
                }}
              >
                {digit}
              </div>
            ))}
          </div>
        ))}
      </Space>
    </Card>
  );
};

const EvenOddIndicator = ({ digit }) => {
  const isEven = digit % 2 === 0;
  const strength = isEven ? 80 : 20;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 0' }}>
      <Text strong style={{ width: 24 }}>{digit}</Text>
      <Progress
        percent={strength}
        strokeColor={isEven ? '#52c41a' : '#f5222d'}
        showInfo={false}
        strokeWidth={10}
        trailColor="#f0f0f0"
      />
      <Text type={isEven ? 'success' : 'danger'}>{isEven ? 'EVEN' : 'ODD'}</Text>
    </div>
  );
};

const SignalIndicator = ({ signal, strength, size = 'default', showAlert = false }) => {
  const signalConfig = {
    even: { color: '#52c41a', icon: <NumberOutlined />, label: 'EVEN', explanation: 'The last digit is likely to be even' },
    odd: { color: '#f5222d', icon: <NumberOutlined />, label: 'ODD', explanation: 'The last digit is likely to be odd' },
    neutral: {
      color: '#faad14',
      icon: <PauseOutlined />,
      label: 'NEUTRAL',
      explanation: 'No clear prediction for even/odd',
    },
    warning: {
      color: '#fa541c',
      icon: <WarningOutlined />,
      label: 'WARNING',
      explanation: 'High volatility detected - trade with caution',
    },
    hold: {
      color: '#1890ff',
      icon: <InfoCircleOutlined />,
      label: 'HOLD',
      explanation: 'Not recommended to trade at this time',
    },
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
          <div
            style={{
              position: 'absolute',
              left: -12,
              top: -4,
              color: config.color,
              animation: 'pulse 1.5s infinite',
            }}
          >
            <BellOutlined />
          </div>
        )}
        <Badge
          showZero
          color={config.color}
          text={
            <span
              style={{
                color: isSmall ? config.color : 'inherit',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
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

const AnalysisExplanation = ({ title, content }) => (
  <Tooltip
    title={
      <div style={{ padding: 8 }}>
        <Text strong>{title}</Text>
        <div style={{ marginTop: 4 }}>{content}</div>
      </div>
    }
    Style={{ maxWidth: 300 }}
    placement="right"
  >
    <QuestionCircleOutlined style={{ color: '#1890ff', marginLeft: 8 }} />
  </Tooltip>
);

const EvenOddMarketAnalysis = () => {
  const { balance } = useUser();
  const [symbol, setSymbol] = useState('R_10');
  const { token } = theme.useToken();
  const [tickData, setTickData] = useState({}); // Initialize as empty object
  const [loading, setLoading] = useState(true);
  const [simpleMode, setSimpleMode] = useState(false);
  const [showAlert, setShowAlert] = useState(true);
  const [error, setError] = useState(null);
  const userBalance = balance;

  // Utility to format price with exactly two decimal places
  const formatPrice = (price) => {
    if (typeof price !== 'number' && typeof price !== 'string') return '--';
    const priceStr = price.toString().replace(/,/g, '');
    const [integerPart, decimalPart = ''] = priceStr.split('.');
    const normalizedDecimal = decimalPart.padEnd(2, '0').slice(0, 2); // Ensure 2 decimal places
    return `${integerPart}.${normalizedDecimal}`;
  };

  // Memoized combined signal
  const combinedSignal = useMemo(
    () => combineSignals(tickData[symbol] || [], symbol, userBalance),
    [tickData, symbol, userBalance]
  );

  // Get last digits
  const lastDigits = useMemo(() => {
    const ticks = tickData[symbol] || [];
    //console.log('tickData[symbol]:', ticks); // Debug log
    const digits = ticks
      .map((tick) => {
        if (!tick?.price) {
          //console.warn('Invalid tick price:', tick); // Debug invalid data
          return null;
        }
        const priceStr = tick.price.toString().replace(/,/g, '');
        const decimalParts = priceStr.split('.');
        if (decimalParts.length < 2 || !decimalParts[1]) {
          //console.log(`No decimal part for price ${priceStr}, returning 0`); // Debug
          return 0;
        }
        const decimalStr = decimalParts[1].padEnd(2, '0'); // Ensure at least 2 decimal places
        const lastChar = decimalStr[decimalStr.length - 1];
        const digit = parseInt(lastChar, 10);
        //console.log(`Price: ${priceStr}, Normalized Decimal: ${decimalStr}, Last digit: ${digit}`); // Debug
        return digit;
      })
      .filter((digit) => digit !== null)
      .reverse();

    return digits;
  }, [tickData, symbol]);

  // Get last digit
  const lastDigit = useMemo(() => {
    if (lastDigits.length === 0) return null;
    return lastDigits[0];
  }, [lastDigits]);

  // WebSocket subscription for all symbols
  useEffect(() => {
    let unsubscribers = [];
    let isMounted = true;

    const subscribeToAllSymbols = async () => {
      setLoading(true);
      // Retry logic for WebSocket connection
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
            await new Promise((resolve) => setTimeout(resolve, 1000)); // 1s delay to avoid rate limits
          }
        };

        await fetchHistorical();
      } catch (err) {
        console.error('WebSocket Error:', err);
        if (isMounted) {
          setError('Failed to connect to WebSocket. Please check your network or app ID.');
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
    {
      key: 'sma',
      name: 'SMA',
      func: () => analyzeSMACrossover(tickData[symbol] || [], symbol),
      explanation: 'Moving averages of last digits predict if the next digit will be even or odd.',
    },
    {
      key: 'stochastic',
      name: 'Stochastic',
      func: () => analyzeStochastic(tickData[symbol] || [], symbol),
      explanation: 'Analyzes digit frequency to identify even/odd clustering patterns.',
    },
    {
      key: 'streak',
      name: 'Streak',
      func: () => analyzeTickStreak(tickData[symbol] || [], symbol),
      explanation: 'Identifies consecutive even/odd sequences. Long streaks often reverse.',
    },
    {
      key: 'volatility',
      name: 'Volatility',
      func: () => analyzeVolatilitySpike(tickData[symbol] || []),
      explanation: 'Measures digit fluctuation speed. High volatility means unpredictable digits.',
    },
    {
      key: 'risk',
      name: 'Risk',
      func: () => analyzeRisk(balance, symbol),
      explanation: 'Calculates optimal stake size based on your balance and market conditions.',
    },
    {
      key: 'combined',
      name: 'Summary',
      func: () => combinedSignal,
      explanation: 'Combines all indicators to provide the overall trading recommendation.',
    },
  ];

  // Render analysis result
  const renderAnalysis = (analysis) => {
    if (!analysis) return <Text>No data available for analysis.</Text>;

    const result = analysis.func();
    if (!result) return null;

    if (analysis.key === 'combined') {
      const { signal, confidence, details, individualSignals } = result;
      return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            message={
              <Space>
                <Text strong>Recommendation:</Text>
                <SignalIndicator
                  signal={signal}
                  strength={confidence}
                  showAlert={showAlert && confidence > 0.7}
                />
              </Space>
            }
            description={details}
            type={
              signal === 'even' ? 'success' : signal === 'odd' ? 'error' : signal === 'warning' ? 'warning' : 'info'
            }
            showIcon
          />
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <DigitHistoryChart digits={lastDigits} />
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
                        <Text type="secondary" style={{ color: 'var(--text-color)' }}>
                          {res?.details || 'No details'}
                        </Text>
                        {(key === 'sma' || key === 'stochastic') && res?.rawData && (
                          <EvenOddIndicator
                            digit={key === 'stochastic' ? res.rawData.maxDigit : Math.round(res.rawData.fastSMA)}
                          />
                        )}
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

    const { signal, strength, details, rawData } = result;
    return (
      <Card size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <SignalIndicator signal={signal} strength={strength} size="small" />
            <AnalysisExplanation title={analysis.name} content={analysis.explanation} />
          </Space>
          <Text>{details}</Text>
          {(analysis.key === 'sma' || analysis.key === 'stochastic') && rawData && (
            <EvenOddIndicator
              digit={analysis.key === 'stochastic' ? rawData.maxDigit : Math.round(rawData.fastSMA)}
            />
          )}
          {analysis.key === 'streak' && rawData && (
            <DigitHistoryChart digits={rawData.slice(0, 10).map((item) => item.digit)} />
          )}
        </Space>
      </Card>
    );
  };

  return (
    <div className="market-analysis-container">
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <Card
        title={
          <Space>
            <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>
              Even/Odd Market Analysis
            </Title>
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
              <Card size="small" style={{ padding: '8px 16px' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title={<Text style={{ color: 'var(--text-color)' }}>Current Price</Text>}
                      value={
                        tickData[symbol]?.length > 0
                          ? formatPrice(tickData[symbol][tickData[symbol].length - 1].price)
                          : '--'
                      }
                      valueStyle={{
                        color: lastDigit !== null ? (lastDigit % 2 === 0 ? '#52c41a' : '#f5222d') : 'inherit',
                      }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={<Text style={{ color: 'var(--text-color)' }}>Last Digit</Text>}
                      value={lastDigit !== null ? lastDigit : '--'}
                      prefix={<NumberOutlined />}
                      valueStyle={{
                        color: lastDigit !== null ? (lastDigit % 2 === 0 ? '#52c41a' : '#f5222d') : 'inherit',
                      }}
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
                    <SignalIndicator
                      signal={combinedSignal.signal}
                      strength={combinedSignal.confidence}
                      showAlert={showAlert && combinedSignal.confidence > 0.7}
                    />
                    {lastDigit !== null && <EvenOddIndicator digit={lastDigit} />}
                    <Text>{combinedSignal.details}</Text>
                    <Text type="secondary" style={{ color: 'var(--text-color)' }}>
                      <small>Based on {(tickData[symbol] || []).length} recent ticks</small>
                    </Text>
                  </Space>
                </Card>
                <DigitHistoryChart digits={lastDigits.slice(0, 10)} />
              </Space>
            ) : (
              <Tabs defaultActiveKey="combined" size="small" tabPosition="top" type="line" style={{ marginTop: 8 }}>
                {analyses.map((analysis) => (
                  <TabPane
                    tab={
                      <Space size={4}>
                        <span>{analysis.name}</span>
                        {analysis.key === 'combined' && (
                          <Badge
                            dot
                            color={
                              combinedSignal.signal === 'even'
                                ? '#52c41a'
                                : combinedSignal.signal === 'odd'
                                ? '#f5222d'
                                : '#faad14'
                            }
                          />
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

export default EvenOddMarketAnalysis;