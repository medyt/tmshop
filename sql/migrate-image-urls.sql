USE shoptop;

UPDATE products
SET image_urls = REPLACE(image_urls, '"/seed-', '"/images/seed-')
WHERE image_urls LIKE '%"/seed-%';
