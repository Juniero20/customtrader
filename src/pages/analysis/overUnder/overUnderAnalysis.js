import { calculateSMA, calculateVolatility, calculateRiskStake, getLastDigit } from '../sharedAnalysis';

// SMA Crossover with dynamic barrier
function analyzeSMACrossover(ticks, symbol, fastPeriod = 5, slowPeriod = 10, barrier = 4) {
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

  return {
    signal: fastSMA > barrier ? 'over' : 'under',
    strength: Math.min(0.9, Math.abs(fastSMA - barrier) / 5),
    details: `Digit SMA (${fastSMA.toFixed(1)}) vs barrier ${barrier}`,
    rawData: { fastSMA, slowSMA, barrier },
  };
}

// Stochastic Oscillator with dynamic barrier
function analyzeStochastic(ticks, symbol, barrier = 4) {
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
  const maxDigit = digitCounts.indexOf(Math.max(...digitCounts));
  const maxCount = Math.max(...digitCounts);

  return {
    signal: maxDigit > barrier ? 'over' : 'under',
    strength: Math.min(0.9, maxCount / kPeriod),
    details: `Digit ${maxDigit} appeared ${maxCount}/${kPeriod} times (Barrier: ${barrier})`,
    rawData: { maxDigit, digitCounts, barrier },
  };
}

// Tick Streak with dynamic barrier
function analyzeTickStreak(ticks, symbol, barrier = 4) {
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
    const currentDir = digit > barrier ? 'over' : 'under';

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
      signal: direction === 'over' ? 'under' : 'over',
      strength: Math.min(0.9, (streak / streakThreshold) * 0.9),
      details: `${streak}-tick ${direction} streak (Barrier: ${barrier}, Threshold: ${streakThreshold})`,
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
  const payout = 85; // Mock; fetch via Deriv API
  const risk = calculateRiskStake(balance, 1, payout, volatilityScore);

  return {
    signal: 'info',
    strength: 0,
    details: `Recommended stake: $${risk.stake} (Risk: 1% = $${risk.maxLoss})`,
  };
}

// Combine Signals with dynamic barrier
function combineSignals(ticks, symbol, balance, barrier = 4) {
  const sma = analyzeSMACrossover(ticks, symbol, 5, 10, barrier);
  const stochastic = analyzeStochastic(ticks, symbol, barrier);
  const streak = analyzeTickStreak(ticks, symbol, barrier);
  const volatility = analyzeVolatilitySpike(ticks);
  const risk = analyzeRisk(balance, symbol, volatility.signal === 'warning' ? 100 : 50);

  const signals = [sma, stochastic, streak].filter((s) => s && s.signal !== 'neutral');
  if (!signals.length) {
    return {
      contract: 'Over/Under',
      signal: 'neutral',
      confidence: 0,
      details: `No clear signals detected (Barrier: ${barrier})`,
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
    details = `Strong ${strongestSignal.toUpperCase()} signal (Barrier: ${barrier}, Confidence: ${(confidence * 100).toFixed(0)}%)`;
  } else {
    details = `Weak/mixed signals (Barrier: ${barrier})`;
  }

  if (volatility.signal === 'warning') {
    signal = 'hold';
    confidence = 0;
    details = `High volatility - avoid trading (Barrier: ${barrier})`;
  }

  return {
    contract: 'Over/Under',
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