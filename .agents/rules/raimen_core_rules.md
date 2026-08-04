# Reglas Centrales de RAIMEN (Core Rules)

Estas reglas dictan la constitución técnica y de seguridad del espacio de trabajo para todas las futuras iteraciones de desarrollo del sistema omnicanal RAIMEN.

## 1. Directiva de Hardware y APIs del Navegador
- **Impresión Térmica Directa**: Es OBLIGATORIO utilizar la interfaz de comunicaciones experimentales `WebUSB` y `Web Serial` para enviar ráfagas de comandos binarios ESC/POS a impresoras térmicas directamente desde el cliente.
- **Restricciones**: Queda terminantemente prohibido el uso de diálogos de impresión estándar (e.g. `window.print()`) y la dependencia de drivers instalados a nivel de sistema operativo.

## 2. Generación de Elementos Ópticos
- **Generación Local en Front-End**: Se instaura el uso inamovible de la biblioteca de traducción de PostScript `bwip-js` para la generación local de identificadores QR por producto y la generación de etiquetas en el front-end. No se deben generar o descargar imágenes del backend.

## 3. Captura Óptica Móvil
- **Paradigma Mobile First**: El componente POS de caja debe ser completamente responsivo bajo el paradigma "Mobile First".
- **Escáner Óptico**: Se define la implementación de la biblioteca `html5-qrcode`.
- **Configuración Obligatoria**: Se debe usar `facingMode: "environment"` y establecer un campo de visualización delimitado (`qrbox`) para asegurar un alto índice de fotogramas (FPS) en dispositivos móviles del personal.

## 4. Aislamiento y Confianza (Seguridad)
- **Operaciones Destructivas**: Mantener la configuración de permisos del entorno para requerir explícita confirmación en operaciones destructivas (mediante `proceed-in-sandbox` o `request-review`).
- **Tolerancia a Fallos**: Diseñar los sistemas middleware (colas y webhooks) con control de errores explícito y prevención de condiciones de carrera contra la base de datos principal.
