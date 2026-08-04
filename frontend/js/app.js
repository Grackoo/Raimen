const app = {
    cart: [],
    
    init() {
        auth.checkShift();
        inventory.loadItems();
    },

    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`${viewId}-view`).classList.add('active');
    },

    addToCart(item) {
        if (!auth.validateAction()) return;
        
        this.cart.push(item);
        this.renderCart();
    },

    renderCart() {
        const list = document.getElementById('cart-items');
        list.innerHTML = '';
        let total = 0;
        
        this.cart.forEach((item, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${item.name}</span> 
                <span>
                    $${item.price.toFixed(2)}
                    <button onclick="app.removeFromCart(${index})" style="width: auto; padding: 2px 5px; margin: 0 0 0 10px; background: #dc3545;">X</button>
                </span>
            `;
            list.appendChild(li);
            total += item.price;
        });
        
        document.getElementById('cart-total').textContent = total.toFixed(2);
    },
    
    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.renderCart();
    },

    clearCart() {
        this.cart = [];
        this.renderCart();
    }
};

window.onload = () => app.init();
