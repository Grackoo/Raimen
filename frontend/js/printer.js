const printer = {
    device: null,

    async connect() {
        try {
            // Regla 2: navigator.usb.requestDevice()
            this.device = await navigator.usb.requestDevice({
                filters: [{ classCode: 0x07 }] // 0x07 es la clase USB estándar para impresoras
            });
            await this.device.open();
            
            if (this.device.configuration === null) {
                await this.device.selectConfiguration(1);
            }
            
            await this.device.claimInterface(this.device.configuration.interfaces[0].interfaceNumber);
            return true;
        } catch (error) {
            console.error("Error conectando a impresora WebUSB:", error);
            alert("No se pudo conectar a la impresora. ¿Permisos denegados o dispositivo no conectado?");
            return false;
        }
    },

    async printReceipt() {
        if (app.cart.length === 0) {
            alert("El carrito está vacío.");
            return;
        }

        if (!auth.validateAction()) return;

        if (!this.device) {
            const connected = await this.connect();
            if (!connected) return;
        }

        try {
            const encoder = new TextEncoder();
            
            // Comandos ESC/POS estándar
            const ESC = "\x1B";
            const GS = "\x1D";
            
            // Inicializar impresora
            const initPrinter = ESC + "@";
            
            // Abrir gaveta: ESC p m t1 t2
            // m=0 (pin 2), t1=25, t2=250 (* 2ms)
            const drawerKick = ESC + "p" + "\x00" + "\x19" + "\xFA"; 
            
            // Corte de papel parcial
            const cutPaper = GS + "V" + "\x01";

            // Formatear el contenido de texto (Ticket)
            let receiptContent = "===== RAIMEN POS =====\n\n";
            let total = 0;
            
            app.cart.forEach(item => {
                const nameLine = item.name.substring(0, 20).padEnd(20);
                const priceLine = `$${item.price.toFixed(2)}`.padStart(10);
                receiptContent += `${nameLine}${priceLine}\n`;
                total += item.price;
            });
            
            receiptContent += `\nTOTAL: $${total.toFixed(2)}\n`;
            receiptContent += "\nGracias por tu compra\n\n\n\n";
            
            // Opcional: Aquí se podría intercalar el buffer del SVG/Canvas 
            // convertido a Raster Bit-Image (GS v 0). Para propósitos de este snippet
            // nos apegamos a la estructura básica solicitada y el drawer kick.

            // Concatenar todos los comandos
            const dataString = initPrinter + receiptContent + drawerKick + cutPaper;
            const dataToPrint = encoder.encode(dataString);

            // Buscar el endpoint OUT
            let endpointOut = null;
            for (const endpoint of this.device.configuration.interfaces[0].alternate.endpoints) {
                if (endpoint.direction === "out") {
                    endpointOut = endpoint.endpointNumber;
                    break;
                }
            }
            
            if (endpointOut !== null) {
                await this.device.transferOut(endpointOut, dataToPrint);
                console.log("Ticket impreso y comando de gaveta enviado con éxito.");
                app.clearCart();
                alert("Cobro exitoso. Gaveta abierta.");
            } else {
                throw new Error("No se encontró endpoint de salida en la interfaz de la impresora.");
            }
            
        } catch (error) {
            console.error("Error durante la impresión:", error);
            alert("Error al imprimir o abrir la gaveta.");
        }
    }
};
