import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Table,
  Spin,
  Input,
  DatePicker,
  Checkbox,
  Empty,
  Statistic,
  Tabs,
  Tag,
  Space,
  Divider,
  ConfigProvider,
  theme,
  Button,
  message,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  DollarOutlined,
  HistoryOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useUser } from '../context/AuthContext';
import '../assets/css/components/WalletPage.css'; 

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const WalletPage = () => {
  const { activeAccount, balance, loading: authLoading, sendAuthorizedRequest } = useUser();
  const { token } = theme.useToken();

  // State management
  const [searchTerm] = useState('');
  const [dateRange, setDateRange] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(['Date', 'Type', 'Amount', 'Transaction ID', 'Payout']);
  const [activeTab, setActiveTab] = useState('statement');
  const [statements, setStatements] = useState([]);
  const [realityCheck, setRealityCheck] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statementCount, setStatementCount] = useState(0);

  const accountId = activeAccount?.loginid;
  const isLoading = authLoading || loading;

  // Helper functions
  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Data fetching
  const fetchData = async () => {
    if (!accountId) return;

    setLoading(true);
    setError(null);

    try {
      const statementsRes = await sendAuthorizedRequest({
        statement: 1,
        limit: 100,
        loginid: accountId,
      });

      const transactions = statementsRes?.statement?.transactions || [];
      setStatements(transactions);
      setStatementCount(transactions.length);
      localStorage.setItem(`statements_${accountId}`, JSON.stringify(transactions));

      const realityRes = await sendAuthorizedRequest({
        reality_check: 1,
        loginid: accountId,
      });
      setRealityCheck(realityRes?.reality_check || null);
      localStorage.setItem(`realityCheck_${accountId}`, JSON.stringify(realityRes?.reality_check || null));
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError('Failed to load wallet data. Please try again.');
      message.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    if (accountId) {
      const lastFetchTime = localStorage.getItem(`lastFetchTime_${accountId}`);
      const oneHour = 60 * 60 * 1000;
      if (lastFetchTime && Date.now() - parseInt(lastFetchTime) > oneHour) {
        localStorage.removeItem(`statements_${accountId}`);
        localStorage.removeItem(`realityCheck_${accountId}`);
      }

      const cachedStatements = localStorage.getItem(`statements_${accountId}`);
      if (cachedStatements) {
        const parsed = JSON.parse(cachedStatements);
        setStatements(parsed);
        setStatementCount(parsed.length);
      }

      const cachedReality = localStorage.getItem(`realityCheck_${accountId}`);
      if (cachedReality) {
        setRealityCheck(JSON.parse(cachedReality));
      }

      fetchData();
      localStorage.setItem(`lastFetchTime_${accountId}`, Date.now().toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  // Filtered data
  const filteredStatements = useMemo(() => {
    if (!statements.length) return [];

    return statements.filter((item) => {
      const timestamp = item.purchase_time || item.transaction_time;
      if (!timestamp) return false;

      const transactionDate = new Date(timestamp * 1000);
      const matchesSearch = searchTerm
        ? item.longcode?.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      const matchesDateRange =
        dateRange.length === 2
          ? transactionDate >= dateRange[0] && transactionDate <= dateRange[1]
          : true;

      return matchesSearch && matchesDateRange;
    });
  }, [statements, searchTerm, dateRange]);

  // Table columns
  const statementColumns = useMemo(
    () => [
      {
        title: 'Date',
        dataIndex: 'purchase_time',
        key: 'purchase_time',
        width: 160,
        render: (_, record) => {
          const timestamp = record.purchase_time || record.transaction_time;
          return timestamp ? formatDate(timestamp) : 'N/A';
        },
        sorter: (a, b) => {
          const aTime = a.purchase_time || a.transaction_time;
          const bTime = b.purchase_time || b.transaction_time;
          if (aTime === bTime) {
            return a.transaction_id - b.transaction_id;
          }
          return aTime - bTime;
        },
        visible: visibleColumns.includes('Date'),
      },
      {
        title: 'Type',
        dataIndex: 'action_type',
        key: 'action_type',
        width: 100,
        render: (type) => {
          const displayType = type?.toUpperCase() || 'N/A';
          return (
            <Tag color={type === 'buy' ? token.colorSuccess : token.colorError}>
              {displayType}
            </Tag>
          );
        },
        sorter: (a, b) => a.action_type.localeCompare(b.action_type),
        visible: visibleColumns.includes('Type'),
      },
      {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        width: 120,
        render: (amount) => (
          <Text type={amount >= 0 ? 'success' : 'danger'}>{formatCurrency(amount)}</Text>
        ),
        sorter: (a, b) => a.amount - b.amount,
        visible: visibleColumns.includes('Amount'),
      },
      {
        title: 'Transaction ID',
        dataIndex: 'transaction_id',
        key: 'transaction_id',
        width: 140,
        ellipsis: true,
        responsive: ['md'],
        visible: visibleColumns.includes('Transaction ID'),
      },
      {
        title: 'Payout',
        dataIndex: 'payout',
        key: 'payout',
        width: 120,
        render: (payout) => formatCurrency(payout || 0),
        responsive: ['md'],
        visible: visibleColumns.includes('Payout'),
      },
    ].filter((col) => col.visible),
    [visibleColumns, token]
  );

  const handleRefresh = () => {
    localStorage.removeItem(`lastFetchTime_${accountId}`);
    localStorage.removeItem(`statements_${accountId}`);
    fetchData();
    message.success('Data refreshed successfully');
  };

  // Summary card data
  const summaryData = useMemo(
    () => ({
      balance: activeAccount?.balance || 0,
      deposits: realityCheck?.total_deposits || 0,
      withdrawals: realityCheck?.total_withdrawals || 0,
      totalTransactions: statementCount || 0,
      todayTransactions: realityCheck?.today_transactions || 0,
      weekTransactions: realityCheck?.week_transactions || 0,
      profitLoss: realityCheck?.total_profit_loss || 0,
      winRate: realityCheck?.win_rate || 0,
      avgProfit: realityCheck?.avg_profit || 0,
    }),
    [activeAccount, realityCheck, statementCount]
  );

  return (
    <ConfigProvider
      theme={{
        components: {
          Card: {
            borderRadiusLG: 16,
            paddingLG: 16,
          },
          Table: {
            headerBg: token.colorFillAlter,
            headerColor: token.colorTextHeading,
            fontSize: 14,
            stickyScrollBarBg: token.colorBgContainer,
          },
        },
      }}
    >
      <div className='wallet-container'
        style={{
          paddingTop: '80px',
          paddingLeft:'8px',
          paddingRight:'8px',
          height:'100%',
          backgroundColor: 'var(--bg-color)',
          maxWidth: 1400,
          margin: '0 auto',
          // Pass token values as CSS custom properties
          '--color-fill-alter': token.colorFillAlter,
          '--color-primary': token.colorPrimary,
        }}
      >
        {/* Summary Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
              <Statistic
                title="Total Balance"
                value={balance}
                precision={2}
                prefix={<DollarOutlined />}
                valueStyle={{ color: token.colorPrimary }}
                loading={isLoading}
              />
              <Divider style={{ margin: '8px 0' }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
              <Statistic
                title="Total Transactions"
                value={summaryData.totalTransactions}
                valueStyle={{ color: token.colorPrimary }}
                prefix={<HistoryOutlined />}
                loading={isLoading}
              />
              <Divider style={{ margin: '8px 0' }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
              <Statistic
                title="Net Profit/Loss"
                value={summaryData.profitLoss}
                precision={2}
                prefix={<DollarOutlined />}
                valueStyle={{
                  color: summaryData.profitLoss >= 0 ? token.colorSuccess : token.colorError,
                }}
                loading={isLoading}
              />
              <Divider style={{ margin: '8px 0' }} />
            </Card>
          </Col>
        </Row>

        {/* Search and Filter Section */}
        <Card
          style={{
            marginTop: 16,
            borderRadius: 16,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          }}
        >
          <Row gutter={[8, 8]}>
            <Col>
              <Button onClick={() => setDateRange([new Date(Date.now() - 30 * 60 * 1000), new Date()])}>
                Last 30 min
              </Button>
            </Col>
            <Col>
              <Button onClick={() => setDateRange([new Date(Date.now() - 60 * 60 * 1000), new Date()])}>
                Last 1 hr
              </Button>
            </Col>
            <Col>
              <Button onClick={() => setDateRange([new Date(Date.now() - 6 * 60 * 60 * 1000), new Date()])}>
                Last 6 hrs
              </Button>
            </Col>
            <Col>
              <Button onClick={() => setDateRange([new Date(Date.now() - 12 * 60 * 60 * 1000), new Date()])}>
                Last 12 hrs
              </Button>
            </Col>
            <Col>
              <Button onClick={() => setDateRange([new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()])}>
                Last 24 hrs
              </Button>
            </Col>
          </Row>

          <Divider orientation="left" style={{ margin: '12px 0' }}>
            <Text type="secondary" style={{ color:'var(--text-color)'}}>Visible Columns</Text>
          </Divider>
          <div className="custom-checkbox-group">
            <Checkbox.Group
              options={['Date', 'Type', 'Amount', 'Transaction ID', 'Payout']}
              value={visibleColumns}
              onChange={setVisibleColumns}
              disabled={isLoading}
            />
          </div>
        </Card>

        {/* Main Content Tabs */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ marginTop: 16 }}
          tabBarExtraContent={
            <Space>
              <Text type="secondary" style={{ color:'var(--text-color)'}}>Last updated: {new Date().toLocaleString()}</Text>
              <Button
                size="small"
                icon={<SyncOutlined spin={loading} />}
                onClick={handleRefresh}
                disabled={isLoading}
              >
                Refresh
              </Button>
            </Space>
          }
        >
          <TabPane
            tab={
              <Space>
                <HistoryOutlined />
                Statement
              </Space>
            }
            key="statement"
          >
            <Card style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
              {isLoading ? (
                <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
              ) : error ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={<Text type="danger">{error}</Text>}
                >
                  <Button type="primary" onClick={handleRefresh}>
                    Retry
                  </Button>
                </Empty>
              ) : filteredStatements.length ? (
                <Table
                  dataSource={filteredStatements}
                  columns={statementColumns}
                  rowKey="transaction_id"
                  expandable={{
                    expandedRowRender: (record) => (
                      <div style={{ padding: 12 }}>
                        <Space direction="vertical" size={6}>
                          <Text strong>Contract Details</Text>
                          <Text>
                            Contract ID: <Text code>{record.contract_id || 'N/A'}</Text>
                          </Text>
                          <Text>
                            Symbol: <Text code>{record.symbol || 'N/A'}</Text>
                          </Text>
                          <Text>Entry: {formatCurrency(record.entry_value || 0)}</Text>
                          <Text>Exit: {formatCurrency(record.exit_value || 0)}</Text>
                        </Space>
                      </div>
                    ),
                    rowExpandable: (record) => !!record.contract_id,
                  }}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} transactions`,
                    responsive: true,
                  }}
                  scroll={{ x: 'max-content' }}
                  sticky
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={<Text type="secondary" style={{ color:'var(--text-color)'}}>No transactions found</Text>}
                />
              )}
            </Card>
          </TabPane>
        </Tabs>
      </div>
    </ConfigProvider>
  );
};

export default WalletPage;