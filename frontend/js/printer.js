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
            const initPrinter = encoder.encode(ESC + "@");
            
            // Abrir gaveta: ESC p m t1 t2
            const drawerKick = encoder.encode(ESC + "p" + "\x00" + "\x19" + "\xFA"); 
            
            // Corte de papel parcial
            const cutPaper = encoder.encode(GS + "V" + "\x01");

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
            receiptContent += "\nGracias por tu compra\n\n";
            
            const textData = encoder.encode(receiptContent);

            // Obtener datos del Canvas (último código de barras generado, si existe)
            let rasterData = new Uint8Array(0);
            const canvas = document.getElementById('barcode-canvas');
            if (canvas && canvas.width > 0 && canvas.height > 0) {
                rasterData = this.canvasToEscPos(canvas);
            }

            // Concatenar todos los buffers
            let totalLength = initPrinter.length + textData.length + rasterData.length + drawerKick.length + cutPaper.length;
            let dataToPrint = new Uint8Array(totalLength);
            let offset = 0;
            
            dataToPrint.set(initPrinter, offset); offset += initPrinter.length;
            dataToPrint.set(textData, offset); offset += textData.length;
            dataToPrint.set(rasterData, offset); offset += rasterData.length;
            // Un par de saltos de línea tras el código
            const extraLines = encoder.encode("\n\n");
            
            // Reajustar buffer para extraLines
            let finalBuffer = new Uint8Array(dataToPrint.length + extraLines.length);
            finalBuffer.set(dataToPrint.slice(0, offset));
            finalBuffer.set(extraLines, offset);
            offset += extraLines.length;
            finalBuffer.set(drawerKick, offset); offset += drawerKick.length;
            finalBuffer.set(cutPaper, offset);
            
            // Buscar el endpoint OUT
            let endpointOut = null;
            for (const endpoint of this.device.configuration.interfaces[0].alternate.endpoints) {
                if (endpoint.direction === "out") {
                    endpointOut = endpoint.endpointNumber;
                    break;
                }
            }
            
            if (endpointOut !== null) {
                await this.device.transferOut(endpointOut, finalBuffer);
                console.log("Ticket impreso (texto + canvas) y comando de gaveta enviado con éxito.");
                app.clearCart();
                alert("Cobro exitoso. Gaveta abierta.");
            } else {
                throw new Error("No se encontró endpoint de salida en la interfaz de la impresora.");
            }
            
        } catch (error) {
            console.error("Error durante la impresión:", error);
            alert("Error al imprimir o abrir la gaveta.");
        }
    },

    canvasToEscPos(canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const imgData = ctx.getImageData(0, 0, width, height).data;
        
        const bytesPerRow = Math.ceil(width / 8);
        // GS v 0 <m> <xL> <xH> <yL> <yH> <data>
        let command = new Uint8Array(8 + (bytesPerRow * height));
        command[0] = 0x1D; // GS
        command[1] = 0x76; // v
        command[2] = 0x30; // 0
        command[3] = 0x00; // m=0
        command[4] = bytesPerRow & 0xFF;
        command[5] = (bytesPerRow >> 8) & 0xFF;
        command[6] = height & 0xFF;
        command[7] = (height >> 8) & 0xFF;
        
        let offset = 8;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < bytesPerRow; x++) {
                let byte = 0;
                for (let b = 0; b < 8; b++) {
                    let px = (x * 8) + b;
                    if (px < width) {
                        let idx = (y * width + px) * 4;
                        let r = imgData[idx], g = imgData[idx+1], b_color = imgData[idx+2], a = imgData[idx+3];
                        let brightness = (r + g + b_color) / 3;
                        if (brightness < 128 && a > 128) {
                            byte |= (1 << (7 - b));
                        }
                    }
                }
                command[offset++] = byte;
            }
        }
        return command;
    }
};
