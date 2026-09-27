-- Them cot public_id de luu dinh danh noi bo cua file tren storage provider
-- (duong dan tren dia voi Local, public_id tren Cloudinary). Dung de xoa file sau nay.
ALTER TABLE media_assets
    ADD COLUMN public_id VARCHAR(500) NULL AFTER file_name;
