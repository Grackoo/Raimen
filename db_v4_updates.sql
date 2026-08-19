-- Migración V4: Registro de Dinero Retirado del Negocio y Fondo para Siguiente Apertura en Corte de Caja

ALTER TABLE public.cash_registers
ADD COLUMN IF NOT EXISTS owner_withdrawal NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_opening_amount NUMERIC(10, 2) DEFAULT 0;
