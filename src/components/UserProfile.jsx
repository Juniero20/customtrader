import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Statistic,
  Tag,
  Divider,
  Button,
  Space,
  Avatar,
  List,
  Skeleton,
  Alert,
  Progress,
  Badge,
  ConfigProvider,
  theme,
  Switch,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  SafetyOutlined,
  DollarOutlined,
  GlobalOutlined,
  VerifiedOutlined,
  EditOutlined,
  LockOutlined,
  IdcardOutlined,
  CalendarOutlined,
  TransactionOutlined,
  PhoneOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  FlagOutlined,
} from '@ant-design/icons';
import { useUser } from '../context/AuthContext';
import Notification from '../utils/Notification';

const { Title, Text } = Typography;
const { useToken } = theme;

const UserProfile = () => {
  const {
    user,
    balance,
    activeAccountType,
    switchAccount,
    accounts,
    loading,
    error,
    isAuthorized,
    sendAuthorizedRequest,
  } = useUser();
  const { token } = useToken();
  const [userData, setUserData] = useState({});
  const [apiLoading, setApiLoading] = useState(false);
  const [notification, setNotification] = useState({
    type: '',
    content: '',
    trigger: false,
  });
  const { colorPrimary, colorSuccess, colorWarning, colorError } = token;

  // Account type color for real/demo
  const accountTypeColor = activeAccountType === 'real' ? '#00C853' : '#D50000';

  const accountId = user?.loginid;
  const isLoading = loading || apiLoading;

  const showNotification = (type, content) => {
    setNotification({ type, content, trigger: true });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, trigger: false }));
    }, 4000); // 4 seconds for readability
  };

  useEffect(() => {
    if (!accountId || !isAuthorized || !sendAuthorizedRequest) return;

    const fetchUserSettings = async () => {
      setApiLoading(true);
      try {
        const payload = {
          get_settings: 1,
          loginid: accountId,
        };
        const response = await sendAuthorizedRequest(payload);

        if (response.error) {
          showNotification('error', response.error.message || 'Failed to fetch user profile');
          throw new Error(response.error.message);
        }

        const settings = response.get_settings || {};
        if (!settings.email && !settings.country) {
          showNotification('warning', 'No profile details found. Please verify your account.');
        } else {
          setUserData({
            email: settings.email,
            country: settings.country,
            residence: settings.residence,
            loginid: settings.user_hash, // Using user_hash as a unique ID
            currency: user?.currency, // From authorize response
            daily_transfers: { max: settings.daily_transfers?.max || 0 },
            last_login: settings.last_login_time ? settings.last_login_time * 1000 : null,
            fullname: `${settings.first_name || ''} ${settings.last_name || ''}`.trim() || 'Deriv User',
            email_verified: settings.email_consent === 1,
            status: settings.account_status?.status || ['pending'],
            two_factor_authentication: settings.two_factor_enabled || false,
            address_city: settings.address_city,
            address_line_1: settings.address_line_1,
            calling_country_code: settings.calling_country_code,
            phone: settings.phone,
            phone_verified: settings.phone_number_verification?.verified === 1,
            date_of_birth: settings.date_of_birth
              ? new Date(settings.date_of_birth * 1000).toLocaleDateString()
              : null,
            preferred_language: settings.preferred_language,
          });
          showNotification('success', 'Profile loaded successfully!');
        }
      } catch (error) {
        console.error('Error fetching user settings:', error);
      } finally {
        setApiLoading(false);
      }
    };

    fetchUserSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, isAuthorized, sendAuthorizedRequest]);

  // Real-time balance updates are handled in UserProvider, but we can subscribe to settings changes if needed
  useEffect(() => {
    if (!accountId || !isAuthorized) return;

    // Optional: Subscribe to settings updates if Deriv API supports it (not standard)
    // Currently, re-fetch settings on account switch or manual refresh
    return () => {
      // Cleanup any WebSocket subscriptions if added
    };
  }, [accountId, isAuthorized]);

  const renderDetailItem = (icon, title, value, extra = null, isVerified = false) => (
    <List.Item style={{ padding: '12px 0' }}>
      <List.Item.Meta
        avatar={
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: `${colorPrimary}10`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {React.cloneElement(icon, {
              style: { color: colorPrimary, fontSize: 18 },
            })}
          </div>
        }
        title={<Text strong style={{ fontSize: 15 }}>{title}</Text>}
        description={
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: 15 }}>{value || 'Not set'}</Text>
            {extra && (
              <Space size={4}>
                {extra}
                {isVerified && <VerifiedOutlined style={{ color: colorSuccess }} />}
              </Space>
            )}
          </Space>
        }
      />
    </List.Item>
  );

  // Merge user (from context) and userData (from API) for fallback
  const mergedUser = { ...user, ...userData };
  const isFullyVerified = mergedUser?.email_verified && mergedUser?.phone_verified;

