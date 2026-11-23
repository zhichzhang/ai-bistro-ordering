DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM cart_items
        GROUP BY cart_id, canonical_identity
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate cart identities exist. Merge existing lines before applying this migration.';
    END IF;
END $$;

ALTER TABLE cart_items
    ADD CONSTRAINT cart_items_cart_id_canonical_identity_key
    UNIQUE (cart_id, canonical_identity);
