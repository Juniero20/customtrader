import React, { useState, useEffect } from 'react';
import {
    Button,
    Card,
    Select,
    InputNumber,
    Row,
    Col,
    Space,
    Typography,
    Alert,
    ConfigProvider,
    Spin,
    Tooltip,
    Checkbox,
    Radio,
    message,
    theme,
} from 'antd';
import {
    ThunderboltOutlined,
    InfoCircleOutlined,
    DollarOutlined,
} from '@ant-design/icons';

import { useUser } from '../../../context/AuthContext';
import { useContracts } from '../../../context/ContractsContext';
import RequestIdGenerator from '../../../services/uniqueIdGenerator';

const { Title, Text } = Typography;
const { Option } = Select;

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

const AccumulatorContract = () => {
    const { user, sendAuthorizedRequest, isAuthorized, loading, error, balance } = useUser();
    const { addLiveContract } = useContracts();
    const { token } = theme.useToken();

    // State for all fields
    const [symbol, setSymbol] = useState('R_10');
    const [growthRate, setGrowthRate] = useState(1);
    const [amount, setAmount] = useState(10);
    const [basis, setBasis] = useState('stake');
    const [enableProfit, setEnableProfit] = useState(false);
    const [profit, setProfit] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Ensure amount does not exceed balance
    useEffect(() => {
        if (user && balance !== undefined) {
            setAmount((prev) => Math.min(prev, balance || 1000));
        }
    }, [user, balance]);

    // Reset profit if take profit is disabled
    useEffect(() => {
        if (!enableProfit) setProfit(0);
    }, [enableProfit]);

    const handleSubmit = async () => {
        if (!user || !isAuthorized) {
            message.warning('Please select an account and ensure it is authorized.');
            return;
        }
        if (!symbol) {
            message.warning('Please select a volatility index.');
            return;
        }
        if (!growthRate) {
            message.warning('Please select a growth rate.');
            return;
        }
        if (!amount || amount < 1) {
            message.warning('Please enter a valid amount.');
            return;
        }
        if (amount > balance) {
            message.warning('Amount exceeds balance.');
            return;
        }
        if (enableProfit && (profit < 1 || profit > balance)) {
            message.warning(`Profit must be between 1 and ${balance?.toFixed(2)}`);
            return;
        }

        setIsSubmitting(true);
        const requestId = RequestIdGenerator.generateContractId();
        const contractData = {
            buy: 1,
            price: amount,
            parameters: {
                symbol: symbol,
                amount: amount,
                basis: basis,
                contract_type: 'ACCU',
                growth_rate: growthRate * 0.01,
                currency: user.currency || 'USD',
                limit_order: enableProfit ? { take_profit: profit } : {},
            },
            loginid: user.loginid,
            req_id: requestId,
        };
        try {
            const response = await sendAuthorizedRequest(contractData);
            const contractId = response?.buy?.contract_id;
            if (!contractId) throw new Error('No contract id returned from purchase');
            addLiveContract && addLiveContract(response.buy);
            message.success('Accumulator contract purchased successfully!');
            // Reset fields
            setSymbol('R_10');
            setGrowthRate(1);
            setAmount(10);
            setBasis('stake');
            setEnableProfit(false);
            setProfit(0);
        } catch (err) {
            message.error(`Failed to purchase contract: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ConfigProvider>
            <Row gutter={[24, 24]}>
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

                    <Card
                        title={
                            <Space>
                                <ThunderboltOutlined style={{ color: token.colorPrimary }}/>
                                <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>Accumulator Contract</Title>
                            </Space>
                        }
                        style={{
                            borderRadius: 16,
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                        }}
                        extra={
                            <Tooltip title="Accumulator contracts allow you to accumulate profit over a series of ticks.">
                                <InfoCircleOutlined style={{ color: token.colorPrimary }} />
                            </Tooltip>
                        }
                    >
                        <Space direction="vertical" size={24} style={{ width: '100%', marginTop: 16 }}>
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
                                        <DollarOutlined style={{ marginRight: 8 }} />
                                        Payout
                                    </Radio.Button>
                                </Radio.Group>
                            </div>

                            {/* Volatility Index */}
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
                                        <Option key={option.value} value={option.value} label={option.label}>
                                            {option.label}
                                        </Option>
                                    ))}
                                </Select>
                            </div>

                            {/* Growth Rate */}
                            <div>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Growth rate (%)</Text>
                                <Select
                                    value={growthRate}
                                    onChange={setGrowthRate}
                                    style={{ width: '100%' }}
                                    disabled={!user || !isAuthorized}
                                >
                                    {growthRates.map(option => (
                                        <Option key={option.value} value={option.value}>
                                            {option.label}
                                        </Option>
                                    ))}
                                </Select>
                            </div>

                            {/* Amount */}
                            <div>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                    Amount ({user?.currency || 'USD'})
                                </Text>
                                <InputNumber
                                    min={1}
                                    max={balance || 1000}
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

                            {/* Enable Take Profit */}
                            <div>
                                <Checkbox
                                    checked={enableProfit}
                                    onChange={e => setEnableProfit(e.target.checked)}
                                    disabled={!user || !isAuthorized}
                                >
                                    Enable Take Profit
                                </Checkbox>
                            </div>

                            {/* Take Profit Input */}
                            {enableProfit && (
                                <div>
                                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                        Take Profit ({user?.currency || 'USD'})
                                    </Text>
                                    <InputNumber
                                        min={1}
                                        max={balance || 1000}
                                        value={profit}
                                        onChange={setProfit}
                                        style={{ width: '100%' }}
                                        precision={2}
                                        prefix={<DollarOutlined />}
                                        step={5}
                                        disabled={!user || !isAuthorized}
                                    />
                                </div>
                            )}

                            {/* Purchase Button */}
                            <Button
                                type="primary"
                                size="large"
                                block
                                style={{
                                    background: '#722ed1',
                                    borderColor: '#722ed1',
                                    height: 48
                                }}
                                onClick={handleSubmit}
                                loading={isSubmitting}
                                disabled={isSubmitting || !user || !isAuthorized}
                            >
                                Purchase Accumulator
                            </Button>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </ConfigProvider>
    );
};

export default AccumulatorContract;
