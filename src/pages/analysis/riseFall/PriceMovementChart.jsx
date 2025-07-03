import React from 'react';
import { Card, Space, Typography} from 'antd';
import { Grid } from 'antd';
import PropTypes from 'prop-types';

const { Text,Title } = Typography;
const PriceMovementChart = ({ movements }) => {
  const { md } = Grid.useBreakpoint();
  const chunkSize = md ? 12 : 5; 
  const movementGroups = [];
  for (let i = 0; i < movements.length; i += chunkSize) {
    movementGroups.push(movements.slice(i, i + chunkSize));
  }

  return (
    <Card size="small" title={<Text style={{ color: 'var(--text-color)' }}>Recent Price Movements</Text>}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {movementGroups.map((group, groupIndex) => (
          <div key={groupIndex} style={{ display: 'flex', justifyContent: 'center' }}>
            {group.map((movement, index) => (
              <div
                key={`${groupIndex}-${index}`}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: movement === 'up' ? '#52c41a' : '#f5222d',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: 4,
                  fontWeight: 'bold',
                }}
              >
                {movement === 'up' ? '↑' : '↓'}
              </div>
            ))}
          </div>
        ))}
      </Space>
    </Card>
  );
};

PriceMovementChart.propTypes = {
  movements: PropTypes.arrayOf(PropTypes.oneOf(['up', 'down'])).isRequired,
};

export default PriceMovementChart;