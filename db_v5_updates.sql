-- Migración V5: Sistema de Apartados
CREATE TABLE IF NOT EXISTS public.layaways (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    code TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_id UUID REFERENCES public.customers(id),
    total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    expiration_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, completed, cancelled, expired
    payment_method TEXT DEFAULT 'Efectivo',
    notes TEXT,
    branch_id UUID REFERENCES public.branches(id),
    cashier_id UUID REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.layaway_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    layaway_id UUID REFERENCES public.layaways(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity INT NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.layaway_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    layaway_id UUID REFERENCES public.layaways(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Efectivo',
    cashier_id UUID REFERENCES public.users(id),
    notes TEXT
);

-- Deshabilitar RLS temporalmente en las nuevas tablas
ALTER TABLE public.layaways DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.layaway_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.layaway_payments DISABLE ROW LEVEL SECURITY;
