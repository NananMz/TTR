/**
 * scoreEngine.js
 * TTR V1
 */

function calculateScore(indicators) {
    let rawScore = 0;
    const motivos = [];

    if (!indicators || typeof indicators !== "object") {
        throw new Error("Parâmetro 'indicators' inválido.");
    }

    const {
        close,
        ema20,
        ema50,
        ema200,
        rsi,
        macd,
        macdSignal,
        macdHist,
        volume,
        volumeAvg,
        atr
    } = indicators;

    // ==========================
    // 1. TENDÊNCIA (0-20)
    // ==========================
    const isEmaBullish =
        ema20 > ema50 &&
        ema50 > ema200;

    if (isEmaBullish) {
        rawScore += 20;
        motivos.push("EMA20 > EMA50 > EMA200 (tendência de alta forte).");
    } else if (ema20 > ema50) {
        rawScore += 10;
        motivos.push("EMA20 acima da EMA50 (tendência moderada).");
    } else {
        motivos.push("Tendência não alinhada.");
    }

    // ==========================
    // 2. RSI (0-10)
    // ==========================
    if (rsi >= 55 && rsi <= 70) {
        rawScore += 10;
        motivos.push(`RSI saudável (${rsi.toFixed(2)}).`);
    } else if (rsi >= 45 && rsi < 55) {
        rawScore += 5;
        motivos.push(`RSI neutro (${rsi.toFixed(2)}).`);
    } else if (rsi > 75) {
        motivos.push(`RSI sobrecomprado (${rsi.toFixed(2)}).`);
    } else {
        motivos.push(`RSI desfavorável (${rsi.toFixed(2)}).`);
    }

    // ==========================
    // 3. MACD (0-15)
    // ==========================
    let macdPoints = 0;

    if (macd > macdSignal) macdPoints += 10;
    if (macdHist > 0) macdPoints += 5;

    rawScore += macdPoints;

    if (macdPoints === 15) {
        motivos.push("MACD totalmente comprador.");
    } else if (macdPoints > 0) {
        motivos.push("MACD parcialmente favorável.");
    } else {
        motivos.push("MACD vendedor.");
    }

    // ==========================
    // 4. VOLUME (0-20)
    // ==========================
    const volumeRatio = volume / volumeAvg;

    if (volumeRatio >= 1.5) {
        rawScore += 20;
        motivos.push("Volume acima de 150% da média.");
    } else if (volumeRatio >= 1.1) {
        rawScore += 10;
        motivos.push("Volume acima da média.");
    } else {
        motivos.push("Volume fraco.");
    }

    // ==========================
    // 5. ATR (0-10)
    // ==========================
    const atrPercent = (atr / close) * 100;

    if (atrPercent >= 0.5 && atrPercent <= 3) {
        rawScore += 10;
        motivos.push("ATR em faixa saudável.");
    } else {
        motivos.push("ATR fora da faixa ideal.");
    }

    // ==========================
    // FILTRO PRINCIPAL
    // ==========================
    const isMacdBullish =
        macd > macdSignal &&
        macdHist > 0;

    const isVolumeBullish =
        volume > volumeAvg;

    if (!(isEmaBullish && isMacdBullish && isVolumeBullish)) {
        if (rawScore > 44) {
            rawScore = 44;
            motivos.unshift(
                "Filtro principal ativado: EMA, MACD e Volume não estão alinhados."
            );
        }
    }

    // ==========================
    // NORMALIZAÇÃO
    // ==========================
    let score = Math.round((rawScore / 75) * 100);
    score = Math.max(0, Math.min(100, score));

    // ==========================
    // CLASSIFICAÇÃO
    // ==========================
    let classification;

    if (score >= 80) classification = "Excelente";
    else if (score >= 60) classification = "Bom";
    else if (score >= 40) classification = "Fraco";
    else classification = "Não Operar";

    return {
        score,
        classification,
        motivos
    };
}

/**
 * 🔥 FIX PRINCIPAL:
 * Agora o dashboard pode usar:
 * scoreEngine.calculateScore(...)
 */
const scoreEngine = {
    calculateScore
};

// ==========================
// EXPORTS (Node + Browser)
// ==========================
if (typeof module !== "undefined" && module.exports) {
    module.exports = scoreEngine;
}

if (typeof window !== "undefined") {
    window.scoreEngine = scoreEngine;
}
