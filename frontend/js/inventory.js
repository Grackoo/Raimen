const inventory = {
    items: [],

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    saveItem(event) {
        event.preventDefault();
        
        if (!auth.validateAction()) return;

        const name = document.getElementById('item-name').value;
        const price = parseFloat(document.getElementById('item-price').value);
        let barcode = document.getElementById('item-barcode').value;

        // Regla 1: Al insertar un artículo sin código de barras de origen, autogenera un UUID/SKU
        if (!barcode) {
            // Usamos los primeros 12 o 13 caracteres para hacer el código legible para bwip-js code128/ean13.
            // O generamos un SKU aleatorio numérico.
            barcode = Math.floor(1000000000000 + Math.random() * 9000000000000).toString(); 
            // Usando 13 dígitos para emular un EAN13.
        }

        const item = { name, price, barcode };
        this.items.push(item);
        
        // ... y renderiza su correspondiente gráfico 2D mediante la biblioteca `bwip-js` en un lienzo Canvas localmente en el front-end.
        this.renderBarcode(barcode);
        this.renderList();
        
        event.target.reset();
        alert(`Artículo guardado: ${name}\nSKU: ${barcode}`);
    },

    renderBarcode(text) {
        try {
            // code128 es ideal para caracteres alfanuméricos, si es numérico puede ser ean13
            bwipjs.toCanvas('barcode-canvas', {
                bcid:        'code128',       
                text:        text,            
                scale:       3,               
                height:      15,              
                includetext: true,            
                textxalign:  'center',        
            });
        } catch (e) {
            console.error("Error al renderizar código de barras", e);
        }
    },

    renderList() {
        const list = document.getElementById('inventory-list');
        list.innerHTML = '';
        this.items.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div style="display:flex; flex-direction:column;">
                    <strong>${item.name}</strong>
                    <small style="color:#666;">SKU: ${item.barcode}</small>
                </div>
                <strong>$${item.price.toFixed(2)}</strong>
            `;
            list.appendChild(li);
        });
    },
    
    loadItems() {
        // Mock inicial
        this.items = [
            { name: "Agua Ciel 1L", price: 15.00, barcode: "1234567890123" },
            { name: "Coca Cola 600ml", price: 18.00, barcode: "7501055365470" }
        ];
        this.renderList();
    },
    
    findByBarcode(barcode) {
        return this.items.find(i => i.barcode === barcode);
    }
};
