package com.elearning.emotion.service.storage;

import org.springframework.web.multipart.MultipartFile;

/**
 * Tach interface de doi qua lai giua luu dia local (dev) va Cloudinary (production)
 * ma KHONG phai sua MediaController hay bat ky noi nao khac dang goi service nay.
 * Chon implementation nao dang active qua property app.storage.provider (local | cloudinary),
 * xem CloudinaryFileStorageService / LocalFileStorageService.
 */
public interface FileStorageService {

    /** Luu file, tra ve URL cong khai de client tai ve (vd: /uploads/audio/xxx.mp3 hoac URL Cloudinary) */
    StoredFile store(MultipartFile file, MediaCategory category);

    /**
     * Xoa file da luu (dung khi giang vien thay the/xoa media). Voi Local la xoa file tren dia,
     * voi Cloudinary la goi API destroy() dua tren publicId. Khong nem loi neu file khong ton tai.
     */
    void delete(String publicId, MediaCategory category);

    /**
     * @param url        URL cong khai de FE tai file ve
     * @param fileName   ten file goc (hien thi cho nguoi dung)
     * @param sizeBytes  dung luong file
     * @param publicId   dinh danh noi bo de xoa/quan ly file sau nay (duong dan tren dia voi Local,
     *                   public_id tren Cloudinary). Co the null neu implementation khong can.
     * @param durationSec thoi luong (giay) - chi co voi AUDIO/VIDEO, Cloudinary tu tra ve; null neu khong xac dinh
     */
    record StoredFile(String url, String fileName, long sizeBytes, String publicId, Integer durationSec) {
        public StoredFile(String url, String fileName, long sizeBytes) {
            this(url, fileName, sizeBytes, null, null);
        }
    }

    enum MediaCategory { IMAGE, AUDIO, VIDEO }
}
