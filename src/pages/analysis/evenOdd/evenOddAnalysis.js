import { calculateStochastic, calculateVolatility, calculateRiskStake, getLastDigit } from '../sharedAnalysis';

// Calculate SMA for last digits
const calculateSMA = (ticks, period, useLastDigit = false) => {
  if (!ticks || ticks.length < period) return null;

  const values = ticks.map((tick) => (useLastDigit ? getLastDigit(tick.price) : tick.price));
  const sum = values.slice(-period).reduce((acc, val) => acc + val, 0);
  return sum / period;
};

// SMA Crossover
function analyzeSMACrossover(ticks, symbol, fastPeriod = 5, slowPeriod = 10) {
  if (ticks.length < slowPeriod + 1) {
    return {
      signal: 'neutral',
      strength: 0,
      details: `Insufficient tick data (need ${slowPeriod + 1}, got ${ticks.length})`,
    };
  }

  const fastSMA = calculateSMA(ticks, fastPeriod, true);
  const slowSMA = calculateSMA(ticks, slowPeriod, true);
  if (!fastSMA || !slowSMA) {
    return {
      signal: 'neutral',
      strength: 0,
      details: 'Failed to calculate SMA values',
    };
  }

  const isEven = Math.round(fastSMA) % 2 === 0;
  return {
    signal: isEven ? 'even' : 'odd',
    strength: Math.abs(fastSMA - slowSMA) > 0.5 ? 0.6 : 0.3,
    details: `Digit SMA (${fastSMA.toFixed(1)}) predicts ${isEven ? 'even' : 'odd'}`,
    rawData: { fastSMA, slowSMA },
  };
}

// Stochastic Oscillator
function analyzeStochastic(ticks, symbol) {
  const kPeriod = symbol.includes('1HZ') ? 8 : 14;
  if (ticks.length < kPeriod) {
    return {
      signal: 'neutral',
      strength: 0,
      details: `Insufficient data (need ${kPeriod}, got ${ticks.length})`,
    };
  }

  const digitCounts = Array(10).fill(0);
  ticks.slice(-kPeriod).forEach((tick) => {
    digitCounts[getLastDigit(tick.price)]++;
  });

  const evenCount = digitCounts[0] + digitCounts[2] + digitCounts[4] + digitCounts[6] + digitCounts[8];
  const oddCount = digitCounts[1] + digitCounts[3] + digitCounts[5] + digitCounts[7] + digitCounts[9];

  return {
    signal: evenCount > oddCount ? 'even' : 'odd',
    strength: Math.abs(evenCount - oddCount) / kPeriod,
    details: `Even: ${evenCount}, Odd: ${oddCount} in last ${kPeriod} ticks`,
    rawData: { maxDigit: evenCount > oddCount ? 0 : 1, digitCounts },
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
  let results = [];

  for (let i = ticks.length - 1; i >= 0; i--) {
    const digit = getLastDigit(parseFloat(ticks[i].price));
    const currentDir = digit % 2 === 0 ? 'even' : 'odd';

    if (currentDir === direction) {
      streak++;
    } else {
      direction = currentDir;
      streak = 1;
    }

    results.push({
      price: ticks[i].price,
      digit,
      direction: currentDir,
      streak,
    });

    if (streak >= streakThreshold) break;
  }

  if (streak >= streakThreshold) {
    return {
      signal: direction === 'even' ? 'odd' : 'even',
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

  const currentVol = calculateVolatility(ticks, 20, true);
  const prevVol = calculateVolatility(ticks.slice(0, -1), 20, true);

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
  const payout = 10;
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
      contract: 'Even/Odd',
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
    contract: 'Even/Odd',
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