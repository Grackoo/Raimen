-- Ejecuta este script completo en el SQL Editor de tu proyecto en Supabase para crear/restaurar todas las tablas.

-- 1. Crear tabla de sucursales (branches)
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  location TEXT,
  type TEXT DEFAULT 'physical'
);

-- 2. Crear tabla de usuarios (users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  username TEXT UNIQUE,
  full_name TEXT,
  name TEXT, -- para retrocompatibilidad
  pin TEXT,
  role TEXT DEFAULT 'cashier',
  branch_id UUID REFERENCES public.branches(id),
  active BOOLEAN DEFAULT true
);

-- 3. Crear tabla de productos (products)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  sku TEXT UNIQUE NOT NULL,
  stock INT DEFAULT 0,
  price NUMERIC(10, 2) DEFAULT 0,
  cost NUMERIC(10, 2) DEFAULT 0,
  ml_price NUMERIC(10, 2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  warning BOOLEAN DEFAULT false,
  image TEXT,
  branch_id UUID REFERENCES public.branches(id)
);

-- 4. Crear tabla de ventas (sales)
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  total NUMERIC(10, 2) NOT NULL,
  payment_method TEXT,
  cashier_id UUID REFERENCES public.users(id),
  branch_id UUID REFERENCES public.branches(id)
);

-- 5. Crear tabla de items de venta (sale_items)
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales(id),
  product_id UUID REFERENCES public.products(id),
  quantity INT NOT NULL,
  price NUMERIC(10, 2) NOT NULL
);

-- 6. Deshabilitar temporalmente Row Level Security (RLS) para permitir lectura/escritura sin autenticación 
-- (Solo recomendado para pruebas o si tu API KEY es de uso interno)
ALTER TABLE public.branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;

-- 7. Insertar sucursal por defecto si no existe ninguna
INSERT INTO public.branches (name, location, type)
SELECT 'Matriz', 'Principal', 'physical'
WHERE NOT EXISTS (SELECT 1 FROM public.branches);
