// src/components/VolatilityMonitor.js (full updated code)
import React, { useState, useMemo } from 'react';
import { Table, Typography, Tag, Input, Checkbox, Button, Tooltip, Spin, Alert, Modal, InputNumber } from 'antd';
import { useTicks } from '../context/TickContext';
import Notification from '../utils/Notification';

const { Title } = Typography;

const volatilitySymbols = [
  { name: 'Volatility 10 Index', code: 'R_10' },
  { name: 'Volatility 10 (1s) Index', code: '1HZ10V' },
  { name: 'Volatility 25 Index', code: 'R_25' },
  { name: 'Volatility 25 (1s) Index', code: '1HZ25V' },
  { name: 'Volatility 50 Index', code: 'R_50' },
  { name: 'Volatility 50 (1s) Index', code: '1HZ50V' },
  { name: 'Volatility 75 Index', code: 'R_75' },
  { name: 'Volatility 75 (1s) Index', code: '1HZ75V' },
  { name: 'Volatility 100 Index', code: 'R_100' },
  { name: 'Volatility 100 (1s) Index', code: '1HZ100V' },
];

const VolatilityMonitor = () => {
  const { realTimeTicks, historicalTicks, subscriptionStatus, error, errorTrigger } = useTicks();
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState(['name', 'quote', 'percentageChange', 'timestamp']);
  const [selectedSymbols, setSelectedSymbols] = useState([]);
  const [alertModal, setAlertModal] = useState({ visible: false, symbol: null, name: '' });
  const [alertPrice, setAlertPrice] = useState(null);

  // Loading state
  const loading = useMemo(() => {
    return volatilitySymbols.some(
      ({ code }) => !historicalTicks[code] && subscriptionStatus[code] !== 'subscribed' && subscriptionStatus[code] !== 'error'
    );
  }, [historicalTicks, subscriptionStatus]);

  // Column definitions
  const columns = [
    {
      title: 'Symbol',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
    },
    {
      title: <Tooltip title="The latest price of Fellowship">Quote</Tooltip>,
      dataIndex: 'quote',
      key: 'quote',
      sorter: (a, b) => (parseFloat(a.quote) || 0) - (parseFloat(b.quote) || 0),
      render: (quote) => (quote ? parseFloat(quote).toFixed(2) : '—'),
    },
    {
      title: <Tooltip title="The highest price a buyer is willing to pay">Bid</Tooltip>,
      dataIndex: 'bid',
      key: 'bid',
      render: (bid) => (bid ? parseFloat(bid).toFixed(2) : '—'),
    },
    {
      title: <Tooltip title="The lowest price a seller is willing to accept">Ask</Tooltip>,
      dataIndex: 'ask',
      key: 'ask',
      render: (ask) => (ask ? parseFloat(ask).toFixed(2) : '—'),
    },
    {
      title: <Tooltip title="The percentage change from the previous price">Change (%)</Tooltip>,
      dataIndex: 'percentageChange',
      key: 'percentageChange',
      render: (percentageChange) =>
        percentageChange != null ? (
          <Tag color={percentageChange > 0 ? 'green' : 'red'}>{percentageChange}%</Tag>
        ) : (
          '—'
        ),
    },
    {
      title: <Tooltip title="The last time the data was updated">Last Update</Tooltip>,
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => timestamp || '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          onClick={() => setAlertModal({ visible: true, symbol: record.key, name: record.name })}
          size="small"
        >
          Set Alert
        </Button>
      ),
    },
  ];

  // Column options
  const columnOptions = columns
    .filter((col) => col.key !== 'actions')
    .map((col) => ({
      label: col.title.props?.title || col.title,
      value: col.key,
    }));

  // Data source
  const dataSource = useMemo(() => {
    return volatilitySymbols.map(({ name, code }) => {
      const ticks = [...(realTimeTicks[code] || []), ...(historicalTicks[code] || [])].sort(
        (a, b) => b.epoch - a.epoch // Latest first
      );
      const latestTick = ticks[0] || {};
      const prevTick = ticks[1] || null;

      const currentQuote = latestTick.quote ? parseFloat(latestTick.quote) : null;
      const prevQuote = prevTick ? parseFloat(prevTick.quote) : null;
      const percentageChange =
        currentQuote && prevQuote ? (((currentQuote - prevQuote) / prevQuote) * 100).toFixed(2) : null;

      return {
        key: code,
        name,
        quote: currentQuote ? currentQuote.toFixed(2) : null,
        bid: latestTick.bid ? parseFloat(latestTick.bid).toFixed(2) : null,
        ask: latestTick.ask ? parseFloat(latestTick.ask).toFixed(2) : null,
        percentageChange,
        timestamp: latestTick.epoch
          ? new Date(latestTick.epoch * 1000).toLocaleTimeString('en-US', {
              hour12: true,
              hour: 'numeric',
              minute: '2-digit',
              second: '2-digit',
            })
          : null,
      };
    });
  }, [realTimeTicks, historicalTicks]);

  // Filtered data source
  const filteredDataSource = dataSource.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered columns
  const filteredColumns = columns.filter((col) => visibleColumns.includes(col.key) || col.key === 'actions');

  // Comparison table data
  const comparisonData = selectedSymbols.map((symbol) => ({
    key: symbol,
    name: volatilitySymbols.find((item) => item.code === symbol)?.name || symbol,
    ...dataSource.find((item) => item.key === symbol),
  }));

  // Row selection
  const handleRowSelection = {
    onChange: (selectedRowKeys) => {
      setSelectedSymbols(selectedRowKeys);
    },
    selectedRowKeys: selectedSymbols,
  };

  // Alert handling
  const handleSetAlert = () => {
    if (alertPrice) {
      console.log(`Alert set for ${alertModal.name} at price ${alertPrice}`);
      const checkAlert = () => {
        const latestQuote = realTimeTicks[alertModal.symbol]?.[0]?.quote;
        if (latestQuote && Math.abs(parseFloat(latestQuote) - alertPrice) < 0.01) {
          Modal.success({
            title: 'Price Alert',
            content: `${alertModal.name} has reached your alert price of ${alertPrice}!`,
          });
        }
      };
      const interval = setInterval(checkAlert, 1000);
      setTimeout(() => clearInterval(interval), 24 * 60 * 60 * 1000);
    }
    setAlertModal({ visible: false, symbol: null, name: '' });
    setAlertPrice(null);
  };

  return (
    <div style={{ padding: '20px' }}>
      <Title level={3} style={{ textAlign: 'center' }}>
        📊 Volatility Index Monitor
      </Title>

      <Notification type="error" content={error} trigger={errorTrigger} />

      <Alert
        message="Tip: Select symbols to compare their data side-by-side or set price alerts."
        type="info"
        showIcon
        style={{ marginBottom: '20px' }}
      />

      <Input
        placeholder="Search symbols..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '20px', maxWidth: '300px' }}
      />

      <div style={{ marginBottom: '20px' }}>
        <Checkbox.Group
          options={columnOptions}
          value={visibleColumns}
          onChange={setVisibleColumns}
          style={{ marginRight: '20px' }}
        />
        {selectedSymbols.length > 0 && (
          <Button
            type="link"
            onClick={() => setSelectedSymbols([])}
            style={{ color: '#ff4d4f' }}
          >
            Clear Selection
          </Button>
        )}
      </div>

      {loading ? (
        <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />
      ) : (
        <Table
          rowSelection={{
            type: 'checkbox',
            ...handleRowSelection,
          }}
          dataSource={filteredDataSource}
          columns={filteredColumns}
          bordered
          pagination={{ pageSize: 5 }}
          scroll={{ x: 800 }}
          style={{ marginTop: '20px' }}
        />
      )}

      {selectedSymbols.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <Title level={4}>Symbol Comparison</Title>
          <Table
            dataSource={comparisonData}
            columns={filteredColumns}
            bordered
            pagination={false}
            scroll={{ x: 800 }}
          />
        </div>
      )}

      <Modal
        title={`Set Price Alert for ${alertModal.name}`}
        open={alertModal.visible}
        onOk={handleSetAlert}
        onCancel={() => setAlertModal({ visible: false, symbol: null, name: '' })}
        okText="Set Alert"
        cancelText="Cancel"
      >
        <InputNumber
          placeholder="Enter alert price"
          value={alertPrice}
          onChange={setAlertPrice}
          style={{ width: '100%' }}
          min={0}
          step={0.01}
        />
      </Modal>
    </div>
  );
};

export default VolatilityMonitor;