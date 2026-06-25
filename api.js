/**
 * Consulta as klines (velas/candlesticks) da API pública da Binance.
 * * @param {string} symbol - O par de negociação em letras maiúsculas ou minúsculas (ex: 'BTCUSDT', 'ethbtc').
 * @param {string} interval - O intervalo de tempo da vela (ex: '1m', '5m', '15m', '1h', '4h', '1d', '1w').
 * @param {number} [limit=500] - Quantidade máxima de velas a serem retornadas (padrão: 500, máximo: 1000).
 * @returns {Promise<Array<{time: number, open: number, high: number, low: number, close: number, volume: number}>>} Um array de objetos com dados numéricos.
 */
async function getKlines(symbol, interval, limit = 500) {
    if (!symbol || !interval) {
        throw new Error("Os parâmetros 'symbol' e 'interval' são obrigatórios.");
    }

    const baseUrl = 'https://api.binance.com/api/v3/klines';
    // Converte o símbolo para maiúsculas para garantir a compatibilidade com a API da Binance
    const formattedSymbol = symbol.toUpperCase();
    const url = `${baseUrl}?symbol=${formattedSymbol}&interval=${interval}&limit=${limit}`;

    try {
        // Utiliza o fetch nativo (disponível em navegadores modernos e Node.js v18+)
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro na API da Binance (Status ${response.status}): ${errorText}`);
        }

        // A Binance retorna uma matriz (array de arrays)
        const data = await response.json();

        // Mapeia e converte a estrutura da resposta para os objetos estruturados e numéricos solicitados
        return data.map(item => ({
            time: Number(item[0]),     // Open time (Timestamp em milissegundos)
            open: Number(item[1]),     // Preço de abertura (convertido de String para Number)
            high: Number(item[2]),     // Preço máximo (convertido de String para Number)
            low: Number(item[3]),      // Preço mínimo (convertido de String para Number)
            close: Number(item[4]),    // Preço de fechamento (convertido de String para Number)
            volume: Number(item[5])    // Volume do ativo base (convertido de String para Number)
        }));
    } catch (error) {
        console.error('Falha ao obter klines da Binance:', error);
        throw error;
    }
}

// Exportação híbrida para garantir compatibilidade com diferentes ambientes:
// 1. Suporte para Node.js tradicional (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getKlines };
}
// 2. Suporte para Navegador (escopo global)
if (typeof window !== 'undefined') {
    window.getKlines = getKlines;
}
