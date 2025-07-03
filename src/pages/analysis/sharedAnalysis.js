// Helper: Extract last digit from price
function getLastDigit(price) {
    const priceStr = price.toString();
    return parseInt(priceStr[priceStr.length - 1]);
  }
  
  // Calculate Simple Moving Average (SMA)
  function calculateSMA(ticks, period, useDigits = false) {
    if (ticks.length < period) return null;
    const values = useDigits
      ? ticks.slice(-period).map((tick) => getLastDigit(tick.price))
      : ticks.slice(-period).map((tick) => tick.price);
    return values.reduce((acc, val) => acc + val, 0) / period;
  }
  
  // Calculate Stochastic Oscillator
  function calculateStochastic(ticks, kPeriod, useDigits = false) {
    if (ticks.length < kPeriod) return null;
  
    const values = useDigits
      ? ticks.slice(-kPeriod).map((tick) => getLastDigit(tick.price))
      : ticks.slice(-kPeriod).map((tick) => tick.price);
    const currentValue = values[values.length - 1];
    const lowest = Math.min(...values);
    const highest = Math.max(...values);
  
    const kValue = ((currentValue - lowest) / (highest - lowest)) * 100;
    return { k: isNaN(kValue) ? 50 : kValue, d: kValue }; // Simplified
  }
  
  // Calculate Volatility
  function calculateVolatility(ticks, period = 20, useDigits = false) {
    if (ticks.length < period) return null;
    const values = useDigits
      ? ticks.slice(-period).map((tick) => getLastDigit(tick.price))
      : ticks.slice(-period).map((tick) => tick.price);
    const mean = values.reduce((acc, v) => acc + v, 0) / period;
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / period;
    return Math.sqrt(variance);
  }
  
  // Calculate Risk Stake
  function calculateRiskStake(balance, riskPercent, payoutPercent, volatilityScore) {
    const adjustedRisk = riskPercent * (1 + volatilityScore / 100);
    const maxLoss = balance * (adjustedRisk / 100);
    const stake = maxLoss / (1 - payoutPercent / 100);
    return {
      stake: stake.toFixed(2),
      potentialProfit: (stake * (payoutPercent / 100)).toFixed(2),
      maxLoss: maxLoss.toFixed(2),
    };
  }
  
  export { getLastDigit, calculateSMA, calculateStochastic, calculateVolatility, calculateRiskStake };