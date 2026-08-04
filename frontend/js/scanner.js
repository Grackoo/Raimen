const scanner = {
    html5QrcodeScanner: null,

    startScan() {
        if (!auth.validateAction()) return;

        document.getElementById('reader-container').style.display = 'block';
        
        if (!this.html5QrcodeScanner) {
            this.html5QrcodeScanner = new Html5Qrcode("reader");
        }

        // Regla 3: facingMode: "environment" y un campo qrbox delimitado para altos FPS
        const config = { 
            fps: 30, // Altos FPS
            qrbox: { width: 250, height: 150 }, // qrbox delimitado para códigos de barras
            aspectRatio: 1.0,
            disableFlip: false
        };

        this.html5QrcodeScanner.start(
            { facingMode: "environment" }, 
            config,
            (decodedText, decodedResult) => {
                this.onScanSuccess(decodedText, decodedResult);
            },
            (errorMessage) => {
                // Errores de parseo normales (fondo, desenfoque)
                // console.log(errorMessage);
            }
        ).catch(err => {
            console.error(`Error iniciando scanner: ${err}`);
            alert("No se pudo iniciar la cámara. Verifica los permisos.");
            this.stopScan();
        });
    },

    onScanSuccess(decodedText, decodedResult) {
        // Pausar escaneo o detener para procesar
        this.stopScan();
        
        // Buscar el artículo en el inventario por SKU/Barcode
        const item = inventory.findByBarcode(decodedText);
        if (item) {
            app.addToCart(item);
        } else {
            alert(`Artículo no encontrado para código: ${decodedText}`);
        }
    },

    stopScan() {
        if (this.html5QrcodeScanner) {
            this.html5QrcodeScanner.stop().then(() => {
                document.getElementById('reader-container').style.display = 'none';
            }).catch(err => {
                console.error("Error deteniendo el scanner.", err);
                // Forzar ocultamiento en caso de error
                document.getElementById('reader-container').style.display = 'none';
            });
        } else {
            document.getElementById('reader-container').style.display = 'none';
        }
    }
};
