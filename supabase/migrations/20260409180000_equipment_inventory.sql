-- Owned equipment item ids (mirrors avatar_data.equipment_inventory for queries / RLS-friendly access)

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS equipment_inventory JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN students.equipment_inventory IS 'Array of owned modular equipment ids';
