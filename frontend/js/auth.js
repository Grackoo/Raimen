const auth = {
    hasActiveShift: false,

    checkShift() {
        // Simulando validación en capa middleware contra la tabla `cash_shifts`
        // En un entorno real se haría un fetch() a la API.
        const confirmShift = confirm("Simulación de Middleware: ¿Tiene la cajera un turno activo en cash_shifts? (Aceptar = Sí)");
        
        this.hasActiveShift = confirmShift;
        
        const statusEl = document.getElementById('shift-status');
        if (this.hasActiveShift) {
            statusEl.textContent = "Turno Activo - Operaciones habilitadas";
            statusEl.style.color = "#d4edda";
        } else {
            statusEl.textContent = "Sin turno activo - DENEGADO";
            statusEl.style.color = "#ffcccc";
        }
    },

    validateAction() {
        if (!this.hasActiveShift) {
            alert("Operación denegada. La cajera en sesión carece de un turno activo en la tabla cash_shifts.");
            return false;
        }
        return true;
    }
};