if (isLoading) {
  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', backgroundColor: 'var(--bg-color)', height:'100%' }}>
      <Skeleton active paragraph={{ rows: 8 }} />
    </div>
  );
}

  if (error) {
    return (
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <Alert message={error} type="error" showIcon banner />
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        components: {
          Card: { borderRadiusLG: 16, headerBg: 'transparent' },
          Tag: { colorPrimary, colorSuccess, colorWarning, colorError },
        },
      }}
    >
      <Notification
        type={notification.type}
        content={notification.content}
        trigger={notification.trigger}
      />
      <div 
        style={{ 
          paddingTop: '80px', 
          paddingRight: '8px',
          paddingLeft: '8px',
          maxWidth: 1200, 
          margin: '0 auto', 
          backgroundColor: 'var(--bg-color)', 
        }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card
              style={{
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              }}
            >
              <Space direction="vertical" align="center" style={{ width: '100%' }}>
                <Badge
                  count={
                    isFullyVerified ? (
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          backgroundColor: colorSuccess,
                          borderRadius: '50%',
                          display: 'inline-block',
                          boxShadow: '0 0 0 2px white',
                        }}
                      />
                    ) : null
                  }
                  offset={[-8, 8]}
                >
                  <Avatar
                    size={128}
                    icon={<UserOutlined />}
                    src={mergedUser?.profile_image}
                    style={{ background: accountTypeColor, color: 'white', fontSize: 48 }}
                  />
                </Badge>
                <Title level={4} style={{ marginTop: 16, marginBottom: 0,  color:'var(--text-color)'}}>
                  {mergedUser?.fullname || 'Deriv User'}
                </Title>
                <Tag
                  icon={<VerifiedOutlined />}
                  color={accountTypeColor}
                  style={{ marginTop: 8, textTransform: 'uppercase', fontWeight: 600 }}
                >
                  {activeAccountType ? activeAccountType.charAt(0).toUpperCase() + activeAccountType.slice(1) : 'N/A'}
                </Tag>
                <Switch
                  checked={activeAccountType === 'real'}
                  onChange={(checked) => switchAccount(checked ? 'real' : 'demo')}
                  checkedChildren="Real"
                  unCheckedChildren="Demo"
                  disabled={!accounts.real.length || !accounts.demo.length}
                  style={{ marginTop: 16 }}
                />
                <Button
                  type="default"
                  icon={<MailOutlined />}
                  style={{ marginTop: 24, width: '100%' }}
                  onClick={() => showNotification('info', 'Please contact support to update your profile.')}
                >
                  Contact Support
                </Button>
              </Space>
            </Card>

            <Card
              title={<Text style={{ color: 'var(--text-color)' }}>Account Security</Text>}
              style={{
                marginTop: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              }}
            >
              <List size="large">
                {renderDetailItem(
                  <SafetyOutlined />,
                  'Verification Status',
                  isFullyVerified ? 'Verified' : 'Pending',
                  <Tag color={isFullyVerified ? colorSuccess : colorWarning}>
                    {isFullyVerified ? 'Verified' : 'Pending'}
                  </Tag>,
                  isFullyVerified
                )}
                {renderDetailItem(
                  <LockOutlined />,
                  'Two-Factor Authentication',
                  mergedUser?.two_factor_authentication ? 'Enabled' : 'Disabled',
                  <Button
                    type={mergedUser?.two_factor_authentication ? 'default' : 'primary'}
                    size="small"
                    style={{
                      background: mergedUser?.two_factor_authentication ? 'transparent' : `${colorPrimary}10`,
                      color: mergedUser?.two_factor_authentication ? colorError : colorPrimary,
                      borderColor: mergedUser?.two_factor_authentication ? colorError : colorPrimary,
                    }}
                    onClick={() => showNotification('info', '2FA toggle is not yet implemented.')}
                  >
                    {mergedUser?.two_factor_authentication ? 'Disable' : 'Enable'}
                  </Button>
                )}
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ padding: '0 16px' }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Account Strength
                  </Text>
                  <Progress
                    percent={isFullyVerified ? 85 : 45}
                    strokeColor={isFullyVerified ? colorSuccess : colorWarning}
                    trailColor="#f0f0f0"
                    showInfo={false}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {isFullyVerified ? 'Strong' : 'Medium'} security level
                  </Text>
                </div>
              </List>
            </Card>

            <Card
              title={<Text style={{ color: 'var(--text-color)' }}>Financial Summary</Text>}
              style={{
                marginTop: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              }}
            >
              <Row gutter={[24, 24]}>
                <Col xs={24} sm={12}>
                  <Statistic
                    title={
                      <Space>
                        <DollarOutlined style={{ color: colorPrimary }} />
                        <Text>Account Balance</Text>
                      </Space>
                    }
                    value={balance}
                    precision={2}
                    valueStyle={{ fontSize: 28, fontWeight: 600, color: colorPrimary }}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <Statistic
                    title={
                      <Space>
                        <TransactionOutlined style={{ color: colorPrimary }} />
                        <Text>Daily Trading Limit</Text>
                      </Space>
                    }
                    value={mergedUser?.daily_transfers?.max || 0}
                    precision={2}
                    valueStyle={{ fontSize: 28, fontWeight: 600, color: colorPrimary  }}
                  />
                </Col>
              </Row>
              <Divider style={{ margin: '16px 0' }} />
              <Space>
                <CalendarOutlined style={{ color: colorPrimary }} />
                <Text type="secondary" style={{ color: 'var(--text-color)' }}>
                  Last login:{' '}
                  {mergedUser?.last_login
                    ? new Date(mergedUser?.last_login).toLocaleString()
                    : 'N/A'}
                </Text>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={16}>
            <Card
              title={<Text style={{ color: 'var(--text-color)' }}>Personal Information</Text>}
              style={{
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              }}
            >
              <List itemLayout="horizontal">
                {renderDetailItem(
                  <MailOutlined />,
                  'Email Address',
                  mergedUser?.email,
                  <Tag color={mergedUser?.email_verified ? colorSuccess : colorWarning}>
                    {mergedUser?.email_verified ? 'Verified' : 'Unverified'}
                  </Tag>
                )}
                {renderDetailItem(<GlobalOutlined />, 'Country of Residence', mergedUser?.residence)}
                {renderDetailItem(<FlagOutlined />, 'Country', mergedUser?.country)}
                {renderDetailItem(<IdcardOutlined />, 'Account ID', user?.loginid)}
                {renderDetailItem(<DollarOutlined />, 'Account Currency', mergedUser?.currency)}
                {renderDetailItem(<HomeOutlined />, 'Address', mergedUser?.address_line_1)}
                {renderDetailItem(<EnvironmentOutlined />, 'City', mergedUser?.address_city)}
                {renderDetailItem(
                  <PhoneOutlined />,
                  'Phone Number',
                  mergedUser?.phone ? `+${mergedUser?.calling_country_code} ${mergedUser?.phone}` : 'Not set',
                  <Tag color={mergedUser?.phone_verified ? colorSuccess : colorWarning}>
                    {mergedUser?.phone_verified ? 'Verified' : 'Unverified'}
                  </Tag>
                )}
                {renderDetailItem(<CalendarOutlined />, 'Date of Birth', mergedUser?.date_of_birth)}
                {renderDetailItem(<GlobalOutlined />, 'Preferred Language', mergedUser?.preferred_language)}
              </List>
            </Card>


            <Card
              title={<Text style={{ color: 'var(--text-color)' }}>Recent Activity</Text>}
              style={{
                marginTop: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div
                style={{
                  height: 200,
                  background: 'linear-gradient(90deg, #6C5CE710, #6C5CE705)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text type="secondary">Recent activity chart will appear here</Text>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default UserProfile;