/**
 * Módulo de Simulação de Backtesting Quantitativo (backtest.js)
 * Desenvolvido em JavaScript puro para o projeto TTR.
 * Compatível com Node.js e Navegadores modernos.
 */

// Como os módulos de indicadores, estrutura e score foram criados nos passos anteriores,
// garantimos compatibilidade acessando-os de forma dinâmica (seja via CommonJS require ou do escopo global/window)
function getModules() {
    let indicatorsMod, swingStructureMod, scoreEngineMod;

    if (typeof require !== 'undefined') {
        try { indicatorsMod = require('./indicators.js'); } catch(e) {}
        try { swingStructureMod = require('./swingStructure.js'); } catch(e) {}
        try { scoreEngineMod = require('./scoreEngine.js'); } catch(e) {}
    }

    return {
        indicators: indicatorsMod || (typeof window !== 'undefined' ? window.indicators : null),
        swingStructure: swingStructureMod || (typeof window !== 'undefined' ? window.swingStructure : null),
        scoreEngine: scoreEngineMod || (typeof window !== 'undefined' ? window.scoreEngine : null)
    };
}

/**
 * Executa a simulação de Backtest sobre um histórico completo de candles.
 * * @param {Array} candles - Histórico completo de candles { openTime, closeTime, open, high, low, close, volume }
 * @param {Object} [config] - Parâmetros customizáveis para a simulação
 * @param {number} [config.initialCapital=10000] - Capital inicial de simulação
 * @param {number} [config.riskPerTrade=0.01] - Risco por operação (ex: 0.01 = 1% do capital flutuante)
 * @returns {Object} Estatísticas consolidadas e histórico analítico de trades
 */
