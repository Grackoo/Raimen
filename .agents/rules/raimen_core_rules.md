---
description: Reglas de negocio, diseño UI/UX y requerimientos de hardware (POS) para el sistema RAIMEN.
---

# Reglas Core del Sistema RAIMEN

## 1. Estética e Identidad Visual (CRÍTICO)
- **Tema Base:** Tema oscuro (Deep Black/Charcoal) para los fondos principales de la aplicación.
- **Contenedores:** Cards, modales y menús deben tener fondos blancos o gris ultra-claro.
- **Formas Orgánicas:** Utilizar "blob shapes" para contenedores implementando propiedades CSS avanzadas como `border-radius: 50% 30% 70% 40%`.
- **Tipografía:**
  - **Títulos:** Fuentes de estilo "grunge", texturizadas o tipo "stencil" (ej. importadas de Google Fonts, como 'Black Ops One', 'Stardos Stencil' o similares) de alto peso visual.
  - **Datos y Tablas:** Fuentes sans-serif de alta legibilidad (ej. 'Inter', 'Roboto').
- **Identidad:** La interfaz debe basarse estrictamente en el logotipo de la marca.

## 2. Arquitectura RBAC (Control de Acceso Basado en Roles) y Vistas
- **Login Obligatorio:** El sistema debe forzar siempre una pantalla de Login inicial.
- **Roles:**
  - **Administrador:**
    - Acceso a creación y gestión (CRUD) de Sucursales.
    - Creación y gestión de usuarios/cajeros.
    - Reportes financieros globales.
    - Configuración de integraciones e-commerce (Mercado Libre).
  - **Cajero:**
    - Vista *Mobile-First*.
    - Restringido estrictamente a operar en su sucursal asignada.
    - Funcionalidades: Escaneo de códigos QR, apertura y cierre de caja, cobro a clientes.

## 3. Directiva de Hardware y Óptica
- **Generación de QR:** Utilizar `bwip-js` para la generación de códigos QR de productos (renderizados en Canvas/SVG).
- **Escáner de Cajero:** Utilizar `html5-qrcode` con la configuración `facingMode: "environment"` y un área focal delimitada (`qrbox`).
- **Impresión Térmica Directa:** Obligatorio el uso de las APIs experimentales **WebUSB** y **Web Serial** para enviar comandos binarios **ESC/POS** directo a impresoras térmicas desde el navegador, incluyendo el pulso eléctrico de apertura de gaveta al concretar ventas en efectivo o registrar turnos en `cash_shifts`.
