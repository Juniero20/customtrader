import React from 'react';
import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  LineChartOutlined,
  WalletOutlined,
  UserOutlined,
  SettingOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import '../../assets/css/pages/dashboard/DashboardSidebar.css';

const DashboardSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract the current route path (last segment after /dashboard)
  const currentPath = location.pathname.split('/').pop() || 'home';

  const menuItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: 'Home',
      onClick: () => navigate('/dashboard/home'),
    },
    {
      key: 'trading',
      icon: <LineChartOutlined />,
      label: 'Trading',
      onClick: () => navigate('/dashboard/trading'),
    },
    {
      key: 'wallet',
      icon: <WalletOutlined />,
      label: 'Wallet',
      onClick: () => navigate('/dashboard/wallet'),
    },
    {
      key: 'account',
      icon: <UserOutlined />,
      label: 'Account',
      onClick: () => navigate('/dashboard/account'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/dashboard/settings'),
    },
    {
      key: 'risk',
      icon: <ExclamationCircleOutlined />,
      label: 'Risk',
      onClick: () => navigate('/dashboard/risk'),
    },
  ];

  return (
    <Menu
      theme="dark" // Use dark theme as base, overridden by CSS
      mode="inline"
      selectedKeys={[currentPath]}
      items={menuItems}
      className="dashboard-sidebar-menu"
    />
  );
};

export default DashboardSidebar;