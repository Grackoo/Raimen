const axios = require('axios');

async function runTests() {
  console.log("==========================================");
  console.log("🚀 RAIMEN - SANDBOX TEST SUITE EXECUTION 🚀");
  console.log("==========================================\n");

  console.log("[1] INICIANDO PRUEBA DE TOLERANCIA Y VELOCIDAD DE WEBHOOK (Meli Middleware)...");
  
  const payload = {
    resource: "/orders/123456789",
    user_id: 987654321,
    topic: "orders_v2",
    application_id: 112233445566,
    attempts: 1,
    sent: new Date().toISOString(),
    received: new Date().toISOString()
  };

  try {
    const startTime = performance.now();
    // Simulamos la petición POST al webhook de Mercado Libre
    const response = await axios.post('http://localhost:3000/webhook/meli', payload, {
      timeout: 5000 
    });
    const endTime = performance.now();
    const durationMs = (endTime - startTime).toFixed(2);

    console.log(`[✔] Petición simulada de Mercado Libre (topic: orders_v2) enviada.`);
    console.log(`[✔] Respuesta HTTP obtenida: ${response.status} ${response.statusText}`);
    console.log(`[✔] Tiempo de respuesta del Webhook: ${durationMs} ms`);

    if (durationMs < 3000) {
       console.log(`[ÉXITO] El endpoint cumple con la cuota estricta de < 3000ms de Mercado Libre.\n`);
    } else {
       console.log(`[ADVERTENCIA] El endpoint tardó demasiado y podría provocar caídas.\n`);
    }

  } catch (error) {
    console.log(`[ERROR] No se pudo contactar al webhook: ${error.message}\n`);
    console.log(`(Nota: Asegúrese de que el backend esté ejecutándose en el puerto 3000)\n`);
  }

  console.log("[2] SIMULANDO MANIPULACIÓN DE ESTADOS EN MÓDULO DE CAJA (Cash Shifts)...");
  
  // Simulando estado de base de datos
  const mockShift = {
    shift_id: "uuid-999-888-777",
    starting_cash: 500.00,
    expected_cash: 1250.00, // asumiendo 750 de ventas registradas
    actual_cash: null,
    status: "OPEN"
  };

  console.log(`[-] Turno abierto: Fondo inicial $${mockShift.starting_cash}, Saldo esperado $${mockShift.expected_cash}`);
  
  // Simulando el cierre de la cajera introduciendo el conteo real
  const cashierInput = 1200.00; // Faltan 50
  console.log(`[-] Cajera declara conteo real: $${cashierInput}`);

  const variance_amount = cashierInput - mockShift.expected_cash;
  
  mockShift.actual_cash = cashierInput;
  mockShift.variance_amount = variance_amount;
  
  if (variance_amount !== 0) {
      mockShift.status = "DISCREPANCY";
      console.log(`[!] ALERTA GENERADA: Se detectó una discrepancia en el cierre de caja.`);
      console.log(`[!] Faltante/Sobrante (variance_amount): $${variance_amount.toFixed(2)}`);
      console.log(`[✔] Estado del turno actualizado a: ${mockShift.status}`);
  } else {
      mockShift.status = "CLOSED";
      console.log(`[✔] Cierre de caja exacto. Estado actualizado a: ${mockShift.status}`);
  }
  
  console.log("\n==========================================");
  console.log("✅ FIN DE LA EJECUCIÓN DEL SANDBOX ✅");
  console.log("==========================================");
}

runTests();
