const cron = require('node-cron');
const { refreshToken } = require('../services/meliService');

/**
 * Inicia el cron job para refrescar el token de Mercado Libre cada 5 horas.
 * (El access_token expira cada 6 horas)
 */
function startTokenCron() {
    // Cron schedule: "0 */5 * * *" -> A los 0 minutos, cada 5 horas.
    cron.schedule('0 */5 * * *', async () => {
        console.log('[Cron] Iniciando proceso de refresco del token OAuth 2.0...');
        try {
            await refreshToken();
            console.log('[Cron] Token refrescado exitosamente.');
        } catch (error) {
            console.error('[Cron] Error refrescando el token:', error.message);
        }
    });

    console.log('[Cron] Tarea de refresco de token programada (cada 5 horas).');
}

module.exports = { startTokenCron };
