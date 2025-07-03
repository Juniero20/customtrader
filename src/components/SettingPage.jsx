import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Button, Select, message, ConfigProvider, theme, Space, Modal, Form, Input } from 'antd';
import { ClockCircleOutlined, QuestionCircleOutlined, CommentOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { useToken } = theme;

const SettingsPage = () => {
  const { token } = useToken();
  const [form] = Form.useForm();
  const [settings, setSettings] = useState({
    timeFormat: '12-hour',
    dateFormat: 'MM/DD/YYYY',
  });
  const [stats] = useState({
    totalTrades: 150,
    lastTrade: '2025-05-10 14:30:00',
    portfolioValue: '$5,234.56',
  });
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);

  useEffect(() => {
    // Load saved settings from localStorage
    const savedSettings = JSON.parse(localStorage.getItem('userSettings')) || {};
    setSettings((prev) => ({ ...prev, ...savedSettings }));

    // Placeholder for future API call to fetch stats
    // fetchStats().then((data) => setStats(data));
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('userSettings', JSON.stringify(settings));
    message.success('Settings saved successfully!');
  };

  const handleFeedbackSubmit = (values) => {
    // Placeholder for future API call
    console.log('Feedback submitted:', values.feedback);
    message.success('Thank you for your feedback!');
    setFeedbackModalVisible(false);
    form.resetFields();
  };

  const formatCurrentTime = () => {
    const now = new Date();
    const timeOptions = {
      hour: 'numeric',
      minute: 'numeric',
      hour12: settings.timeFormat === '12-hour',
    };
    const dateOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
    const time = now.toLocaleTimeString('en-US', timeOptions);
    const date = now.toLocaleDateString('en-US', dateOptions).replace(/\//g, settings.dateFormat.includes('MM/DD/YYYY') ? '/' : '-');
    return `${date} ${time}`;
  };

  return (
    <ConfigProvider
      theme={{
        components: {
          Card: { borderRadiusLG: 16 },
          Button: { colorPrimary: token.colorPrimary, colorPrimaryHover: `${token.colorPrimary}dd` },
        },
      }}
    >
      <div style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
        <Title level={2} style={{ color:'var(--text-color)'}}>Settings</Title>
        <Row gutter={[24, 24]}>
          {/* Time Format Preferences */}
          <Col xs={24} md={12}>
            <Card
              title={ <text style={{ color:'var(--text-color)'}} >Display Preferences</text>}
              style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
            >
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div>
                  <Text strong>Time Format</Text>
                  <Select
                    value={settings.timeFormat}
                    onChange={(value) => setSettings({ ...settings, timeFormat: value })}
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    <Option value="12-hour">12-Hour (e.g., 3:45 PM)</Option>
                    <Option value="24-hour">24-Hour (e.g., 15:45)</Option>
                  </Select>
                </div>
                <div>
                  <Text strong>Date Format</Text>
                  <Select
                    value={settings.dateFormat}
                    onChange={(value) => setSettings({ ...settings, dateFormat: value })}
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    <Option value="MM/DD/YYYY">MM/DD/YYYY (e.g., 05/11/2025)</Option>
                    <Option value="DD/MM/YYYY">DD/MM/YYYY (e.g., 11/05/2025)</Option>
                  </Select>
                </div>
                <div>
                  <Text strong>Preview</Text>
                  <Text block style={{ marginTop: 8 }}>
                    <ClockCircleOutlined /> {formatCurrentTime()}
                  </Text>
                </div>
                <Button type="primary" onClick={handleSaveSettings} style={{ marginTop: 8 }}>
                  Save Preferences
                </Button>
              </Space>
            </Card>
          </Col>

          {/* Trading Statistics */}
          <Col xs={24} md={12}>
            <Card
              title={<text  style={{ color:'var(--text-color)'}}>Trading Statistics</text>}
              style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
            >
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div>
                  <Text strong>Total Trades</Text>
                  <Text block>{stats.totalTrades}</Text>
                </div>
                <div>
                  <Text strong>Last Trade</Text>
                  <Text block>{stats.lastTrade}</Text>
                </div>
                <div>
                  <Text strong>Portfolio Value</Text>
                  <Text block>{stats.portfolioValue}</Text>
                </div>
              </Space>
            </Card>
          </Col>

          {/* Support and Education */}
          <Col xs={24}>
            <Card
              title={<text style={{ color:'var(--text-color)'}} >Support & Resources</text>}
              style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
            >
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div>
                  <Text strong>Need Help?</Text>
                  <Text block style={{ marginTop: 8 }}>
                    Contact our support team at{' '}
                    <a href="mailto:support@denaradigitpro.com">support@denaradigitpro.com</a>.
                  </Text>
                  <Button
                    type="primary"
                    icon={<QuestionCircleOutlined />}
                    style={{ marginTop: 8 }}
                    onClick={() => window.location.href = 'mailto:support@denaradigitpro.com'}
                  >
                    Contact Support
                  </Button>
                </div>
                <div>
                  <Text strong>Learn More</Text>
                  <Text block style={{ marginTop: 8 }}>
                    Explore our{' '}
                    <a href="/learn">educational resources</a> to master volatility trading.
                  </Text>
                </div>
                <div>
                  <Text strong>Feedback</Text>
                  <Text block style={{ marginTop: 8 }}>
                    Help us improve! Share your thoughts or report issues.
                  </Text>
                  <Button
                    type="default"
                    icon={<CommentOutlined />}
                    style={{ marginTop: 8 }}
                    onClick={() => setFeedbackModalVisible(true)}
                  >
                    Submit Feedback
                  </Button>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Feedback Modal */}
        <Modal
          title="Submit Feedback"
          visible={feedbackModalVisible}
          onCancel={() => setFeedbackModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setFeedbackModalVisible(false)}>
              Cancel
            </Button>,
            <Button key="submit" type="primary" onClick={() => form.submit()}>
              Submit
            </Button>,
          ]}
        >
          <Form form={form} onFinish={handleFeedbackSubmit}>
            <Form.Item
              name="feedback"
              rules={[{ required: true, message: 'Please provide your feedback!' }]}
            >
              <TextArea rows={4} placeholder="Share your thoughts or report an issue..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default SettingsPage;