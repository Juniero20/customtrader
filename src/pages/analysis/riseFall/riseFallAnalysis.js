import { calculateSMA, calculateStochastic, calculateVolatility, calculateRiskStake } from '../sharedAnalysis';

// SMA Crossover
function analyzeSMACrossover(ticks, symbol, fastPeriod = 5, slowPeriod = 10) {
  if (ticks.length < slowPeriod + 1) {
    return {
      signal: 'neutral',
      strength: 0,
      details: `Insufficient tick data (need ${slowPeriod + 1}, got ${ticks.length})`,
    };
  }

  const fastSMA = calculateSMA(ticks, fastPeriod);
  const slowSMA = calculateSMA(ticks, slowPeriod);
  const prevFastSMA = calculateSMA(ticks.slice(0, -1), fastPeriod);
  const prevSlowSMA = calculateSMA(ticks.slice(0, -1), slowPeriod);

  if (!fastSMA || !slowSMA || !prevFastSMA || !prevSlowSMA) {
    return {
      signal: 'neutral',
      strength: 0,
      details: 'Failed to calculate SMA values',
    };
  }

  const momentum = ticks[ticks.length - 1].price - ticks[ticks.length - 3].price;

  if (prevFastSMA <= prevSlowSMA && fastSMA > slowSMA && momentum > 0) {
    return {
      signal: 'rise',
      strength: 0.7,
      details: `Fast SMA (${fastSMA.toFixed(2)}) crossed above Slow SMA (${slowSMA.toFixed(2)})`,
      rawData: { fastSMA, slowSMA },
    };
  } else if (prevFastSMA >= prevSlowSMA && fastSMA < slowSMA && momentum < 0) {
    return {
      signal: 'fall',
      strength: 0.7,
      details: `Fast SMA (${fastSMA.toFixed(2)}) crossed below Slow SMA (${slowSMA.toFixed(2)})`,
      rawData: { fastSMA, slowSMA },
    };
  }
  return {
    signal: 'neutral',
    strength: 0,
    details: 'No SMA crossover detected',
    rawData: { fastSMA, slowSMA },
  };
}

// Stochastic Oscillator
function analyzeStochastic(ticks, symbol) {
  const kPeriod = symbol.includes('1HZ') ? 8 : 14;
  const stochastic = calculateStochastic(ticks, kPeriod);
  if (!stochastic) {
    return {
      signal: 'neutral',
      strength: 0,
      details: `Insufficient tick data (need ${kPeriod}, got ${ticks.length})`,
    };
  }

  const { k } = stochastic;
  if (k < 20) {
    return {
      signal: 'rise',
      strength: k < 10 ? 0.9 : 0.6,
      details: `Stochastic oversold (K=${k.toFixed(2)})`,
      rawData: { k },
    };
  } else if (k > 80) {
    return {
      signal: 'fall',
      strength: k > 90 ? 0.9 : 0.6,
      details: `Stochastic overbought (K=${k.toFixed(2)})`,
      rawData: { k },
    };
  }
  return {
    signal: 'neutral',
    strength: 0,
    details: `Stochastic neutral (K=${k.toFixed(2)})`,
    rawData: { k },
  };
}

// Tick Streak
function analyzeTickStreak(ticks, symbol) {
  if (!ticks || ticks.length < 2) {
    return {
      signal: 'neutral',
      strength: 0,
      details: 'Need at least 2 ticks for analysis',
    };
  }

  const getStreakThreshold = (sym) => {
    const thresholds = {
      R_10: 8, '1HZ10V': 6,
      R_25: 8, '1HZ25V': 6,
      R_50: 7, '1HZ50V': 5,
      R_75: 7, '1HZ75V': 5,
      R_100: 6, '1HZ100V': 4,
    };
    return thresholds[sym] || 5;
  };

  const streakThreshold = getStreakThreshold(symbol);
  let streak = 0;
  let direction = null;
  let lastPrice = null;
  let results = [];

  for (let i = ticks.length - 1; i >= 0; i--) {
    const currentPrice = parseFloat(ticks[i].price);

    if (lastPrice !== null) {
      const currentDirection = currentPrice > lastPrice ? 'up' : currentPrice < lastPrice ? 'down' : 'flat';

      if (currentDirection === direction && currentDirection !== 'flat') {
        streak++;
      } else if (currentDirection !== 'flat') {
        direction = currentDirection;
        streak = 1;
      } else {
        direction = null;
        streak = 0;
      }

      results.push({
        price: currentPrice,
        direction: currentDirection,
        streak: direction === currentDirection ? streak : 0,
      });

      if (streak >= streakThreshold) break;
    }
    lastPrice = currentPrice;
  }

  if (streak >= streakThreshold) {
    return {
      signal: direction === 'up' ? 'fall' : 'rise',
      strength: Math.min(0.9, (streak / streakThreshold) * 0.9),
      details: `${streak}-tick ${direction} streak (Threshold: ${streakThreshold})`,
      rawData: results,
    };
  }

  return {
    signal: 'neutral',
    strength: 0,
    details: `No significant streak (current: ${streak} ${direction || 'neutral'})`,
    rawData: results,
  };
}

