-- Si la tabla ya existía, añadimos la columna 'type'
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'physical';

-- Por seguridad, nos aseguramos que también existan los otros campos en las tablas en caso de que hayan estado incompletas
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'cashier';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Asegurar campos en products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- Insertar sucursal por defecto si no existe ninguna
INSERT INTO public.branches (name, location, type)
SELECT 'Matriz', 'Principal', 'physical'
WHERE NOT EXISTS (SELECT 1 FROM public.branches);
