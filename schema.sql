-- =========================================================================
-- 0. CONFIGURACIÓN INICIAL
-- =========================================================================
-- Asegurar que tenemos la extensión para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. CUENTAS (Billeteras y Cuentas Bancarias)
-- =========================================================================
CREATE TABLE public.cuentas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    moneda TEXT NOT NULL CHECK (moneda IN ('USD', 'VES')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.cuentas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cuentas: CRUD solo para el propietario" ON public.cuentas FOR ALL USING (auth.uid() = user_id);

-- =========================================================================
-- 2. CATEGORÍAS
-- =========================================================================
CREATE TABLE public.categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    icono TEXT DEFAULT '🏷️',
    tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'gasto', 'ahorro')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categorías: CRUD solo para el propietario" ON public.categorias FOR ALL USING (auth.uid() = user_id);

-- =========================================================================
-- 3. PRESUPUESTOS MENSUALES
-- =========================================================================
CREATE TABLE public.presupuestos_mensuales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
    mes_anio VARCHAR(7) NOT NULL, -- Formato esperado: 'YYYY-MM'
    monto_limite NUMERIC NOT NULL CHECK (monto_limite >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(user_id, categoria_id, mes_anio) -- Evita presupuestos duplicados para el mismo mes
);

ALTER TABLE public.presupuestos_mensuales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Presupuestos: CRUD solo para el propietario" ON public.presupuestos_mensuales FOR ALL USING (auth.uid() = user_id);

-- =========================================================================
-- 4. DEUDAS
-- =========================================================================
CREATE TABLE public.deudas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    monto_inicial NUMERIC NOT NULL CHECK (monto_inicial >= 0),
    fecha_limite DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.deudas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deudas: CRUD solo para el propietario" ON public.deudas FOR ALL USING (auth.uid() = user_id);

-- =========================================================================
-- 5. METAS DE AHORRO
-- =========================================================================
CREATE TABLE public.metas_ahorro (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    monto_objetivo NUMERIC NOT NULL CHECK (monto_objetivo > 0),
    fecha_limite DATE,
    icono TEXT DEFAULT '🎯',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.metas_ahorro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Metas: CRUD solo para el propietario" ON public.metas_ahorro FOR ALL USING (auth.uid() = user_id);

-- =========================================================================
-- 6. TRANSACCIONES (El Núcleo del Sistema)
-- =========================================================================
CREATE TABLE public.transacciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'gasto', 'ahorro', 'abono_deuda')),
    
    -- Relaciones (todas con SET NULL para que si se borra una categoría, el movimiento no desaparezca del historial)
    cuenta_origen_id UUID REFERENCES public.cuentas(id) ON DELETE SET NULL,
    cuenta_destino_id UUID REFERENCES public.cuentas(id) ON DELETE SET NULL,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    meta_id UUID REFERENCES public.metas_ahorro(id) ON DELETE SET NULL,
    deuda_id UUID REFERENCES public.deudas(id) ON DELETE SET NULL,
    
    -- Multimoneda y Tasa de Cambio
    monto_original NUMERIC NOT NULL,
    moneda TEXT NOT NULL CHECK (moneda IN ('USD', 'VES')),
    tasa_cambio NUMERIC NOT NULL CHECK (tasa_cambio > 0), 
    monto_usd_calculado NUMERIC NOT NULL, -- Valor inmutable base
    
    descripcion TEXT,
    fecha DATE NOT NULL,
    legacy BOOLEAN NOT NULL DEFAULT false, -- True para movimientos viejos sin tasa asociada
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Índices para optimizar las consultas del Dashboard (filtrado por fechas y usuario es intensivo)
CREATE INDEX idx_transacciones_user_fecha ON public.transacciones (user_id, fecha);
CREATE INDEX idx_transacciones_tipo ON public.transacciones (tipo);

ALTER TABLE public.transacciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transacciones: CRUD solo para el propietario" ON public.transacciones FOR ALL USING (auth.uid() = user_id);
