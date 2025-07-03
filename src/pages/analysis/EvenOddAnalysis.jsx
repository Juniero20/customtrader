import React, { useState } from 'react';
import { Card, Button, Spin, Space } from 'antd';
import { ReloadOutlined, ExpandOutlined } from '@ant-design/icons';
import '../../assets/css/pages/analysis/EvenOddAnalysis.css';

const EvenOddAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0); // For refreshing iframe
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Handle iframe load
  const handleIframeLoad = () => {
    setLoading(false);
  };

  // Refresh iframe
  const handleRefresh = () => {
    setLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  // Toggle full-screen mode
  const toggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
  };

  return (
    <div className={`even-odd-container ${isFullScreen ? 'full-screen' : ''}`}>
      <Card
        title="Even/Odd Market Analysis"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              className="refresh-button"
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<ExpandOutlined />}
              onClick={toggleFullScreen}
              className="fullscreen-button"
            >
              {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            </Button>
          </Space>
        }
        className="even-odd-card"
      >
        <Spin spinning={loading} tip="Loading analysis...">
          <iframe
            key={iframeKey}
            src="https://eveen.vercel.app/"
            style={{
              width: '100%',
              height: window.innerWidth <= 576 ? '80vh' : '100vh',
              border: 'none',
              borderRadius: '8px',
            }}
            title="Even/Odd Market Analysis"
            onLoad={handleIframeLoad}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default EvenOddAnalysis;