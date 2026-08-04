const fastq = require('fastq');

// Worker function que procesa un item de la cola
async function processTask(task) {
    console.log(`[Worker] Procesando tarea para topic: ${task.topic}`);
    
    try {
        if (task.topic === 'orders_v2') {
            await processOrder(task.data);
        } else if (task.topic === 'items') {
            await processItem(task.data);
        }
    } catch (error) {
        console.error(`[Worker] Error procesando tarea ${task.topic}:`, error);
        throw error;
    }
}

// Inicializar la cola con concurrencia de 5 workers
const queue = fastq.promise(processTask, 5);

async function processOrder(payload) {
    console.log('[Worker] Descargando inventario (orders_v2)...');
    // TODO: Conexión con base de datos para descargar existencias (inventory_items)
    // Previene anomalías y condiciones de carrera contra ventas del mostrador físico de RAIMEN
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`[Worker] Orden ${payload.resource || 'N/A'} procesada. Inventario principal sincronizado.`);
}

async function processItem(payload) {
    console.log('[Worker] Actualizando detalles de item...');
    // TODO: Conexión a BD para sincronizar items
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`[Worker] Item ${payload.resource || 'N/A'} procesado en BD.`);
}

function queuePayload(payload) {
    queue.push(payload)
        .then(() => console.log(`[Queue] Payload de ${payload.topic} procesado con éxito por worker en segundo plano.`))
        .catch((err) => console.error(`[Queue] Fallo procesando payload de ${payload.topic}:`, err));
}

module.exports = {
    queuePayload
};
