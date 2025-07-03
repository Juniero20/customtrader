import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Statistic,
  Progress,
  Layout,
  Spin,
  Space,
  Divider,
  Tag,
  Alert,
  Descriptions,
  theme
} from 'antd';
import {
  ArrowUpOutlined,
  LineChartOutlined,
  WalletOutlined,
  SwapOutlined,
  RiseOutlined,
  FallOutlined,
  NumberOutlined,
} from '@ant-design/icons';
import { useUser } from '../../context/AuthContext';
import VolatilityComparisonChart from '../../components/TickDataGraph';
import { ConfigProvider } from 'antd';
import '../../assets/css/pages/dashboard/DashboardMainContent.css';

const { Title, Text } = Typography;
const { Content } = Layout;

const DashboardMainContent = () => {
  const { user, balance, activeAccount, authLoading, sendAuthorizedRequest } = useUser();
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalProfitLoss: 0,
    totalPurchases: 0,
    totalPayouts: 0,
    numTransactions: 0,
  });
  const [error, setError] = useState(null);
  const [loading] = useState(false);
  const accountId = activeAccount?.loginid;
  const isLoading = authLoading || loading;
  const { token } = theme.useToken();
  const colorPrimary = token.colorPrimary;

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  useEffect(() => {
    if (accountId) {
      const cachedProfitTable = localStorage.getItem(`profitTable_${accountId}`);
      if (cachedProfitTable) {
        const parsedData = JSON.parse(cachedProfitTable);
        const transactions = parsedData?.profit_table?.transactions || [];
        setTransactions(transactions);
        setStats({
          totalProfitLoss: transactions.reduce((sum, tx) => sum + (tx.profit_loss || 0), 0),
          totalPurchases: transactions.reduce((sum, tx) => sum + (tx.buy_price || 0), 0),
          totalPayouts: transactions.reduce((sum, tx) => sum + (tx.payout || 0), 0),
          numTransactions: transactions.length,
        });
      }
    }
  }, [accountId]);

  useEffect(() => {
    if (!accountId) return;
    const fetchProfitTable = async () => {
      setError(null);
      const now = new Date();
      const dateTo = Math.floor(now.getTime() / 1000);
      const dateFrom = dateTo - 30 * 24 * 60 * 60;
      const payload = {
        profit_table: 1,
        description: 1,
        sort: 'DESC',
        date_from: dateFrom,
        date_to: dateTo,
        limit: 100,
      };
      try {
        const response = await sendAuthorizedRequest(payload);
        if (response.error) {
          throw new Error(response.error.message);
        }
        const profitTableData = response.profit_table?.transactions || [];
        setTransactions(profitTableData);
        localStorage.setItem(`profitTable_${accountId}`, JSON.stringify(response));
        setStats({
          totalProfitLoss: profitTableData.reduce((sum, tx) => sum + (tx.sell_price || 0), 0),
          totalPurchases: profitTableData.reduce((sum, tx) => sum + (tx.buy_price || 0), 0),
          totalPayouts: profitTableData.reduce((sum, tx) => sum + (tx.payout || 0), 0),
          numTransactions: profitTableData.length,
        });
      } catch (err) {
        console.error('Error fetching profit table:', err, err.stack);
      }
    };
    fetchProfitTable();
    const interval = setInterval(fetchProfitTable, 30000);
    return () => clearInterval(interval);
  }, [accountId, sendAuthorizedRequest]);

  const latestLosingTrade = transactions
    .filter((tx) => tx.sell_price === 0)
    .sort((a, b) => b.sell_time - a.sell_time)[0];
  const latestWinningTrade = transactions
    .filter((tx) => tx.sell_price > 0)
    .sort((a, b) => b.sell_time - a.sell_time)[0];

  if (!user || isLoading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  const percentageGrowth = stats.totalPurchases
    ? Math.min(((stats.totalProfitLoss / stats.totalPurchases) * 100).toFixed(2), 100)
    : 0;
  const readableSessionDuration = 'in the last 30 days';

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#6C5CE7',
          borderRadius: 8,
          colorBgContainer: 'transparent', // Ensure no white backgrounds
        },
        components: {
          Card: {
            borderRadiusLG: 16,
            headerBg: 'transparent',
          },
        },
      }}
    >
      <div className="dashboard-container">
        <Content className="dashboard-content">
          {error && (
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
              className="error-alert"
            />
          )}
          <Row gutter={[24, 24]} className="welcome-row">
            <Col span={24}>
              <Card className="welcome-card">
                <Title level={2} className="welcome-title">
                  Welcome back, {user?.fullname || 'Trader'}!
                </Title>
                <Text className="welcome-text">Here's your trading overview for the last 30 days</Text>
              </Card>
            </Col>
          </Row>
          <Row gutter={[24, 24]} className="statistic-row">
            <Col xs={24} sm={12} md={6}>
              <Card hoverable className="statistic-card statistic-card-1">
                <Statistic
                  title={
                    <Space>
                      <WalletOutlined className="statistic-icon-1" />
                      <Text className="statistic-title">Account Balance</Text>
                    </Space>
                  }
                  value={balance}
                  precision={2}
                  prefix="$"
                  valueStyle={{ fontSize: 24, fontWeight: 600, color: colorPrimary }}
                />
                <Progress
                  percent={balance ? (balance / (balance + stats.totalPurchases)) * 100 : 0}
                  status="active"
                  showInfo={false}
                  className="progress-bar-1"
                />
                <Text className="statistic-text">Available balance</Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card hoverable className="statistic-card statistic-card-2">
                <Statistic
                  title={
                    <Space>
                      <SwapOutlined className="statistic-icon-2" />
                      <Text className="statistic-title">Total Purchases</Text>
                    </Space>
                  }
                  value={stats.totalPurchases}
                  precision={2}
                  prefix="$"
                  valueStyle={{ fontSize: 24, fontWeight: 600, color: colorPrimary }}
                />
                <Progress
                  percent={stats.totalPurchases ? (stats.totalPurchases / (stats.totalPurchases + balance)) * 100 : 0}
                  status="normal"
                  showInfo={false}
                  className="progress-bar-2"
                />
                <Text className="statistic-text">
                  {stats.numTransactions} transactions {readableSessionDuration}
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card hoverable className="statistic-card statistic-card-3">
                <Statistic
                  title={
                    <Space>
                      <ArrowUpOutlined className="statistic-icon-3" />
                      <Text className="statistic-title">Profit Growth</Text>
                    </Space>
                  }
                  value={stats.totalProfitLoss}
                  precision={2}
                  prefix="$"
                  valueStyle={{ fontSize: 24, fontWeight: 600, color: colorPrimary }}
                  className="statistic-value-3"
                />
                <Progress
                  percent={percentageGrowth}
                  status={percentageGrowth >= 0 ? 'active' : 'exception'}
                  showInfo={false}
                  className="progress-bar-3"
                />
                <Text className="statistic-text">
                  {percentageGrowth}% Growth {readableSessionDuration}
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card hoverable className="statistic-card statistic-card-4">
                <Statistic
                  title={
                    <Space>
                      <LineChartOutlined className="statistic-icon-4" />
                      <Text className="statistic-title">Total Payouts</Text>
                    </Space>
                  }
                  value={stats.totalPayouts}
                  precision={2}
                  prefix="$"
                  valueStyle={{ fontSize: 24, fontWeight: 600, color: colorPrimary }}
                  className="statistic-value-4"
                />
                <Progress
                  percent={stats.totalPayouts ? (stats.totalPayouts / (stats.totalPayouts + stats.totalPurchases)) * 100 : 0}
                  status="exception"
                  showInfo={false}
                  className="progress-bar-4"
                />
                <Text className="statistic-text">
                  {stats.numTransactions} transactions {readableSessionDuration}
                </Text>
              </Card>
            </Col>
          </Row>
          <Row gutter={[24, 24]} className="volatility-row">
            <Col span={24}>
              <Card
                title={
                  <Space>
                    <LineChartOutlined className="volatility-icon" />
                    <Text strong className="volatility-title">
                      Tick Data chart
                    </Text>
                  </Space>
                }
                className="volatility-card"
                extra={
                  <Space>
                    <Tag className="volatility-tag-1">R_10</Tag>
                    <Tag className="volatility-tag-2">R_25</Tag>
                    <Tag className="volatility-tag-3">R_50</Tag>
                    <Tag className="volatility-tag-4">R_100</Tag>
                  </Space>
                }
              >
                <VolatilityComparisonChart />
                <Divider />
                <Row gutter={[24, 24]}>
                  <Col xs={24} md={12}>
                    <Title level={5} className="recent-trade-title">
                      <RiseOutlined /> Recent Winning Trade
                    </Title>
                    <div className="trade-description">
                      {latestWinningTrade ? (
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="Contract Type">
                            {latestWinningTrade.contract_type}
                          </Descriptions.Item>
                          <Descriptions.Item label="Buying Price">
                            ${latestWinningTrade.buy_price.toFixed(2)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Description">
                            {latestWinningTrade.longcode}
                          </Descriptions.Item>
                          <Descriptions.Item label="Payout">
                            ${latestWinningTrade.payout.toFixed(2)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Time">
                            {formatTimestamp(latestWinningTrade.purchase_time)}
                          </Descriptions.Item>
                        </Descriptions>
                      ) : (
                        <Text className="trade-description-text">No winning trades found.</Text>
                      )}
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <Title level={5} className="recent-trade-title">
                      <FallOutlined /> Recent Losing Trade
                    </Title>
                    <div className="trade-description">
                      {latestLosingTrade ? (
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="Contract Type">
                            {latestLosingTrade.contract_type}
                          </Descriptions.Item>
                          <Descriptions.Item label="Buying Price">
                            ${latestLosingTrade.buy_price.toFixed(2)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Description">
                            {latestLosingTrade.longcode}
                          </Descriptions.Item>
                          <Descriptions.Item label="Payout">
                            ${latestLosingTrade.payout.toFixed(2)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Time">
                            {formatTimestamp(latestLosingTrade.purchase_time)}
                          </Descriptions.Item>
                        </Descriptions>
                      ) : (
                        <Text className="trade-description-text">No losing trades found.</Text>
                      )}
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} className="trade-options-row">
            <Col xs={12} sm={6} md={6}>
              <Card hoverable className="card-hover card-hover-1">
                <RiseOutlined className="card-icon-1" style={{ fontSize: 24 }} />
                <Title level={5} className="card-title">
                  Rise/Fall
                </Title>
                <Text className="card-text">Predict market direction</Text>
              </Card>
            </Col>
            <Col xs={12} sm={6} md={6}>
              <Card hoverable className="card-hover card-hover-2">
                <NumberOutlined className="card-icon-2" style={{ fontSize: 24 }} />
                <Title level={5} className="card-title">
                  Even/Odd
                </Title>
                <Text className="card-text">Bet on digit outcomes</Text>
              </Card>
            </Col>
            <Col xs={12} sm={6} md={6}>
              <Card hoverable className="card-hover card-hover-3">
                <ArrowUpOutlined className="card-icon-3" style={{ fontSize: 24 }} />
                <Title level={5} className="card-title">
                  Over/Under
                </Title>
                <Text className="card-text">Set your price barriers</Text>
              </Card>
            </Col>
            <Col xs={12} sm={6} md={6}>
              <Card hoverable className="card-hover card-hover-4">
                <SwapOutlined className="card-icon-4" style={{ fontSize: 24 }} />
                <Title level={5} className="card-title">
                  Matches/Differs
                </Title>
                <Text className="card-text">Predict the digit outcomes</Text>
              </Card>
            </Col>
          </Row>
        </Content>
      </div>
    </ConfigProvider>
  );
};

export default DashboardMainContent;