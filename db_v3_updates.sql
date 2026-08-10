-- Migración V3: Catálogo de Motivos de Gastos

CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    name TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true
);

-- Insertar categorías por defecto
INSERT INTO public.expense_categories (name)
VALUES 
    ('Operativo'),
    ('Administrativo'),
    ('Nómina'),
    ('Marketing'),
    ('Mantenimiento'),
    ('Insumos'),
    ('Renta'),
    ('Luz'),
    ('Agua'),
    ('Internet'),
    ('Teléfono'),
    ('Impuestos'),
    ('Otro')
ON CONFLICT (name) DO NOTHING;

-- Deshabilitar RLS temporalmente en la nueva tabla
ALTER TABLE public.expense_categories DISABLE ROW LEVEL SECURITY;
