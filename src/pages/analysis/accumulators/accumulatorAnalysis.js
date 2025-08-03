// accumulatorAnalysis.js
import { calculateSMA, calculateVolatility, calculateRiskStake } from '../sharedAnalysis';

// Barrier lookup table (in points)
const barrierLookup = {
  'R_10': { 1: 0.3829, 2: 0.3579, 3: 0.3356, 4: 0.3193, 5: 0.3039 },
  '1HZ10V': { 1: 0.377, 2: 0.352, 3: 0.331, 4: 0.315, 5: 0.299 },
  'R_25': { 1: 0.4420, 2: 0.4123, 3: 0.3875, 4: 0.3688, 5: 0.3509 },
  '1HZ25V': { 1: 69.493, 2: 64.924, 3: 60.876, 4: 57.925, 5: 55.121 },
  'R_50': { 1: 0.03975, 2: 0.03715, 3: 0.03486, 4: 0.03315, 5: 0.03156 },
  '1HZ50V': { 1: 44.502, 2: 41.612, 3: 39.014, 4: 37.145, 5: 35.353 },
  'R_75': { 1: 40.89002, 2: 38.1887, 3: 35.7975, 4: 34.03113, 5: 32.37661 },
  '1HZ75V': { 1: 1.390, 2: 1.301, 3: 1.220, 4: 1.160, 5: 1.105 },
  'R_100': { 1: 0.641, 2: 0.598, 3: 0.561, 4: 0.533, 5: 0.508 },
  '1HZ100V': { 1: 0.321, 2: 0.300, 3: 0.282, 4: 0.268, 5: 0.256 },
};

// Price Stability Analysis
function analyzePriceChange(ticks, symbol, growthRate, upperBarrier, lowerBarrier) {
  if (!ticks || ticks.length < 10) {
    return {
      signal: 'neutral',
      strength: 0,
      details: `Insufficient tick data (need 10, got ${ticks.length})`,
    };
  }

  const prices = ticks.slice(-10).map((tick) => parseFloat(tick.price));
  const withinRange = prices.every((price) => price >= lowerBarrier && price <= upperBarrier);
  const latestPrice = prices[prices.length - 1];
  const proximity = Math.min(
    Math.abs(latestPrice - upperBarrier),
    Math.abs(latestPrice - lowerBarrier)
  );
  const rangeWidth = upperBarrier - lowerBarrier;
  const stabilityThreshold = rangeWidth * 0.25; // 25% of range width

  let signal, strength, details;
  if (withinRange && proximity > stabilityThreshold) {
    signal = 'continue';
    strength = 0.8 * (proximity / rangeWidth);
    details = `Price stable within range (±${((rangeWidth / latestPrice) * 100).toFixed(2)}%)`;
  } else if (!withinRange) {
    signal = 'reset';
    strength = 0.8;
    details = `Price breached barrier (Upper: ${upperBarrier.toFixed(2)}, Lower: ${lowerBarrier.toFixed(2)})`;
  } else {
    signal = 'warning';
    strength = 0.5 * (1 - proximity / stabilityThreshold);
    details = `Price near barrier (Proximity: ${proximity.toFixed(2)})`;
  }

  return { signal, strength, details };
}

// Reset Count Analysis
function analyzeResetCount(ticks, resetTimes) {
  if (!ticks || ticks.length < 10) {
    return {
      signal: 'neutral',
      strength: 0,
      details: `Insufficient tick data (need 10, got ${ticks.length})`,
    };
  }

  const resetCount = resetTimes.length;
  let signal = resetCount > 2 ? 'reset' : resetCount > 0 ? 'warning' : 'continue';
  let strength = Math.min(0.9, resetCount * 0.3);
  let details = `Detected ${resetCount} reset(s) in ${ticks.length} ticks`;

  return { signal, strength, details };
}

// Ticks Before Reset Analysis
function analyzeTicksBeforeReset(ticks, resetTimes) {
  if (!ticks || ticks.length < 10) {
    return {
      signal: 'neutral',
      strength: 0,
      details: `Insufficient tick data (need 10, got ${ticks.length})`,
    };
  }

  if (resetTimes.length === 0) {
    return {
      signal: 'continue',
      strength: 0.7,
      details: `No resets detected in ${ticks.length} ticks`,
    };
  }

  const tickCounts = [];
  let currentCount = 0;
  let lastResetTime = ticks[0].timestamp;

  for (let i = 1; i < ticks.length; i++) {
    currentCount++;
    if (resetTimes.some((reset) => reset.timestamp === ticks[i].timestamp)) {
      tickCounts.push(currentCount);
      currentCount = 0;
      lastResetTime = ticks[i].timestamp;
    }
  }
  if (currentCount > 0) tickCounts.push(currentCount);

  const avgTicks = tickCounts.length > 0 ? tickCounts.reduce((sum, count) => sum + count, 0) / tickCounts.length : ticks.length;
  let signal = avgTicks < 5 ? 'reset' : avgTicks < 10 ? 'warning' : 'continue';
  let strength = Math.min(0.9, 1 - (avgTicks / 20));
  let details = `Average ticks before reset: ${avgTicks.toFixed(1)}`;

  return { signal, strength, details };
}