function runBacktest(candles, config = {}) {
    if (!candles || !Array.isArray(candles) || candles.length < 50) {
        throw new Error("Histórico de candles insuficiente ou inválido. São necessários ao menos 50 candles.");
    }

    const { indicators, swingStructure, scoreEngine } = getModules();
    if (!indicators || !swingStructure || !scoreEngine) {
        throw new Error("Dependências obrigatórias ('indicators.js', 'swingStructure.js', 'scoreEngine.js') não foram encontradas no ambiente.");
    }

    // Configurações padrão
    const initialCapital = config.initialCapital || 10000;
    const riskPerTrade = config.riskPerTrade || 0.01; 

    // Pré-calcula os vetores de indicadores para mapeamento de performance rápida
    const emas20 = indicators.calculateEMA(candles, 20);
    const emas50 = indicators.calculateEMA(candles, 50);
    const emas200 = indicators.calculateEMA(candles, 200);
    const rsis = indicators.calculateRSI(candles, 14);
    const macds = indicators.calculateMACD(candles, 12, 26, 9);
    const atrs = indicators.calculateATR(candles, 14);
    const volAverages = indicators.calculateVolumeAverage(candles, 20);

    let currentCapital = initialCapital;
    let peakCapital = initialCapital;
    let maxDrawdown = 0;

    const completedTrades = [];
    let activeTrade = null;

    // Loop histórico sequencial (percorre os candles reproduzindo o tempo real)
    for (let i = 200; i < candles.length; i++) {
        const currentCandle = candles[i];
        
        // 1. GERENCIAMENTO DE OPERAÇÃO ATIVA (Simula a movimentação de preço dentro do candle atual)
        if (activeTrade) {
            const highPrice = Number(currentCandle.high);
            const lowPrice = Number(currentCandle.low);

            // Verifica se o Stop Loss foi atingido primeiro (pior cenário)
            if (lowPrice <= activeTrade.stopLoss) {
                const lossValue = activeTrade.riskAmount; // Perda fixada pelo tamanho da posição
                currentCapital -= lossValue;
                
                activeTrade.closePrice = activeTrade.stopLoss;
                activeTrade.closeTime = currentCandle.closeTime;
                activeTrade.result = "LOSS";
                activeTrade.pnl = -lossValue;
                activeTrade.capitalAfter = currentCapital;
                
                completedTrades.push(activeTrade);
                activeTrade = null;
            } 
            // Verifica se o Take Profit foi atingido
            else if (highPrice >= activeTrade.takeProfit) {
                const winValue = activeTrade.riskAmount * 2; // Relação 1:2 fixa
                currentCapital += winValue;

                activeTrade.closePrice = activeTrade.takeProfit;
                activeTrade.closeTime = currentCandle.closeTime;
                activeTrade.result = "WIN";
                activeTrade.pnl = winValue;
                activeTrade.capitalAfter = currentCapital;

                completedTrades.push(activeTrade);
                activeTrade = null;
            }

            // Atualiza métricas de drawdown durante o trade ativo
            if (currentCapital > peakCapital) peakCapital = currentCapital;
            const currentDrawdown = ((peakCapital - currentCapital) / peakCapital) * 100;
            if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;

            // Se o trade ainda estiver ativo, pula para o próximo candle (evita bitransação)
            if (activeTrade) continue;
        }

        // 2. AVALIAÇÃO DE ENTRADA (Apenas se não houver operação ativa no momento)
        if (!activeTrade) {
            // Facha de histórico visível até o candle imediatamente anterior (evita lookahead bias)
            const historicalSlice = candles.slice(0, i);
            const currentVolAvg = volAverages[i - 1];

            // Obtém parâmetros de suporte, resistência e breakouts estruturais
            const structure = swingStructure.getMarketStructure(historicalSlice, currentVolAvg);

            // Monta o payload consolidado exigido pelo Motor de Score do TTR
            const scorePayload = {
                close: Number(candles[i - 1].close),
                ema20: emas20[i - 1],
                ema50: emas50[i - 1],
                ema200: emas200[i - 1],
                rsi: rsis[i - 1],
                macd: macds[i - 1].macd,
                macdSignal: macds[i - 1].signal,
                macdHist: macds[i - 1].histogram,
                volume: Number(candles[i - 1].volume),
                volumeAvg: currentVolAvg,
                atr: atrs[i - 1],
                support: structure.support ? structure.support.price : Number(candles[i - 1].low),
                resistance: structure.resistance ? structure.resistance.price : Number(candles[i - 1].high)
            };

            const evaluation = scoreEngine.calculateScore(scorePayload);
const atrValue = atrs[i - 1];

            if (
    !atrValue ||
    isNaN(atrValue) ||
    atrValue <= 0
) {
    continue;
}
              
            // GATILHO DE ENTRADA: Requisito operacional do TTR para classificação "Excelente" ou "Bom" (Score >= 60)
            const validEntry =
    evaluation.score >= 80 &&
    emas20[i - 1] > emas50[i - 1] &&
    emas50[i - 1] > emas200[i - 1] &&
    rsis[i - 1] >= 55 &&
    rsis[i - 1] <= 70 &&
    macds[i - 1]?.histogram > 0 &&
    Number(candles[i - 1].volume) > currentVolAvg;

if (validEntry) {
                const entryPrice = Number(currentCandle.open); // Entra na abertura do candle atual
              
                
                // Regras matemáticas de controle de risco estritas
                const stopLossDistance = 1.5 * atrValue;
                const stopLoss = entryPrice - stopLossDistance;
                const takeProfit = entryPrice + (stopLossDistance * 2); // Relação Risco:Retorno 1:2

                const riskAmount = currentCapital * riskPerTrade;
                
              if (stopLossDistance <= 0) {
    continue;
}

// Cálculo matemático do tamanho do lote dinâmico baseado na distância do stop
                const positionSize = riskAmount / stopLossDistance; 

                activeTrade = {
                    entryTime: currentCandle.openTime,
                    entryPrice,
                    stopLoss,
                    takeProfit,
                    riskAmount,
                    positionSize,
                    scoreAtEntry: evaluation.score,
                    classificationAtEntry: evaluation.classification,
                    motivos: evaluation.motivos
                };
            }
        }

        // Atualização de segurança do Drawdown histórico fora de posições ativas
        if (currentCapital > peakCapital) peakCapital = currentCapital;
        const currentDrawdown = ((peakCapital - currentCapital) / peakCapital) * 100;
        if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;
    }

    // 3. COMPILAÇÃO DE ESTATÍSTICAS QUANTITATIVAS FINAIS
    if (activeTrade) {
    activeTrade.result = "OPEN";
    completedTrades.push(activeTrade);
}
    const closedTrades = completedTrades.filter(
    t => t.result === "WIN" || t.result === "LOSS"
);

const totalTrades = closedTrades.length;
    const wins = closedTrades.filter(
    t => t.result === "WIN"
).length;

const losses = closedTrades.filter(
    t => t.result === "LOSS"
).length;
    
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    let totalGrossProfit = 0;
    let totalGrossLoss = 0;
    completedTrades.forEach(t => {
        if (t.pnl > 0) totalGrossProfit += t.pnl;
        if (t.pnl < 0) totalGrossLoss += Math.abs(t.pnl);
    });

    const profitFactor = totalGrossLoss > 0 ? totalGrossProfit / totalGrossLoss : totalGrossProfit > 0 ? Infinity : 0;
    const netProfit = currentCapital - initialCapital;
    const averageTrade = totalTrades > 0 ? netProfit / totalTrades : 0;

    return {
        initialCapital,
        finalCapital: currentCapital,
        netProfit,
        totalTrades,
        wins,
        losses,
        winRate: Number(winRate.toFixed(2)),
        profitFactor:
profitFactor === Infinity
    ? "Infinity"
    : Number(profitFactor.toFixed(2)),
        averageTrade: Number(averageTrade.toFixed(2)),
        maxDrawdown: Number(maxDrawdown.toFixed(2)),
        trades: completedTrades
    };
}

// Exportação estruturada para múltiplos ambientes
const backtestModule = { runBacktest };

if (typeof module !== 'undefined' && module.exports) {
    module.exports = backtestModule;
}
if (typeof window !== 'undefined') {
    window.backtest = backtestModule;
}