// Volatility Spike
function analyzeVolatilitySpike(ticks) {
  if (ticks.length < 21) {
    return {
      signal: 'normal',
      strength: 0,
      details: 'Need at least 21 ticks for volatility analysis',
    };
  }

  const currentVol = calculateVolatility(ticks, 20);
  const prevVol = calculateVolatility(ticks.slice(0, -1), 20);

  if (!currentVol || !prevVol) {
    return {
      signal: 'normal',
      strength: 0,
      details: 'Failed to calculate volatility',
    };
  }

  const spikeThreshold = 1.5;
  if (currentVol > prevVol * spikeThreshold) {
    return {
      signal: 'warning',
      strength: 1,
      details: `Volatility spike! (${currentVol.toFixed(2)} vs ${prevVol.toFixed(2)})`,
    };
  }
  return {
    signal: 'normal',
    strength: 0,
    details: `Volatility stable (${currentVol.toFixed(2)})`,
  };
}

// Risk Analysis
function analyzeRisk(balance, indexSymbol, volatilityScore = 50) {
  const payoutMap = {
    R_10: 95, '1HZ10V': 95,
    R_25: 92, '1HZ25V': 92,
    R_50: 89, '1HZ50V': 89,
    R_75: 87, '1HZ75V': 87,
    R_100: 85, '1HZ100V': 85,
  };
  const payout = payoutMap[indexSymbol] || 90;
  const risk = calculateRiskStake(balance, 1, payout, volatilityScore);

  return {
    signal: 'info',
    strength: 0,
    details: `Recommended stake: $${risk.stake} (Risk: 1% = $${risk.maxLoss})`,
  };
}

// Combine Signals
function combineSignals(ticks, symbol, balance) {
  const sma = analyzeSMACrossover(ticks, symbol);
  const stochastic = analyzeStochastic(ticks, symbol);
  const streak = analyzeTickStreak(ticks, symbol);
  const volatility = analyzeVolatilitySpike(ticks);
  const risk = analyzeRisk(balance, symbol, volatility.signal === 'warning' ? 100 : 50);

  const signals = [sma, stochastic, streak].filter((s) => s && s.signal !== 'neutral');
  if (!signals.length) {
    return {
      contract: 'Rise/Fall',
      signal: 'neutral',
      confidence: 0,
      details: 'No clear signals detected',
      individualSignals: { sma, stochastic, streak, volatility, risk },
    };
  }

  let signalCounts = {};
  let totalStrength = 0;

  signals.forEach((s) => {
    signalCounts[s.signal] = (signalCounts[s.signal] || 0) + s.strength;
    totalStrength += s.strength;
  });

  let signal = 'neutral';
  let confidence = 0;
  let details = '';

  const strongestSignal = Object.keys(signalCounts).reduce(
    (a, b) => (signalCounts[a] > signalCounts[b] ? a : b),
    ''
  );
  if (signalCounts[strongestSignal] >= 1.5) {
    signal = strongestSignal;
    confidence = Math.min(1, signalCounts[strongestSignal] / 3);
    details = `Strong ${strongestSignal.toUpperCase()} signal (Confidence: ${(confidence * 100).toFixed(0)}%)`;
  } else {
    details = 'Weak/mixed signals';
  }

  if (volatility.signal === 'warning') {
    signal = 'hold';
    confidence = 0;
    details = 'High volatility - avoid trading';
  }

  return {
    contract: 'Rise/Fall',
    signal,
    confidence,
    details,
    individualSignals: { sma, stochastic, streak, volatility, risk },
  };
}

export {
  analyzeSMACrossover,
  analyzeStochastic,
  analyzeTickStreak,
  analyzeVolatilitySpike,
  analyzeRisk,
  combineSignals,
};