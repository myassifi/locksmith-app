-- Add item_name column to inventory table
ALTER TABLE public.inventory
ADD COLUMN item_name TEXT;

-- Update existing records to have item_name based on existing data
-- Format: Make Year Category
UPDATE public.inventory
SET item_name = CONCAT_WS(' ', 
  NULLIF(make, ''), 
  NULLIF(year_from::text, ''), 
  NULLIF(category, '')
)
WHERE item_name IS NULL;

-- For records without enough data, use SKU as fallback
UPDATE public.inventory
SET item_name = sku
WHERE item_name IS NULL OR item_name = '';