// Tick Momentum Analysis
function analyzeTickMomentum(ticks, symbol, upperBarrier, lowerBarrier) {
  if (!ticks || ticks.length < 10) {
    return {
      signal: 'neutral',
      strength: 0,
      details: `Insufficient tick data (need 10, got ${ticks.length})`,
    };
  }

  const shortSMA = calculateSMA(ticks, 5);
  const longSMA = calculateSMA(ticks, 10);
  if (!shortSMA || !longSMA) {
    return {
      signal: 'neutral',
      strength: 0,
      details: 'Failed to calculate momentum',
    };
  }

  const latestPrice = parseFloat(ticks[ticks.length - 1].price);
  const momentum = shortSMA - longSMA;
  const threshold = symbol.includes('1HZ') ? 0.2 : 0.5;
  const barrierProximity = Math.min(
    Math.abs(latestPrice - upperBarrier),
    Math.abs(latestPrice - lowerBarrier)
  );
  const signal =
    momentum > threshold || momentum < -threshold || barrierProximity < threshold
      ? 'reset'
      : 'continue';
  const strength = Math.min(1, (Math.abs(momentum) + (threshold - barrierProximity)) / (threshold * 2));

  return {
    signal,
    strength,
    details: `Momentum: ${momentum.toFixed(2)}, Proximity to barrier: ${barrierProximity.toFixed(2)}`,
    rawData: { shortSMA, longSMA },
  };
}

// Volatility Spike Analysis
function analyzeVolatilitySpike(ticks) {
  if (ticks.length < 21) {
    return {
      signal: 'neutral',
      strength: 0,
      details: 'Need at least 21 ticks for volatility analysis',
    };
  }

  const currentVol = calculateVolatility(ticks, 20);
  const prevVol = calculateVolatility(ticks.slice(0, -1), 20);

  if (!currentVol || !prevVol) {
    return {
      signal: 'neutral',
      strength: 0,
      details: 'Failed to calculate volatility',
    };
  }

  const spikeThreshold = 1.5;
  if (currentVol > prevVol * spikeThreshold) {
    return {
      signal: 'reset',
      strength: 1,
      details: `Volatility spike! (${currentVol.toFixed(2)} vs ${prevVol.toFixed(2)})`,
    };
  }
  return {
    signal: 'continue',
    strength: 0,
    details: `Volatility stable (${currentVol.toFixed(2)})`,
  };
}

// Risk Analysis
function analyzeRisk(balance, symbol, volatilityScore = 50) {
  const payout = 10;
  const risk = calculateRiskStake(balance, 1, payout, volatilityScore);

  return {
    signal: 'info',
    strength: 0,
    details: `Recommended stake: $${risk.stake} (Risk: 1% = $${risk.maxLoss})`,
  };
}

// Combine Signals
function combineSignals(ticks, symbol, growthRate, balance, upperBarrier, lowerBarrier, tickCount, resetTimes) {
  const priceChange = analyzePriceChange(ticks, symbol, growthRate, upperBarrier, lowerBarrier);
  const resetCount = analyzeResetCount(ticks, resetTimes);
  const ticksBeforeReset = analyzeTicksBeforeReset(ticks, resetTimes);
  const momentum = analyzeTickMomentum(ticks, symbol, upperBarrier, lowerBarrier);
  const volatility = analyzeVolatilitySpike(ticks);
  const risk = analyzeRisk(balance, symbol, volatility.signal === 'reset' ? 100 : 50);

  const signals = [priceChange, resetCount, ticksBeforeReset, momentum, volatility].filter((s) => s && s.signal !== 'neutral');
  if (!signals.length) {
    return {
      contract: 'Accumulator',
      signal: 'continue',
      confidence: 0.5,
      details: 'Stable conditions for accumulator growth',
      individualSignals: { priceChange, resetCount, ticksBeforeReset, momentum, volatility, risk },
    };
  }

  let signalCounts = {};
  let totalStrength = 0;

  signals.forEach((s) => {
    signalCounts[s.signal] = (signalCounts[s.signal] || 0) + s.strength;
    totalStrength += s.strength;
  });

  let signal = 'continue';
  let confidence = 0;
  let details = '';

  const strongestSignal = Object.keys(signalCounts).reduce(
    (a, b) => (signalCounts[a] > signalCounts[b] ? a : b),
    'continue'
  );
  if (signalCounts[strongestSignal] >= 1.5) {
    signal = strongestSignal;
    confidence = Math.min(1, signalCounts[strongestSignal] / 3);
    details = `Strong ${strongestSignal.toUpperCase()} signal (Confidence: ${(confidence * 100).toFixed(0)}%)`;
  } else {
    signal = 'warning';
    confidence = 0.5;
    details = 'Mixed signals, proceed with caution';
  }

  if (volatility.signal === 'reset' || resetCount.signal === 'reset') {
    signal = 'reset';
    confidence = 0.8;
    details = 'High volatility or frequent resets detected - avoid trading';
  }

  return {
    contract: 'Accumulator',
    signal,
    confidence,
    details,
    individualSignals: { priceChange, resetCount, ticksBeforeReset, momentum, volatility, risk },
  };
}

export {
  analyzePriceChange,
  analyzeResetCount,
  analyzeTicksBeforeReset,
  analyzeTickMomentum,
  analyzeVolatilitySpike,
  analyzeRisk,
  combineSignals,
};