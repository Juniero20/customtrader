import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Card, 
  Radio, 
  InputNumber, 
  Row, 
  Col, 
  Space, 
  Typography,
  Select,
  Badge,
  Statistic,
  Progress,
  Divider,
  Tooltip,
  Alert,
  ConfigProvider,
  theme,
  Spin,
} from 'antd';
import { 
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  LineChartOutlined,
  NumberOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useUser } from '../../../context/AuthContext';
import { useContracts } from '../../../context/ContractsContext';
import RequestIdGenerator from '../../../services/uniqueIdGenerator'; 
import Notification from '../../../utils/Notification';

const { Option } = Select;
const { Title, Text } = Typography;

// Payout multipliers for Over and Under contracts
const PAYOUT_MULTIPLIERS = {
  over: {
    0: 0.062,  // 10.62 for amount = 10
    1: 0.188,  // 11.88
    2: 0.348,  // 13.48
    3: 0.558,  // 15.58
    4: 0.845,  // 18.45 
    5: 1.262,  // 22.62
    6: 1.924,  // 29.24
    7: 3.132,  // 41.32
    8: 6.042,  // 70.42
    9: null,   // Invalid
  },
  under: {
    0: null,   // Invalid
    1: 6.042,  // 70.42
    2: 3.132,  // 41.32
    3: 1.924,  // 29.24
    4: 1.262,  // 22.62 
    5: 0.845,  // 18.45
    6: 0.558,  // 15.58
    7: 0.348,  // 13.48
    8: 0.188,  // 11.88
    9: 0.062,  // 10.62
  },
};

