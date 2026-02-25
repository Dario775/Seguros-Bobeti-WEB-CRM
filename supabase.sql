-- 1. Eliminar tablas existentes para recrear con la estructura correcta
DROP VIEW IF EXISTS public.collection_summary CASCADE;
DROP TABLE IF EXISTS public.policy_installments CASCADE;
DROP TABLE IF EXISTS public.policies CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;

-- 2. Crear tabla de Perfiles (RBAC)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('super_admin', 'admin', 'cobrador', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{
    "dashboard": true, 
    "clientes": true, 
    "asegurar": true, 
    "cobranzas": true,
    "clientes_crear": false,
    "clientes_editar": false,
    "clientes_eliminar": false,
    "pagos_editar": false,
    "polizas_crear": false,
    "polizas_editar": false,
    "polizas_eliminar": false,
    "usuarios_gestionar": false
  }'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Configuración del Sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    payment_alert_days INTEGER DEFAULT 5,
    policy_alert_days INTEGER DEFAULT 15,
    payment_message_template TEXT DEFAULT 'Hola {nombre}! Te recordamos que el pago de tu cuota de {monto} vence el día {fecha}. Agencia La Segunda.',
    policy_message_template TEXT DEFAULT 'Hola {nombre}! Te recordamos que tu póliza N° {nro_poliza} de La Segunda Seguros está próxima a vencer el día {fecha}. ¿Deseas renovarla?',
    companies JSONB DEFAULT '["La Segunda", "RUS", "San Cristobal", "Sancor"]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuración inicial
INSERT INTO public.system_settings (id, payment_alert_days, policy_alert_days)
VALUES ('global', 5, 15)
ON CONFLICT (id) DO NOTHING;

-- 3. Crear tabla de Clientes
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  dni TEXT UNIQUE NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Crear tabla de Pagos
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue', 'not_applicable')),
  paid_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(client_id, year, month)
);

-- 5. Crear tabla de Pólizas
CREATE TABLE public.policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  policy_number TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('auto', 'hogar', 'vida', 'comercio', 'otro')),
  company TEXT DEFAULT 'La Segunda',
  dominio TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_amount DECIMAL(12,2) NOT NULL,
  installments INTEGER NOT NULL DEFAULT 12,
  notes TEXT,
  status TEXT DEFAULT 'vigente' CHECK (status IN ('vigente', 'por_vencer', 'vencida', 'cancelada')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Crear tabla de Cuotas de Pólizas
CREATE TABLE public.policy_installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'pagada', 'vencida')),
  paid_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(policy_id, number)
);

-- 7. Configurar RLS (Seguridad)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Funciones de ayuda para políticas
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_perm(p_id UUID, p_key TEXT)
RETURNS BOOLEAN AS $$
  SELECT 
    role IN ('super_admin', 'admin') OR 
    COALESCE((permissions->>p_key)::boolean, false)
  FROM public.profiles 
  WHERE id = p_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- POLÍTICAS: Profiles
CREATE POLICY "Profiles: users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles: admins can do everything" ON public.profiles FOR ALL TO authenticated USING (public.get_my_role() IN ('super_admin', 'admin'));

-- POLÍTICAS: System Settings
CREATE POLICY "Settings: everyone can read" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Settings: admins can update" ON public.system_settings FOR UPDATE TO authenticated USING (public.get_my_role() IN ('super_admin', 'admin'));

-- POLÍTICAS: Clientes
CREATE POLICY "Clients: everyone can read" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Clients: granular insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.has_perm(auth.uid(), 'clientes_crear'));
CREATE POLICY "Clients: granular update" ON public.clients FOR UPDATE TO authenticated USING (public.has_perm(auth.uid(), 'clientes_editar'));
CREATE POLICY "Clients: granular delete" ON public.clients FOR DELETE TO authenticated USING (public.has_perm(auth.uid(), 'clientes_eliminar'));

-- POLÍTICAS: Pagos
CREATE POLICY "Payments: everyone can read" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Payments: granular insert" ON public.payments FOR INSERT TO authenticated WITH CHECK (public.has_perm(auth.uid(), 'pagos_editar'));
CREATE POLICY "Payments: granular update" ON public.payments FOR UPDATE TO authenticated USING (public.has_perm(auth.uid(), 'pagos_editar'));
CREATE POLICY "Payments: granular delete" ON public.payments FOR DELETE TO authenticated USING (public.get_my_role() = 'super_admin');

-- POLÍTICAS: Pólizas y Cuotas
CREATE POLICY "Policies: everyone can read" ON public.policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Policies: granular insert" ON public.policies FOR INSERT TO authenticated WITH CHECK (public.has_perm(auth.uid(), 'polizas_crear'));
CREATE POLICY "Policies: granular update" ON public.policies FOR UPDATE TO authenticated USING (public.has_perm(auth.uid(), 'polizas_editar'));
CREATE POLICY "Policies: granular delete" ON public.policies FOR DELETE TO authenticated USING (public.has_perm(auth.uid(), 'polizas_eliminar'));

