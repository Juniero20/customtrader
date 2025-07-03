import React, { useState, useEffect } from 'react';
import { Layout, Button, Space, Dropdown, Avatar, Typography, message } from 'antd';
import {
  UserOutlined,
  WalletOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SwapOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useUser } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../../assets/css/pages/dashboard/DashboardHeader.css';
import logo from '../../assets/images/logo.png';

const { Header } = Layout;
const { Text } = Typography;

const DashboardHeader = ({ collapsed, setCollapsed, toggleDrawer }) => {
  const { user, balance, activeAccountType, switchAccount, accounts, loading, sendAuthorizedRequest } = useUser();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 576);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 576);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getAvatarClass = () => {
    if (!activeAccountType) return 'avatar';
    return activeAccountType === 'real' ? 'avatar avatar-real' : 'avatar avatar-demo';
  };

  const getAvatarText = () => {
    if (!activeAccountType) return 'U'; // User
    return activeAccountType === 'real' ? 'R' : 'D';
  };

  const handleLogout = async () => {
    try {
      const response = await sendAuthorizedRequest({ logout: 1 });
      if (response.error) {
        throw new Error(response.error.message || 'Failed to logout.');
      }
      localStorage.removeItem('activeAccountType');
      localStorage.removeItem('activeAccount');
      localStorage.removeItem('accounts');
      message.success('Logged out successfully.');
      navigate('/');
    } catch (error) {
      console.error('Logout Error:', error);
      message.error(error.message || 'Logout failed. Please try again.');
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile',
      onClick: () => navigate('/dashboard/account'),
    },
    {
      key: 'wallet',
      icon: <WalletOutlined />,
      label: 'Wallet',
      onClick: () => navigate('/dashboard/wallet'),
    },
    {
      key: 'switch-real',
      icon: <SwapOutlined />,
      label: 'Switch to Real',
      disabled: activeAccountType === 'real' || !accounts.real,
      onClick: () => switchAccount('real'),
    },
    {
      key: 'switch-demo',
      icon: <SwapOutlined />,
      label: 'Switch to Demo',
      disabled: activeAccountType === 'demo' || !accounts.demo,
      onClick: () => switchAccount('demo'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/dashboard/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: handleLogout,
    },
  ];

  if (loading) {
    return (
      <Header className="header header-loading">
        <div>Loading...</div>
      </Header>
    );
  }

  return (
    <Header className={`header ${isMobile ? 'header-mobile' : 'header-desktop'}`}>
      <Space size="middle">
        {isMobile ? (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={toggleDrawer}
            className="menu-toggle"
            aria-label="Toggle navigation drawer"
          />
        ) : (
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="menu-toggle"
            aria-label="Toggle sidebar"
          />
        )}
        {!isMobile && (
          <img src={logo} alt="Company Logo" className="logo-img" />
        )}
      </Space>
      <Space size="large" align="center">
        <Space className={`balance-display ${isMobile ? 'balance-mobile' : ''}`}>
          <WalletOutlined className="balance-icon" />
          <Text className={`balance-text ${isMobile ? 'balance-text-strong' : ''}`}>
            {user?.currency} {balance?.toFixed(2) || '0.00'}
          </Text>
        </Space>
        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          trigger={['click']}
          className="user-dropdown"
          style={{}}
        >
          <Space className="user-menu">
            <Avatar className={getAvatarClass()}>
              {getAvatarText()}
            </Avatar>
            {!isMobile && (
              <>
                <Text className="user-name">{user?.fullname || 'User'}</Text>
                <Text className="user-account-type">
                  {activeAccountType ? activeAccountType.charAt(0).toUpperCase() + activeAccountType.slice(1) : 'N/A'}
                </Text>
              </>
            )}
          </Space>
        </Dropdown>
      </Space>
    </Header>
  );
};

export default DashboardHeader;