const OverUnderTrader = () => {
  const { user, sendAuthorizedRequest, isAuthorized, loading, error, balance } = useUser(); 
  const { addLiveContract } = useContracts();
  const { token } = theme.useToken();
  const [duration, setDuration] = useState(5);
  const [selectedDigit, setSelectedDigit] = useState(1); // Default to 1
  const [basis, setBasis] = useState('stake');
  const [symbol, setSymbol] = useState('R_10');
  const [amount, setAmount] = useState(10);
  const [contractType, setContractType] = useState('over');
  const [payout, setPayout] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({
    type: '',
    content: '',
    trigger: false,
  });

  const showNotification = (type, content) => {
    setNotification({ type, content, trigger: true });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, trigger: false }));
    }, 500);
  };

  // Adjust amount when user changes (e.g., after account switch)
  useEffect(() => {
    if (user && balance) {
      setAmount(Math.min(amount, balance || 1000)); // Ensure amount doesn’t exceed balance
    }
  }, [user]);

  // Calculate payout based on contract type and selected digit
  useEffect(() => {
    const multiplier = PAYOUT_MULTIPLIERS[contractType][selectedDigit];
    setPayout(multiplier !== null ? amount * (1 + multiplier) : 0);
  }, [amount, contractType, selectedDigit]);

  const isValidContract = (type, digit) => {
    return PAYOUT_MULTIPLIERS[type][digit] !== null;
  };

  const handleSubmit = async (type) => {
    if (!user || !isAuthorized || !user.token) {
      showNotification('warning', 'Please select an account and ensure it is authorized.');
      return;
    }

    if (!amount || amount <= 0) {
      showNotification('warning', 'Please enter a valid amount.');
      return;
    }

    if (duration < 1 || duration > 10) {
      showNotification('warning', 'Please select a tick duration between 1 and 10.');
      return;
    }

    if (selectedDigit < 0 || selectedDigit > 9) {
      showNotification('warning', 'Please select a digit between 0 and 9.');
      return;
    }

    if (!isValidContract(type, selectedDigit)) {
      showNotification('error', `Invalid contract: ${type === 'over' ? 'Over 9' : 'Under 0'} is not allowed.`);
      return;
    }

    setIsSubmitting(true);

    const req_id = RequestIdGenerator.generateContractId();
    const contractData = {
      buy: 1,
      price: amount,
      parameters: {
        amount: amount,
        basis: basis,
        contract_type: type === 'over' ? 'DIGITOVER' : 'DIGITUNDER',
        currency: user.currency || 'USD',
        duration: duration,
        duration_unit: 't',
        symbol: symbol,
        barrier: selectedDigit.toString(),
      },
      loginid: user.loginid,
      req_id: req_id,
    };

    try {
      const response = await sendAuthorizedRequest(contractData);
      const contractId = response?.buy?.contract_id;
      if (!contractId) {
        throw new Error('No contract_id returned from purchase');
      }

      const contract = {
        contract_id: contractId,
        type: type,
        symbol,
        status: 'open',
        details: {
          amount,
          currency: user.currency || 'USD',
          contract_type: type === 'over' ? 'DIGITOVER' : 'DIGITUNDER',
          duration: duration,
          duration_unit: 't',
          barrier: selectedDigit.toString(),
        },
      };

      addLiveContract(contract);
      showNotification('success', `Successfully purchased ${type === 'over' ? 'Over' : 'Under'} contract`);
    } catch (error) {
      console.error('Error purchasing contract:', error.message);
      showNotification('error', `Failed to purchase contract: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <ConfigProvider
      theme={{
        components: {
          Card: {
            borderRadiusLG: 16,
          },
          Button: {
            colorPrimary: token.colorPrimary,
            colorPrimaryHover: `${token.colorPrimary}dd`,
          }
        }
      }}
    >
      <Row gutter={[24, 24]}>
        <Notification
          type={notification.type}
          content={notification.content}
          trigger={notification.trigger}
        />
        <Col xs={24}>
          {loading ? (
            <Spin tip="Loading account details..." size="large" style={{ display: 'block', margin: '50px auto' }} />
          ) : error ? (
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
              style={{ marginBottom: 24 }}
            />
          ) : !user || !isAuthorized ? (
            <Alert
              message="No Active Account"
              description="Please select an account and ensure it is authorized to proceed."
              type="warning"
              showIcon
              style={{ marginBottom: 24 }}
            />
          ) : null}

          {error && error.includes('Invalid token') && (
            <Alert
              message="Session Expired"
              description="Your session has expired. Redirecting to login..."
              type="error"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}

          <Card
            title={
              <Space>
                <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>Over/Under Contract</Title>
              </Space>
            }
            style={{ 
              borderRadius: 16,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}
            extra={
              <Tooltip title="Predict whether the last digit is over or under your selected digit">
                <InfoCircleOutlined style={{ color: token.colorPrimary }} />
              </Tooltip>
            }
          >
            <>
              <Space direction="vertical" size={24} style={{ width: '100%', marginTop: 16 }}>
                {/* Symbol Selector */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Volatility Index</Text>
                  <Select
                    value={symbol}
                    onChange={setSymbol}
                    style={{ width: '100%' }}
                    placeholder="Select a volatility index"
                    optionLabelProp="label"
                    disabled={!user || !isAuthorized}
                  >
                    {volatilityOptions.map(option => (
                      <Option 
                        key={option.value} 
                        value={option.value}
                        label={<span>{option.label}</span>}
                      >
                        <span>{option.label}</span>
                      </Option>
                    ))}
                  </Select>
                </div>

                {/* Tick Duration Selector */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Duration (Ticks)</Text>
                  <Row justify="space-between" style={{ padding: '0 10px' }}>
                    {[...Array(10)].map((_, i) => {
                      const tick = i + 1;
                      const isActive = tick === duration;
                      const IconComponent = isActive ? CheckCircleOutlined : CloseCircleOutlined;

                      return (
                        <Col key={tick}>
                          <Tooltip title={`${tick} tick${tick > 1 ? 's' : ''}`}>
                            <IconComponent
                              style={{
                                fontSize: 24,
                                color: isActive ? token.colorPrimary : token.colorBorder,
                                cursor: user && isAuthorized ? 'pointer' : 'not-allowed',
                              }}
                              onClick={() => user && isAuthorized && setDuration(tick)}
                            />
                          </Tooltip>
                        </Col>
                      );
                    })}
                  </Row>
                  <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 8, color:'var(--text-color)' }}>
                    Selected: {duration} tick{duration > 1 ? 's' : ''}
                  </Text>
                </div>

                {/* Digit Selection */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Select Digit (0-9)</Text>
                  <Row justify="space-between" style={{ padding: '0 5px', color:'var(--text-color)'}}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                      <Col key={digit}>
                        <Badge
                          showZero
                          count={digit}
                          style={{
                            backgroundColor: selectedDigit === digit ? token.colorPrimary : token.colorFillAlter,
                            color: selectedDigit === digit ? 'white' : 'var(--text-color)',
                            fontSize: 16,
                            width: 32,
                            height: 32,
                            lineHeight: '32px',
                            borderRadius: '50%',
                            cursor: user && isAuthorized ? 'pointer' : 'not-allowed',
                            boxShadow: selectedDigit === digit ? `0 0 0 2px ${token.colorPrimary}` : 'none',
                            transition: 'all 0.3s'
                          }}
                          onClick={() => user && isAuthorized && setSelectedDigit(digit)}
                        />
                      </Col>
                    ))}
                  </Row>
                  <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 8, color:'var(--text-color)' }}>
                    Selected: {selectedDigit}
                  </Text>
                </div>

                {/* Basis Selection */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Basis</Text>
                  <Radio.Group 
                    value={basis} 
                    onChange={(e) => setBasis(e.target.value)} 
                    buttonStyle="solid"
                    style={{ width: '100%' }}
                    disabled={!user || !isAuthorized}
                  >
                    <Radio.Button value="stake" style={{ width: '50%', textAlign: 'center' }}>
                      <DollarOutlined style={{ marginRight: 8 }} />
                      Stake
                    </Radio.Button>
                    <Radio.Button value="payout" style={{ width: '50%', textAlign: 'center' }}>
                      <LineChartOutlined style={{ marginRight: 8 }} />
                      Payout
                    </Radio.Button>
                  </Radio.Group>
                </div>

                {/* Amount Input */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Amount ({user?.currency || 'USD'})
                  </Text>
                  <InputNumber
                    min={1}
                    max={user?.balance || 1000}
                    value={amount}
                    onChange={setAmount}
                    style={{ width: '100%' }}
                    precision={2}
                    prefix={<DollarOutlined />}
                    step={5}
                    disabled={!user || !isAuthorized}
                  />
                  <Text type="secondary" style={{ display: 'block', marginTop: 8, color:'var(--neutral-color)' }}>
                    Available balance: {(balance || 0).toFixed(2)} {user?.currency || 'USD'}
                  </Text>
                </div>

                {/* Payout Information */}
                <div>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic
                        title={
                          <Space style={{ color:'var(--text-color)'}}>
                            Potential Payout (Over)
                            <Tooltip title={`Over ${selectedDigit} yields a ${(PAYOUT_MULTIPLIERS.over[selectedDigit] * 100).toFixed(1)}% return for valid digits (0-8)`}>
                              <InfoCircleOutlined />
                            </Tooltip>
                          </Space>
                        }
                        value={contractType === 'over' ? payout : (PAYOUT_MULTIPLIERS.over[selectedDigit] !== null ? amount * (1 + PAYOUT_MULTIPLIERS.over[selectedDigit]) : 0)}
                        precision={2}
                        prefix={<ArrowUpOutlined style={{ color: token.colorSuccess }} />}
                        valueStyle={{ color: token.colorSuccess }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title={
                          <Space style={{ color:'var(--text-color)'}}>
                            Potential Payout (Under)
                            <Tooltip title={`Under ${selectedDigit} yields a ${(PAYOUT_MULTIPLIERS.under[selectedDigit] * 100).toFixed(1)}% return for valid digits (1-9)`}>
                              <InfoCircleOutlined />
                            </Tooltip>
                          </Space>
                        }
                        value={contractType === 'under' ? payout : (PAYOUT_MULTIPLIERS.under[selectedDigit] !== null ? amount * (1 + PAYOUT_MULTIPLIERS.under[selectedDigit]) : 0)}
                        precision={2}
                        prefix={<ArrowUpOutlined style={{ color: token.colorSuccess }} />}
                        valueStyle={{ color: token.colorSuccess }}
                      />
                    </Col>
                  </Row>
                </div>

                {/* Action Buttons */}
                <Row gutter={16}>
                  <Col span={12}>
                    <Button
                      type="primary"
                      size="large"
                      block
                      style={{ 
                        background: '#722ed1',
                        borderColor: '#722ed1',
                        height: 48
                      }}
                      onClick={() => {
                        setContractType('over');
                        handleSubmit('over');
                      }}
                      loading={isSubmitting && contractType === 'over'}
                      disabled={isSubmitting || !user || !isAuthorized || !isValidContract('over', selectedDigit)}
                    >
                      Over {selectedDigit}
                    </Button>
                  </Col>
                  <Col span={12}>
                    <Button
                      type="primary"
                      size="large"
                      block
                      style={{ height: 48 }}
                      onClick={() => {
                        setContractType('under');
                        handleSubmit('under');
                      }}
                      loading={isSubmitting && contractType === 'under'}
                      disabled={isSubmitting || !user || !isAuthorized || !isValidContract('under', selectedDigit)}
                    >
                      Under {selectedDigit}
                    </Button>
                  </Col>
                </Row>
              </Space>
            </>
          </Card>
        </Col>

      </Row>
    </ConfigProvider>
  );
};

export default OverUnderTrader;