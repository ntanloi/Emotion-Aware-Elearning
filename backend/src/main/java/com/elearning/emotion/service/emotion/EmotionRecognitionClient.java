package com.elearning.emotion.service.emotion;

import java.util.List;

/**
 * "Hop dong" giua backend va bo nhan dien cam xuc.
 *
 * Day la diem cam (plug point) chinh cho phan AI: hom nay dung MockEmotionRecognitionClient
 * de code va test tron ven he thong, sau nay ban lam AI xong chi can bat profile/cau hinh
 * de dung AiServiceRestClient goi sang ai-service that - KHONG can sua controller, entity,
 * database, hay frontend.
 */
public interface EmotionRecognitionClient {

    /**
     * @param base64Images danh sach anh (base64), toi da app.emotion.batch-size phan tu (BR-04)
     * @return du doan tuong ung theo dung thu tu voi base64Images
     */
    List<EmotionPrediction> predictBatch(List<String> base64Images);
}
