-- Cambiar formato de número de contrato de 4 a 5 dígitos
-- CLI-2026-0502 → CLI-2026-00000
-- Agregar columna cargo (tipo texto)

-- 1. Agregar columna cargo a la tabla clientes
ALTER TABLE clientes
ADD COLUMN cargo text DEFAULT '';

-- 2. Actualizar función generadora de número de contrato
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
  nuevo_numero := 'CLI-' || año || '-' || LPAD(consecutivo::TEXT, 5, '0');
  RETURN nuevo_numero;
END;
$$ LANGUAGE plpgsql;

-- 3. Convertir contratos existentes al nuevo formato con guión separador
-- Maneja múltiples formatos:
-- - CLI-2026-0502 → CLI-2026-00502
-- - CLI-202600502 → CLI-2026-00502
-- - CLI-202600001 → CLI-2026-00001 (sin guión entre año y números)

UPDATE clientes
SET numero_contrato = 
  CASE 
    -- Formato con guión: CLI-YYYY-XXXX → CLI-YYYY-0XXXX
    WHEN numero_contrato ~ '^CLI-\d{4}-\d{4}$' THEN
      SUBSTRING(numero_contrato, 1, 9) || '0' || SUBSTRING(numero_contrato, 10)
    -- Formato sin guión con 5 dígitos: CLI-YYYYXXXXX → CLI-YYYY-XXXXX
    WHEN numero_contrato ~ '^CLI-\d{9}$' THEN
      SUBSTRING(numero_contrato, 1, 4) || SUBSTRING(numero_contrato, 5, 4) || '-' || SUBSTRING(numero_contrato, 9)
    -- Formato sin guión con 8 dígitos: CLIYYYXXXXX → CLI-YYYY-0XXXX
    WHEN numero_contrato ~ '^CLI\d{8}$' THEN
      'CLI-' || SUBSTRING(numero_contrato, 4, 4) || '-0' || SUBSTRING(numero_contrato, 8)
    ELSE
      numero_contrato  -- Mantener contratos que ya están en formato correcto
  END
WHERE numero_contrato IS NOT NULL
AND (numero_contrato ~ '^CLI-\d{4}-\d{4}$' 
  OR numero_contrato ~ '^CLI-\d{9}$' 
  OR numero_contrato ~ '^CLI\d{8}$');
