
/**
 * api.js
 * Responsável por consultar candles (klines) da Binance
 * e converter a resposta para um formato padronizado do TTR.
 */

/**
 * Consulta as klines (candles) da API pública da Binance.
 *
 * @param {string} symbol - Ex: BTCUSDT
 * @param {string} interval - Ex: 15m, 1h, 4h
 * @param {number} [limit=500] - Máximo recomendado: 1000
 *
 * @returns {Promise<Array>}
 *
 * Estrutura retornada:
 * [
 *   {
 *     openTime: 1710000000000,
 *     closeTime: 1710000899999,
 *     open: 68000,
 *     high: 68200,
 *     low: 67900,
 *     close: 68150,
 *     volume: 123.45
 *   }
 * ]
 */
async function getKlines(symbol, interval, limit = 500) {
    if (!symbol || !interval) {
        throw new Error("Os parâmetros 'symbol' e 'interval' são obrigatórios.");
    }

    if (limit < 1 || limit > 1000) {
        throw new Error("O parâmetro 'limit' deve estar entre 1 e 1000.");
    }

    const baseUrl = "https://api.binance.com/api/v3/klines";

    const formattedSymbol = symbol.toUpperCase();

    const url =
        `${baseUrl}?symbol=${formattedSymbol}&interval=${interval}&limit=${limit}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();

            throw new Error(
                `Erro Binance (${response.status}): ${errorText}`
            );
        }

        const data = await response.json();

        return data.map(item => ({
            openTime: Number(item[0]),
            closeTime: Number(item[6]),

            open: Number(item[1]),
            high: Number(item[2]),
            low: Number(item[3]),
            close: Number(item[4]),

            volume: Number(item[5])
        }));
    } catch (error) {
        console.error("Falha ao obter klines da Binance:", error);
        throw error;
    }
}

/**
 * Exportação Node.js
 */
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        getKlines
    };
}

/**
 * Exportação Browser
 */
if (typeof window !== "undefined") {
    window.getKlines = getKlines;
}