CREATE POLICY "Installments: everyone can read" ON public.policy_installments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Installments: granular update" ON public.policy_installments FOR UPDATE TO authenticated USING (public.has_perm(auth.uid(), 'pagos_editar'));
CREATE POLICY "Installments: granular insert" ON public.policy_installments FOR INSERT TO authenticated WITH CHECK (public.has_perm(auth.uid(), 'polizas_crear'));
CREATE POLICY "Installments: granular delete" ON public.policy_installments FOR DELETE TO authenticated USING (public.has_perm(auth.uid(), 'polizas_eliminar'));

-- 8. Trigger para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role, permissions)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    'viewer',
    '{
      "dashboard": true, 
      "clientes": true, 
      "asegurar": true, 
      "cobranzas": true,
      "clientes_crear": false,
      "clientes_editar": false,
      "clientes_eliminar": false,
      "pagos_editar": false,
      "polizas_crear": false,
      "polizas_editar": false,
      "polizas_eliminar": false,
      "usuarios_gestionar": false
    }'::jsonb
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. CONTROL DE INTEGRIDAD (Sin Auditoría)

-- Función para proteger pagos
CREATE OR REPLACE FUNCTION public.check_payment_integrity()
RETURNS trigger AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  
  -- Los cobradores no pueden modificar cobros ya realizados
  IF (TG_OP = 'UPDATE' AND OLD.status = 'paid' AND user_role = 'cobrador') THEN
    RAISE EXCEPTION 'Operación no permitida: Un cobro ya procesado no puede ser alterado por un cobrador';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_payments_integrity
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE PROCEDURE public.check_payment_integrity();

-- Función para proteger bajas de clientes
CREATE OR REPLACE FUNCTION public.check_client_deletion()
RETURNS trigger AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  
  -- Los cobradores no pueden dar de baja asegurados
  IF (TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false AND user_role = 'cobrador') THEN
    RAISE EXCEPTION 'Operación no permitida: Los cobradores no pueden dar de baja asegurados';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_clients_deletion
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE PROCEDURE public.check_client_deletion();

-- 10. FUNCIÓN RPC PARA DASHBOARD (Optimización de Eficiencia)
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_month INTEGER DEFAULT NULL, p_year INTEGER DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_month INTEGER := COALESCE(p_month, EXTRACT(MONTH FROM NOW())::INTEGER);
  v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);
  total_clients BIGINT;
  overdue_count BIGINT;
  paid_this_month BIGINT;
  pending_this_month BIGINT;
  total_this_month BIGINT;
  history_data JSONB;
  by_type_data JSONB;
BEGIN
  -- Conteos básicos (Total clientes activos)
  SELECT COUNT(*) INTO total_clients FROM public.clients WHERE is_active = true;
  
  -- Pagos vencidos EN EL AÑO seleccionado
  SELECT COUNT(*) INTO overdue_count FROM public.payments WHERE status = 'overdue' AND year = v_year;
  
  -- Métricas del mes seleccionado
  SELECT 
    COUNT(*) FILTER (WHERE status = 'paid'),
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*)
  INTO paid_this_month, pending_this_month, total_this_month
  FROM public.payments 
  WHERE year = v_year AND month = v_month;

  -- Historial de últimos 6 meses (Tendencia invariable respecto al filtro para ver contexto)
  WITH months AS (
    SELECT 
      generate_series(
        DATE_TRUNC('month', NOW()) - INTERVAL '5 months',
        DATE_TRUNC('month', NOW()),
        INTERVAL '1 month'
      )::DATE as m_start
  )
  SELECT jsonb_agg(h) INTO history_data FROM (
    SELECT 
      TO_CHAR(m_start, 'TMMon') as label,
      COALESCE(SUM(p.amount), 0) as value
    FROM months
    LEFT JOIN public.payments p ON 
      p.year = EXTRACT(YEAR FROM m_start) AND 
      p.month = EXTRACT(MONTH FROM m_start) AND
      p.status = 'paid'
    GROUP BY m_start
    ORDER BY m_start ASC
  ) h;

  -- Distribución por tipo de póliza (Vigentes actuales)
  SELECT jsonb_object_agg(type, count) INTO by_type_data FROM (
    SELECT type, COUNT(*) as count 
    FROM public.policies 
    WHERE status IN ('vigente', 'por_vencer')
    GROUP BY type
  ) t;

  RETURN jsonb_build_object(
    'totalClients', total_clients,
    'overdueCount', overdue_count,
    'pendingThisMonth', pending_this_month,
    'collectionRate', CASE WHEN total_this_month > 0 THEN ROUND((paid_this_month::FLOAT / total_this_month) * 100) ELSE 0 END,
    'history', history_data,
    'byType', COALESCE(by_type_data, '{}'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SCRIPT DE LIMPIEZA MANUAL (Ejecutar en SQL Editor si quedan "fantasmas")
DELETE FROM public.payments 
WHERE client_id IN (SELECT id FROM public.clients WHERE full_name = 'DARIO OVEJERO')
AND status != 'paid';

-- =================================================================================
-- SI ESTÁS ACTUALIZANDO UNA BASE DATOS EXISTENTE, EJECUTA SOLO ESTO EN SQL EDITOR:
-- =================================================================================
-- ALTER TABLE public.system_settings ADD COLUMN companies JSONB DEFAULT '["La Segunda", "RUS", "San Cristobal", "Sancor"]'::jsonb;
-- ALTER TABLE public.policies ADD COLUMN company TEXT DEFAULT 'La Segunda';
