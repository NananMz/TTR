/**
 * Estrutura de Mercado e Swing Points (swingStructure.js)
 * Compatível com Node.js e Navegadores.
 * Sem bibliotecas externas.
 */

/**
 * Encontra todos os Swing Highs no array de candles.
 * Um Swing High ocorre quando o high atual é maior que os highs dos 'lookback' candles anteriores e posteriores.
 * @param {Array} candles - Array de objetos de candles {openTime, closeTime, open, high, low, close, volume}.
 * @param {number} [lookback=2] - Número de candles para a esquerda e direita para confirmar o pivot.
 * @returns {Array} Array de objetos representando os Swing Highs.
 */
function findSwingHighs(candles, lookback = 2) {
    if (!candles || !Array.isArray(candles) || candles.length < (lookback * 2) + 1) {
        return [];
    }

    const swingHighs = [];
    for (let i = lookback; i < candles.length - lookback; i++) {
        const currentHigh = Number(candles[i].high);
        let isSwingHigh = true;

        // Verifica os candles anteriores e posteriores definidos pelo lookback
        for (let j = 1; j <= lookback; j++) {
            if (currentHigh <= Number(candles[i - j].high) || currentHigh <= Number(candles[i + j].high)) {
                isSwingHigh = false;
                break;
            }
        }

        if (isSwingHigh) {
            swingHighs.push({
                index: i,
                price: currentHigh,
                openTime: candles[i].openTime,
                closeTime: candles[i].closeTime
            });
        }
    }
    return swingHighs;
}

/**
 * Encontra todos os Swing Lows no array de candles.
 * Um Swing Low ocorre quando o low atual é menor que os lows dos 'lookback' candles anteriores e posteriores.
 * @param {Array} candles - Array de objetos de candles.
 * @param {number} [lookback=2] - Número de candles para a esquerda e direita para confirmar o pivot.
 * @returns {Array} Array de objetos representando os Swing Lows.
 */
function findSwingLows(candles, lookback = 2) {
    if (!candles || !Array.isArray(candles) || candles.length < (lookback * 2) + 1) {
        return [];
    }

    const swingLows = [];
    for (let i = lookback; i < candles.length - lookback; i++) {
        const currentLow = Number(candles[i].low);
        let isSwingLow = true;

        // Verifica os candles anteriores e posteriores definidos pelo lookback
        for (let j = 1; j <= lookback; j++) {
            if (currentLow >= Number(candles[i - j].low) || currentLow >= Number(candles[i + j].low)) {
                isSwingLow = false;
                break;
            }
        }

        if (isSwingLow) {
            swingLows.push({
                index: i,
                price: currentLow,
                openTime: candles[i].openTime,
                closeTime: candles[i].closeTime
            });
        }
    }
    return swingLows;
}

/**
 * Retorna o Swing Low mais recente que esteja abaixo do preço atual (último fechamento).
 * @param {Array} candles - Array de objetos de candles.
 * @returns {Object|null} Objeto do Swing Low ou null caso não exista suporte válido.
 */
function getNearestSupport(candles) {
    if (!candles || candles.length === 0) return null;
    
    const currentPrice = Number(candles[candles.length - 1].close);
    const lows = findSwingLows(candles);
    
    // Percorre do final (mais recente) para o início
    for (let i = lows.length - 1; i >= 0; i--) {
        if (lows[i].price < currentPrice) {
            return lows[i];
        }
    }
    return null;
}

/**
 * Retorna o Swing High mais recente que esteja acima do preço atual (último fechamento).
 * @param {Array} candles - Array de objetos de candles.
 * @returns {Object|null} Objeto do Swing High ou null caso não exista resistência válida.
 */
function getNearestResistance(candles) {
    if (!candles || candles.length === 0) return null;

    const currentPrice = Number(candles[candles.length - 1].close);
    const highs = findSwingHighs(candles);

    // Percorre do final (mais recente) para o início
    for (let i = highs.length - 1; i >= 0; i--) {
        if (highs[i].price > currentPrice) {
            return highs[i];
        }
    }
    return null;
}

/**
 * Analisa o último candle para detectar rompimento (Breakout) de estrutura.
 * Utiliza o Swing High / Low mais recente formado para validar a quebra.
 * @param {Array} candles - Array de objetos de candles.
 * @param {number} volumeAverage - Média de volume atual para validação.
 * @returns {Object} Detalhes do rompimento (breakout, direction, resistanceBroken, supportBroken, volumeConfirmed).
 */
function detectBreakout(candles, volumeAverage) {
    if (!candles || candles.length < 2) {
        return { breakout: false };
    }

    const lastCandle = candles[candles.length - 1];
    const currentClose = Number(lastCandle.close);
    const currentVolume = Number(lastCandle.volume);
    
    // Obtém o topo histórico mais recente (independente de estar acima do preço atual, pois queremos testar o rompimento)
    const highs = findSwingHighs(candles);
    const lows = findSwingLows(candles);
    
    const nearestHigh = getNearestResistance(candles);
    const nearestLow = getNearestSupport(candles);

    const isVolumeConfirmed =
    volumeAverage !== null &&
    volumeAverage !== undefined &&
    currentVolume > volumeAverage;

    // Rompimento de Alta: fechamento acima da resistência mais recente
    if (nearestHigh && currentClose > nearestHigh.price && isVolumeConfirmed) {
        return {
            breakout: true,
            direction: "bullish",
            resistanceBroken: nearestHigh.price,
            supportBroken: null,
            volumeConfirmed: isVolumeConfirmed
        };
    }

    // Rompimento de Baixa: fechamento abaixo do suporte mais recente
    if (
    nearestLow &&
    currentClose < nearestLow.price &&
    isVolumeConfirmed
) {
        return {
            breakout: true,
            direction: "bearish",
            resistanceBroken: null,
            supportBroken: nearestLow.price,
            volumeConfirmed: isVolumeConfirmed
        };
    }

    // Nenhum rompimento identificado
    return {
        breakout: false
    };
}

/**
 * Função principal para analisar e retornar a estrutura de mercado completa.
 * @param {Array} candles - Array de objetos de candles.
 * @param {number} volumeAverage - Média de volume atual.
 * @returns {Object} Estrutura consolidada contendo suportes, resistências, breakouts e todos os pivots.
 */
function getMarketStructure(candles, volumeAverage) {
    if (!candles || !Array.isArray(candles) || candles.length === 0) {
        throw new Error("Parâmetro 'candles' vazio, inválido ou não fornecido.");
    }

    return {
        support: getNearestSupport(candles),
        resistance: getNearestResistance(candles),
        breakout: detectBreakout(candles, volumeAverage),
        swingHighs: findSwingHighs(candles),
        swingLows: findSwingLows(candles)
    };
}

// Exportação híbrida (Navegador e Node.js)
const swingStructure = {
    findSwingHighs,
    findSwingLows,
    getNearestSupport,
    getNearestResistance,
    detectBreakout,
    getMarketStructure
};

// 1. Suporte para Node.js tradicional (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = swingStructure;
}
// 2. Suporte para Navegador (escopo global)
if (typeof window !== 'undefined') {
    window.swingStructure = swingStructure;
}
