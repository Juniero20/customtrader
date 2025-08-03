import {
  Layout,
  Typography,
  Divider,
  Row,
  Col,
  Button,
} from "antd";
import {
  ThunderboltOutlined,
} from "@ant-design/icons";
import "../../assets/css/pages/trader/TraderPage.css"; 
import VolatilityComparisonChart from "../../../components/TickDataGraph"; 
import AccumulatorContract from "./accumulatorContract";
import RecentTrades from '../../../components/RecentTrades';
import AccumulatorMarketAnalysis from '../../analysis/accumulators/AccumulatorMarketAnalysis';

const { Title, Text } = Typography;

const AccumulatorPage = () => {


  return (
    <Layout className="trader-page-container">
      <Layout.Content className="trader-page-content">
        {/* Header */}
        <Divider orientation="center" className="trader-page-divider">
          <Title level={2} className="trader-page-title">
            <ThunderboltOutlined style={{ marginRight: 8 }} />
            Accumulator Trading
          </Title>
        </Divider>
        {/*Chart Section*/}
        <VolatilityComparisonChart />

        {/* Trading Contract Section */}
        <Divider orientation="center" className="trader-page-divider">
          <Title level={2} className="trader-page-title">
            Trading Contract
          </Title>
        </Divider>
        <Row gutter={[16, 16]} style={{ marginTop: 10 }}>
          <Col xs={24} md={12}>
            <div className="trader-page-contract-section">
              <AccumulatorContract />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="trader-page-analysis-section">
              {/* Place your accumulator analysis UI here */}
              <AccumulatorMarketAnalysis />
            </div>
          </Col>
        </Row>

        {/* Recent Trades Section (optional, for consistency) */}
        <Divider orientation="center" className="trader-page-divider">
          <Title level={2} className="trader-page-title">
            Recent Trades
          </Title>
        </Divider>
        {/* You can reuse the RecentTrades component if you want */}
          <RecentTrades /> 
      </Layout.Content>
    </Layout>
  );
};

export default AccumulatorPage;