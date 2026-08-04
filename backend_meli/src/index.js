require('dotenv').config();
const express = require('express');
const { startTokenCron } = require('./cron/tokenRefresh');
const webhooksRouter = require('./webhooks/meli');

const app = express();
app.use(express.json());

// Montar endpoints de webhooks
app.use('/webhook', webhooksRouter);

// Iniciar cron jobs
startTokenCron();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[Servidor] Middleware Mercado Libre ejecutándose en el puerto ${PORT}`);
});
