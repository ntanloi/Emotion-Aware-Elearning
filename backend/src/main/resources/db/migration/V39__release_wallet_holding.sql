-- V39: Bo giu tien 7 ngay (Escrow holding), chuyen toan bo so du dang giu sang kha dung
UPDATE teacher_wallet_entries SET available_at = created_at WHERE available_at > NOW();
