-- Migración V2: Refactorización Integral Raimen

-- 1. Actualización tabla sales
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);
-- (payment_method ya existe en v1)

-- 2. Actualización tabla customers
-- Si public.customers no existe, la creamos (no estaba en db_schema.sql inicial explícitamente pero asumimos que se creó)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    rfc TEXT,
    regimen_fiscal TEXT,
    codigo_postal TEXT,
    uso_cfdi TEXT,
    branch_id UUID REFERENCES public.branches(id)
);

-- Asegurarnos que existan las columnas fiscales si la tabla ya existía
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS rfc TEXT,
ADD COLUMN IF NOT EXISTS regimen_fiscal TEXT,
ADD COLUMN IF NOT EXISTS codigo_postal TEXT,
ADD COLUMN IF NOT EXISTS uso_cfdi TEXT;

-- Insertar Público en General si no existe
INSERT INTO public.customers (name, rfc, regimen_fiscal, uso_cfdi)
SELECT 'Público en General', 'XAXX010101000', '616 - Sin obligaciones fiscales', 'S01 - Sin efectos fiscales'
WHERE NOT EXISTS (
    SELECT 1 FROM public.customers WHERE name = 'Público en General'
);

-- 3. Actualización tabla expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    date TIMESTAMPTZ DEFAULT now(),
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    category TEXT,
    branch_id UUID REFERENCES public.branches(id),
    user_id UUID REFERENCES public.users(id)
);

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. Actualización tabla cash_registers
CREATE TABLE IF NOT EXISTS public.cash_registers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    opened_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ,
    branch_id UUID REFERENCES public.branches(id),
    user_id UUID REFERENCES public.users(id),
    opening_amount NUMERIC(10, 2) DEFAULT 0,
    expected_closing_amount NUMERIC(10, 2) DEFAULT 0,
    actual_closing_amount NUMERIC(10, 2) DEFAULT 0,
    difference NUMERIC(10, 2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'open',
    cash_sales NUMERIC(10, 2) DEFAULT 0,
    card_sales NUMERIC(10, 2) DEFAULT 0,
    transfer_sales NUMERIC(10, 2) DEFAULT 0,
    cash_expenses NUMERIC(10, 2) DEFAULT 0
);

ALTER TABLE public.cash_registers
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS cash_sales NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS card_sales NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS transfer_sales NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cash_expenses NUMERIC(10, 2) DEFAULT 0;

-- 5. Actualización tabla accounts_payable
CREATE TABLE IF NOT EXISTS public.accounts_payable (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    supplier TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    paid_amount NUMERIC(10, 2) DEFAULT 0,
    due_date DATE,
    status TEXT DEFAULT 'pending',
    branch_id UUID REFERENCES public.branches(id)
);

-- Deshabilitar RLS temporalmente en las nuevas tablas
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable DISABLE ROW LEVEL SECURITY;
