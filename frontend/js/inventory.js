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
            // Generamos UUID
            barcode = this.generateUUID(); 
        }

        const branch = auth.session.role === 'admin' ? 'global' : auth.session.branch;
        const item = { name, price, barcode, branch };
        this.items.push(item);
        
        // ... y renderiza su correspondiente gráfico 2D mediante bwip-js
        this.renderBarcode(barcode);
        this.renderList();
        
        event.target.reset();
        alert(`Artículo guardado: ${name}\nSKU: ${barcode}\nSucursal: ${branch}`);
    },

    renderBarcode(text) {
        try {
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
        
        // Filtrar artículos por sucursal si es cajero
        const filteredItems = auth.session.role === 'admin' 
            ? this.items 
            : this.items.filter(i => i.branch === auth.session.branch || i.branch === 'global');

        filteredItems.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div style="display:flex; flex-direction:column;">
                    <strong>${item.name}</strong>
                    <small style="color:#666;">SKU: ${item.barcode} | Sucursal: ${item.branch}</small>
                </div>
                <strong>$${item.price.toFixed(2)}</strong>
            `;
            list.appendChild(li);
        });
    },
    
    loadItems() {
        // Mock inicial con sucursales
        this.items = [
            { name: "Agua Ciel 1L", price: 15.00, barcode: "1234567890123", branch: 'sucursal_centro' },
            { name: "Coca Cola 600ml", price: 18.00, barcode: "7501055365470", branch: 'sucursal_norte' },
            { name: "Sabritas 40g", price: 20.00, barcode: "7501011111111", branch: 'global' }
        ];
        this.renderList();
    },
    
    findByBarcode(barcode) {
        const item = this.items.find(i => i.barcode === barcode);
        if (item && auth.session.role !== 'admin' && item.branch !== auth.session.branch && item.branch !== 'global') {
            return null; // Restringe operación exclusiva a la sucursal local
        }
        return item;
    }
};
