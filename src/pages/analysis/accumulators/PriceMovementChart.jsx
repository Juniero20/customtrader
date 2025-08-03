// PriceMovementChart.jsx
import React from 'react';
import { Card, Space, Typography, Tooltip } from 'antd';
import { Grid } from 'antd';
import PropTypes from 'prop-types';

const { Text } = Typography;

const PriceMovementChart = ({ movements }) => {
  // Compute the last 10 tick counts before reset (forward counting)
  const resetDurations = [];
  let counter = 0;

  for (let i = 0; i < movements.length; i++) {
    counter++;
    const m = movements[i];
    if (m.isReset) {
      resetDurations.push({
        ticksBeforeReset: counter,
        timestamp: m.timestamp,
      });
      counter = 0;
    }
  }

  const recentDurations = resetDurations.slice(-20);

  return (
    <Card size="small" title={<Text style={{ color: 'var(--text-color)' }}>Ticks Before Reset </Text>}>
      <Space wrap size="middle">
        {recentDurations.map((reset, index) => (
          <Card
            key={index}
            size="small"
            style={{
              width: 60,
              height: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5222d',
              color: 'white',
              fontWeight: 'bold',
              fontSize: 16,
              borderRadius: 8,
            }}
          >
            {reset.ticksBeforeReset}
          </Card>
        ))}
      </Space>
    </Card>
  );
};

PriceMovementChart.propTypes = {
  movements: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.oneOf(['up', 'down']).isRequired,
      isReset: PropTypes.bool.isRequired,
      timestamp: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default PriceMovementChart;