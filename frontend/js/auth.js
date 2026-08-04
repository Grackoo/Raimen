const auth = {
    session: null,

    checkShift() {
        // Cargar sesión de localStorage
        const stored = localStorage.getItem('raimen_session');
        if (!stored) {
            window.location.href = 'login.html';
            return;
        }
        
        this.session = JSON.parse(stored);
        
        // El administrador tiene vista global
        const branchText = this.session.role === 'admin' ? '(Vista Global)' : `(Sucursal: ${this.session.branch})`;
        document.getElementById('branch-info').textContent = branchText;

        const statusEl = document.getElementById('shift-status');
        if (this.session.hasActiveShift) {
            statusEl.textContent = "Turno Activo - Operaciones habilitadas";
            statusEl.style.color = "#d4edda";
        } else {
            statusEl.textContent = "Sin turno activo - DENEGADO";
            statusEl.style.color = "#ffcccc";
        }
    },

    validateAction() {
        if (!this.session || !this.session.hasActiveShift) {
            alert("Operación denegada. La cajera en sesión carece de un turno activo en la tabla cash_shifts.");
            return false;
        }
        return true;
    },
    
    logout() {
        localStorage.removeItem('raimen_session');
        window.location.href = 'login.html';
    }
};
