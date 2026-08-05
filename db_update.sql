-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase

-- 1. Agrega las nuevas columnas a la tabla 'products'
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS cost NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS image TEXT,
ADD COLUMN IF NOT EXISTS branch_id UUID;

-- 2. Asegúrate de que las columnas tengan un valor por defecto seguro si es necesario
UPDATE public.products SET category = 'General' WHERE category IS NULL;
UPDATE public.products SET cost = 0 WHERE cost IS NULL;

-- 3. Crear el bucket de almacenamiento (storage) para las imágenes de productos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Permitir lectura pública al bucket 'product-images'
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

-- 5. Permitir insertar y subir imágenes (solo usuarios autenticados si prefieres seguridad, aquí damos acceso abierto temporal para pruebas)
CREATE POLICY "Public Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'product-images');

-- 6. Agregar branch_id a otras tablas relevantes si no lo tienen (ventas)
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS branch_id UUID;
