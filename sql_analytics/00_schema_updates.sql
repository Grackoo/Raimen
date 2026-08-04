-- 1. Agrega la tabla 'branches' (sucursales)
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_virtual BOOLEAN DEFAULT FALSE, -- Para distinguir la sucursal virtual de Mercado Libre
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reemplaza 'employees' por 'users' (con roles ADMIN/CASHIER)
DROP TABLE IF EXISTS employees CASCADE;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) CHECK (role IN ('ADMIN', 'CASHIER')),
    branch_id INT REFERENCES branches(id), -- Un ADMIN tendrá branch_id nulo para vista global
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Añade 'branch_id' a las tablas relevantes
ALTER TABLE inventory_items ADD COLUMN branch_id INT REFERENCES branches(id);
ALTER TABLE financial_transactions ADD COLUMN branch_id INT REFERENCES branches(id);
ALTER TABLE cash_shifts ADD COLUMN branch_id INT REFERENCES branches(id);
ALTER TABLE sales ADD COLUMN branch_id INT REFERENCES branches(id);
