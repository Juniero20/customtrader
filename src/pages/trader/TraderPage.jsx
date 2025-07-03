import {
  Button,
  Divider,
  Layout,
  Typography,
  Row,
  Col,
} from 'antd';
import {
  LineChartOutlined,
  RiseOutlined,
  NumberOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons';
import { useState, useEffect, useMemo } from 'react';
import OverUnderTrader from './over_under/OverUnderContract';
import EvenOddTrader from './even_odd/EvenOddContract';
import RiseFallTrader from './rise_fall/RiseFallContract';
import MatchesDiffersTrader from './matches_differs/MatchesDifferContract';
import RiseFallMarketAnalysis from '../analysis/riseFall/RiseFallMarketAnalysis';
import OverUnderMarketAnalysis from '../analysis/overUnder/OverUnderMarketAnalysis';
import MatchesDiffersMarketAnalysis from '../analysis/matchesDiffers/MatchesDiffersMarketAnalysis';
import EvenOddMarketAnalysis from '../analysis/evenOdd/EvenOddMarketAnalysis';
import RecentTrades from '../../components/RecentTrades';
import ChartPage from './ChartPage';
import '../../assets/css/pages/trader/TraderPage.css'; 

const { Title, Text } = Typography;

const TraderPage = () => {
  const [selectedFeature, setSelectedFeature] = useState(null);

  const features = useMemo(
    () => [
      {
        icon: <RiseOutlined />,
        title: 'Rise/Fall',
        contractComponent: <RiseFallTrader />,
        analysisComponent: <RiseFallMarketAnalysis />,
      },
      {
        icon: <NumberOutlined />,
        title: 'Even/Odd',
        contractComponent: <EvenOddTrader />,
        analysisComponent: <EvenOddMarketAnalysis />,
      },
      {
        icon: <ArrowUpOutlined />,
        title: 'Over/Under',
        contractComponent: <OverUnderTrader />,
        analysisComponent: <OverUnderMarketAnalysis />,
      },
      {
        icon: <LineChartOutlined />,
        title: 'Matches/Differs',
        contractComponent: <MatchesDiffersTrader />,
        analysisComponent: <MatchesDiffersMarketAnalysis />,
      },
    ],
    []
  );

  // Set default feature to "Rise/Fall" on initial render
  useEffect(() => {
    setSelectedFeature(features[0]);
  }, [features]);

  return (
    <Layout className="trader-page-container">
      <Layout.Content className="trader-page-content">
        {/* Chart at the top */}
        <ChartPage />

        {/* Trading Features */}
        <Divider orientation="center" className="trader-page-divider">
          <Title level={2} className="trader-page-title">
            Our Trading Options
          </Title>
        </Divider>
        <Row
          gutter={[16, 16]}
          justify="center"
        >
          {features.map((feature, index) => (
            <Col key={index}>
              <Button
                type={selectedFeature === feature ? 'primary' : 'default'}
                icon={feature.icon}
                size="large"
                onClick={() => setSelectedFeature(feature)}
                className="trader-page-feature-button"
              >
                <div>
                  <Title level={5} className="trader-page-title">
                    {feature.title}
                  </Title>
                  <Text type="secondary" className="trader-page-text">
                    {feature.description}
                  </Text>
                </div>
              </Button>
            </Col>
          ))}
        </Row>

        {/* Trading Contract Section */}
        <Divider orientation="center" className="trader-page-divider">
          <Title level={2} className="trader-page-title">
            Trading Contract
          </Title>
        </Divider>
        <Row gutter={[16, 16]} style={{ marginTop: 10 }}>
          {selectedFeature ? (
            <>
              <Col xs={24} md={12}>
                <div className="trader-page-contract-section">
                  {selectedFeature.contractComponent}
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div className="trader-page-analysis-section">
                  {selectedFeature.analysisComponent}
                </div>
              </Col>
            </>
          ) : (
            <Col span={24}>
              <Text className="trader-page-text">
                Select a trading option to view its contract and analysis.
              </Text>
            </Col>
          )}
        </Row>

        <Divider orientation="center" className="trader-page-divider">
          <Title level={2} className="trader-page-title">
            Recent Trades
          </Title>
        </Divider>
        <RecentTrades />
      </Layout.Content>
    </Layout>
  );
};

export default TraderPage;