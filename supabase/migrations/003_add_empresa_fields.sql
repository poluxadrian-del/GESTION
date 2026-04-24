-- =====================================================
-- Agregar campos empresa y telefono_empresa a clientes
-- =====================================================

-- Agregar campos empresa y telefono_empresa
ALTER TABLE clientes
ADD COLUMN empresa text,
ADD COLUMN telefono_empresa text;

-- Crear índices para mejor performance si se necesita buscar por empresa
CREATE INDEX idx_clientes_empresa ON clientes(empresa);
