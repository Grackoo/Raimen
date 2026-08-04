const express = require('express');
const router = express.Router();
const { queuePayload } = require('../queue/worker');

router.post('/meli', async (req, res) => {
    // 1. Responder inmediatamente HTTP 200 (en menos de 3000ms)
    res.status(200).send('OK');

    // 2. Extraer el payload recibido
    const payload = req.body;
    const topic = payload.topic; // orders_v2 o items

    if (topic === 'orders_v2' || topic === 'items') {
        console.log(`[Webhook] Recibida notificación del topic: ${topic}. Encolando...`);
        // 3. Inyectar payload en la cola interna para procesamiento asíncrono en segundo plano
        queuePayload({ topic, data: payload });
    } else {
        console.log(`[Webhook] Topic no soportado o irrelevante: ${topic}`);
    }
});

module.exports = router;
