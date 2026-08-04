const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// 1. Simulación de Cola (Array en memoria)
const messageQueue = [];

// 2. Endpoint Webhook ML
app.post('/webhook/ml', (req, res) => {
    // Responder inmediatamente con HTTP 200 (Mercado Libre requiere < 3000ms)
    res.status(200).send('OK');

    const payload = req.body;
    
    // Validar el payload y tópico, luego encolar
    if (payload && payload.topic) {
        if (payload.topic === 'orders_v2' || payload.topic === 'items') {
            messageQueue.push(payload);
            console.log(`[Webhook] Tópico recibido: ${payload.topic}. Añadido a la cola. (Total en cola: ${messageQueue.length})`);
        } else {
            console.log(`[Webhook] Tópico ignorado: ${payload.topic}`);
        }
    }
});

// 3. Worker Background para procesar la cola de mensajes
setInterval(() => {
    if (messageQueue.length > 0) {
        // Consumir el primer mensaje de la cola (FIFO)
        const payload = messageQueue.shift();
        console.log(`[Worker Cola] Procesando payload del tópico ${payload.topic}...`);
        
        // Simular Queries o actualización a BD para ml_stock y ml_price
        if (payload.topic === 'orders_v2') {
            console.log(`[Worker Cola] [Simulación DB] Descontando ml_stock para la orden en DB...`);
        } else if (payload.topic === 'items') {
            console.log(`[Worker Cola] [Simulación DB] Integrando cambios a ml_price y ml_stock para el item...`);
        }
        
        console.log(`[Worker Cola] Procesamiento finalizado para el payload.`);
    }
}, 1000); // Procesa un mensaje cada segundo si hay elementos en la cola

// 4. Worker/Cron para renovación de token OAuth2 de Mercado Libre
// 5 horas en milisegundos: 5 * 60 * 60 * 1000 = 18,000,000 ms
const FIVE_HOURS = 5 * 60 * 60 * 1000;
setInterval(() => {
    console.log(`[Cron Token] Iniciando renovación de token OAuth2 de Mercado Libre...`);
    // Simulando solicitud de actualización de token...
    setTimeout(() => {
        console.log(`[Cron Token] Token OAuth2 renovado exitosamente tras 5 horas.`);
    }, 500);
}, FIVE_HOURS);

// Mensaje inicial de que el cron está listo
console.log(`[Cron Token] Programado para renovarse cada 5 horas.`);

// Inicializar Servidor
app.listen(port, () => {
    console.log(`[Servidor] Backend Express corriendo en http://localhost:${port}`);
});
