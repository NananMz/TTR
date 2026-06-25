/**
 * Biblioteca de Indicadores Técnicos em JavaScript Puro.
 * Aceita um array de candles no formato:
 * { openTime, closeTime, open, high, low, close, volume }
 * * Todas as funções retornam um array de mesma extensão que o array de entrada,
 * contendo valores numéricos (ou null/NaN nos períodos iniciais insuficientes),
 * permitindo que o motor de score acesse a última posição [length - 1] ou analise histórico.
 */

/**
 * Auxiliar: Calcula a Média Móvel Exponencial (EMA) sobre uma série genérica de números.
 */
function calculateEMAOnSeries(values, period) {
    const ema = new Array(values.length).fill(null);
    if (values.length < period) return ema;

    const k = 2 / (period + 1);
    
    // O primeiro ponto da EMA é calculado como uma Média Móvel Simples (SMA)
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += values[i];
    }
    let currentEma = sum / period;
    ema[period - 1] = currentEma;

    for (let i = period; i < values.length; i++) {
        currentEma = (values[i] - currentEma) * k + currentEma;
        ema[i] = currentEma;
    }
    return ema;
}

/**
 * 1. Média Móvel Exponencial (EMA)
 * @param {Array} candles 
 * @param {number} period 
 * @returns {Array<number|null>}
 */
function calculateEMA(candles, period) {
    const closes = candles.map(c => Number(c.close));
    return calculateEMAOnSeries(closes, period);
}

/**
 * 2. Índice de Força Relativa (RSI / IFR) com suavização de Wilder
 * @param {Array} candles 
 * @param {number} [period=14] 
 * @returns {Array<number|null>}
 */
function calculateRSI(candles, period = 14) {
    const rsiValues = new Array(candles.length).fill(null);
    if (candles.length <= period) return rsiValues;

    let gains = 0;
    let losses = 0;

    // Primeiro período de ganhos e perdas (Média Simples inicial)
    for (let i = 1; i <= period; i++) {
        const change = Number(candles[i].close) - Number(candles[i - 1].close);
        if (change > 0) {
            gains += change;
        } else {
            losses -= change; // Armazena como valor positivo
        }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    rsiValues[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));

    // Suavização de Wilder para o restante dos candles
    for (let i = period + 1; i < candles.length; i++) {
        const change = Number(candles[i].close) - Number(candles[i - 1].close);
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        if (avgLoss === 0) {
            rsiValues[i] = 100;
        } else {
            const rs = avgGain / avgLoss;
            rsiValues[i] = 100 - (100 / (1 + rs));
        }
    }

    return rsiValues;
}

/**
 * 3. MACD (Moving Average Convergence Divergence)
 * @param {Array} candles 
 * @param {number} [fastPeriod=12] 
 * @param {number} [slowPeriod=26] 
 * @param {number} [signalPeriod=9] 
 * @returns {Array<{macd: number|null, signal: number|null, histogram: number|null}>}
 */
function calculateMACD(candles, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const closes = candles.map(c => Number(c.close));
    const fastEma = calculateEMAOnSeries(closes, fastPeriod);
    const slowEma = calculateEMAOnSeries(closes, slowPeriod);

    const macdLines = new Array(candles.length).fill(null);
    for (let i = 0; i < candles.length; i++) {
        if (fastEma[i] !== null && slowEma[i] !== null) {
            macdLines[i] = fastEma[i] - slowEma[i];
        }
    }

    const signalLines = new Array(candles.length).fill(null);
    const histograms = new Array(candles.length).fill(null);

    const startIdx = slowPeriod - 1; // Índice onde a linha MACD começa a ter valores válidos
    if (candles.length >= startIdx + signalPeriod) {
        // Média Móvel Simples inicial da linha MACD para gerar o primeiro sinal
        let sum = 0;
        for (let i = startIdx; i < startIdx + signalPeriod; i++) {
            sum += macdLines[i];
        }
        let currentSignal = sum / signalPeriod;
        signalLines[startIdx + signalPeriod - 1] = currentSignal;
        histograms[startIdx + signalPeriod - 1] = macdLines[startIdx + signalPeriod - 1] - currentSignal;

        const k = 2 / (signalPeriod + 1);
        for (let i = startIdx + signalPeriod; i < candles.length; i++) {
            currentSignal = (macdLines[i] - currentSignal) * k + currentSignal;
            signalLines[i] = currentSignal;
            histograms[i] = macdLines[i] - currentSignal;
        }
    }

    return candles.map((_, i) => ({
        macd: macdLines[i],
        signal: signalLines[i],
        histogram: histograms[i]
    }));
}

/**
 * 4. ATR (Average True Range) com suavização de Wilder
 * @param {Array} candles 
 * @param {number} [period=14] 
 * @returns {Array<number|null>}
 */
function calculateATR(candles, period = 14) {
    const atrValues = new Array(candles.length).fill(null);
    if (candles.length <= period) return atrValues;

    const trValues = new Array(candles.length).fill(0);
    
    // O primeiro True Range é apenas High - Low
    trValues[0] = Number(candles[0].high) - Number(candles[0].low);

    for (let i = 1; i < candles.length; i++) {
        const h = Number(candles[i].high);
        const l = Number(candles[i].low);
        const pc = Number(candles[i - 1].close);

        trValues[i] = Math.max(
            h - l,
            Math.abs(h - pc),
            Math.abs(l - pc)
        );
    }

    // Média inicial do True Range (SMA)
    let sum = 0;
    for (let i = 1; i <= period; i++) {
        sum += trValues[i];
    }
    let currentAtr = sum / period;
    atrValues[period] = currentAtr;

    // Suavização do ATR
    for (let i = period + 1; i < candles.length; i++) {
        currentAtr = (currentAtr * (period - 1) + trValues[i]) / period;
        atrValues[i] = currentAtr;
    }

    return atrValues;
}

/**
 * 5. Média Simples de Volume (SMA Volume) dos últimos 20 candles
 * @param {Array} candles 
 * @param {number} [period=20] 
 * @returns {Array<number|null>}
 */
function calculateVolumeAverage(candles, period = 20) {
    const volumeAvg = new Array(candles.length).fill(null);
    if (candles.length < period) return volumeAvg;

    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += Number(candles[i].volume);
    }
    volumeAvg[period - 1] = sum / period;

    // Janela deslizante para otimização de performance
    for (let i = period; i < candles.length; i++) {
        sum = sum - Number(candles[i - period].volume) + Number(candles[i].volume);
        volumeAvg[i] = sum / period;
    }

    return volumeAvg;
}

// Exportações para compatibilidade em múltiplos ambientes (Node.js e Navegador)
const indicators = {
    calculateEMA,
    calculateRSI,
    calculateMACD,
    calculateATR,
    calculateVolumeAverage
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = indicators;
}
if (typeof window !== 'undefined') {
    window.indicators = indicators;
}
