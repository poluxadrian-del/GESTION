-- =====================================================
-- Sistema de Gestión de Cobranza - Schema Inicial
-- =====================================================

-- Crear enums
CREATE TYPE usuario_rol AS ENUM ('socio', 'admin', 'supervisor');
CREATE TYPE cliente_estado AS ENUM ('inicio', 'activo', 'pausa', 'liquidado');
CREATE TYPE pago_frecuencia AS ENUM ('quincenal', 'mensual');
CREATE TYPE pago_estado AS ENUM ('pendiente', 'pagado', 'vencido');
CREATE TYPE contacto_tipo AS ENUM ('llamada', 'whatsapp', 'email');
CREATE TYPE contacto_resultado AS ENUM ('contactado', 'no_contesto', 'promesa_pago', 'numero_incorrecto');

-- =====================================================
-- TABLA: usuarios
-- =====================================================
CREATE TABLE usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  nombre_completo text NOT NULL,
  rol usuario_rol NOT NULL DEFAULT 'admin',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLA: gestores
-- =====================================================
CREATE TABLE gestores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLA: clientes
-- =====================================================
CREATE TABLE clientes (
  -- Identificador
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_contrato text UNIQUE,
  
  -- Datos personales
  gestor_id uuid REFERENCES gestores(id) ON DELETE SET NULL,
  nombre_completo text NOT NULL,
  telefono_celular text,
  email text,
  ubicacion text,
  ref_nombre text,
  ref_telefono text,
  
  -- Datos del contrato
  fecha_inicio date,
  precio_venta numeric(15,2) NOT NULL DEFAULT 0,
  descuento numeric(15,2) NOT NULL DEFAULT 0,
  total_pagado numeric(15,2) NOT NULL DEFAULT 0,
  saldo numeric(15,2) GENERATED ALWAYS AS (precio_venta - descuento - total_pagado) STORED,
  meses_pagados integer GENERATED ALWAYS AS (CASE WHEN monto_pago > 0 THEN (total_pagado / monto_pago)::integer ELSE 0 END) STORED,
  
  frecuencia_pago pago_frecuencia NOT NULL DEFAULT 'mensual',
  mensualidades integer CHECK (mensualidades >= 2 AND mensualidades <= 18),
  monto_pago numeric(15,2) NOT NULL DEFAULT 0,
  dia_pago integer NOT NULL CHECK (dia_pago >= 1 AND dia_pago <= 31),
  fecha_primer_pago date,
  
  -- Administrativo
  vendedor text,
  factura boolean NOT NULL DEFAULT false,
  comision boolean NOT NULL DEFAULT false,
  estado cliente_estado NOT NULL DEFAULT 'inicio',
  notas text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLA: pagos
-- =====================================================
CREATE TABLE pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  gestor_id uuid REFERENCES gestores(id) ON DELETE SET NULL,
  
  numero_pago integer NOT NULL,
  fecha_programada date NOT NULL,
  fecha_pago date,
  monto_programado numeric(15,2) NOT NULL,
  monto_pagado numeric(15,2) NOT NULL DEFAULT 0,
  dias_atraso integer NOT NULL DEFAULT 0,
  
  estado pago_estado NOT NULL DEFAULT 'pendiente',
  notas text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(cliente_id, numero_pago)
);

-- =====================================================
-- TABLA: seguimientos
-- =====================================================
CREATE TABLE seguimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  
  tipo_contacto contacto_tipo NOT NULL,
  resultado contacto_resultado NOT NULL,
  fecha_contacto timestamptz NOT NULL DEFAULT now(),
  notas text,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- FUNCIÓN: Generar número de contrato autogenerado
-- =====================================================
CREATE OR REPLACE FUNCTION generar_numero_contrato()
RETURNS TEXT AS $$
DECLARE
  año TEXT;
  consecutivo INTEGER;
  nuevo_numero TEXT;
BEGIN
  año := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(COUNT(*), 0) + 1 INTO consecutivo
  FROM clientes
  WHERE numero_contrato LIKE 'CLI-' || año || '-%';
  nuevo_numero := 'CLI-' || año || '-' || LPAD(consecutivo::TEXT, 4, '0');
  RETURN nuevo_numero;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Asignar número de contrato automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_numero_contrato()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_contrato IS NULL OR NEW.numero_contrato = '' THEN
    NEW.numero_contrato := generar_numero_contrato();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_numero_contrato
  BEFORE INSERT ON clientes
  FOR EACH ROW EXECUTE FUNCTION trigger_numero_contrato();

-- =====================================================
-- ÍNDICES para mejor performance
-- =====================================================
CREATE INDEX idx_clientes_gestor_id ON clientes(gestor_id);
CREATE INDEX idx_clientes_estado ON clientes(estado);
CREATE INDEX idx_clientes_numero_contrato ON clientes(numero_contrato);
CREATE INDEX idx_pagos_cliente_id ON pagos(cliente_id);
CREATE INDEX idx_pagos_gestor_id ON pagos(gestor_id);
CREATE INDEX idx_pagos_estado ON pagos(estado);
CREATE INDEX idx_pagos_fecha_programada ON pagos(fecha_programada);
CREATE INDEX idx_seguimientos_cliente_id ON seguimientos(cliente_id);
CREATE INDEX idx_seguimientos_usuario_id ON seguimientos(usuario_id);
CREATE INDEX idx_usuarios_email ON usuarios(email);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestores ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimientos ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA USUARIOS
-- Socio y Admin pueden ver todos los usuarios
CREATE POLICY "usuarios_view_all" ON usuarios
  FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('socio', 'admin')
  );

-- POLÍTICAS PARA GESTORES
-- Todos pueden ver gestores activos
CREATE POLICY "gestores_view_all" ON gestores
  FOR SELECT
  USING (true);

-- POLÍTICAS PARA CLIENTES
-- Socio y Admin tienen acceso total
CREATE POLICY "clientes_socio_admin" ON clientes
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('socio', 'admin')
  );

-- Supervisor puede ver clientes
CREATE POLICY "clientes_supervisor_view" ON clientes
  FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'supervisor'
  );

-- POLÍTICAS PARA PAGOS
-- Socio y Admin tienen acceso total
CREATE POLICY "pagos_socio_admin" ON pagos
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('socio', 'admin')
  );

-- Supervisor puede ver pagos
CREATE POLICY "pagos_supervisor_view" ON pagos
  FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'supervisor'
  );

-- POLÍTICAS PARA SEGUIMIENTOS
-- Socio y Admin tienen acceso total
CREATE POLICY "seguimientos_socio_admin" ON seguimientos
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('socio', 'admin')
  );

-- Supervisor puede ver y crear seguimientos
CREATE POLICY "seguimientos_supervisor_view" ON seguimientos
  FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'supervisor'
  );

CREATE POLICY "seguimientos_supervisor_insert" ON seguimientos
  FOR INSERT
  WITH CHECK (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'supervisor'
    AND usuario_id = auth.uid()
  );

-- =====================================================
-- DATOS INICIALES (OPCIONAL)
-- =====================================================
-- Descomenta las líneas siguientes si quieres datos iniciales

-- INSERT INTO gestores (nombre) VALUES
--   ('Carlos Mendoza'),
--   ('María García'),
--   ('Juan López');
