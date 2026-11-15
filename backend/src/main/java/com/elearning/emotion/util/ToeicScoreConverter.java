package com.elearning.emotion.util;

/**
 * Bảng quy đổi điểm TOEIC chuẩn ETS (Listening 5-495, Reading 5-495, Tổng 10-990).
 */
public final class ToeicScoreConverter {

    private ToeicScoreConverter() {}

    // 0..100 câu đúng Listening -> Điểm quy đổi (5..495)
    private static final int[] LISTENING_SCALE = {
            5, 5, 5, 5, 5, 5, 5,                                // 0 - 6
            10, 15, 20, 25, 30, 35, 40, 45, 50,                 // 7 - 15
            55, 60, 65, 70, 75, 80, 85, 90, 95, 100,            // 16 - 25
            110, 115, 120, 125, 130, 135, 140, 145, 150, 160,   // 26 - 35
            165, 170, 175, 180, 185, 190, 195, 200, 210, 215,   // 36 - 45
            220, 230, 240, 245, 250, 255, 260, 270, 275, 280,   // 46 - 55
            290, 295, 300, 310, 315, 320, 325, 330, 340, 345,   // 56 - 65
            350, 360, 365, 370, 380, 385, 390, 395, 400, 405,   // 66 - 75
            410, 415, 420, 425, 430, 435, 440, 445, 450, 455,   // 76 - 85
            465, 470, 475, 480, 485, 490, 495, 495, 495, 495,   // 86 - 95
            495, 495, 495, 495, 495                             // 96 - 100
    };

    // 0..100 câu đúng Reading -> Điểm quy đổi (5..495)
    private static final int[] READING_SCALE = {
            5, 5, 5, 5, 5, 5, 5, 5, 5, 5,                       // 0 - 9
            10, 15, 20, 25, 30, 35, 40, 45, 50, 55,             // 10 - 19
            60, 65, 70, 75, 80, 85, 90, 95, 100, 105,           // 20 - 29
            110, 115, 120, 125, 130, 135, 140, 145, 150, 155,   // 30 - 39
            160, 165, 170, 175, 180, 185, 190, 195, 200, 205,   // 40 - 49
            210, 215, 220, 225, 230, 235, 240, 245, 250, 255,   // 50 - 59
            260, 265, 270, 275, 280, 285, 290, 295, 300, 305,   // 60 - 69
            315, 320, 325, 330, 335, 340, 350, 355, 360, 365,   // 70 - 79
            370, 380, 385, 390, 395, 400, 405, 410, 415, 420,   // 80 - 89
            425, 430, 435, 445, 450, 455, 465, 470, 480, 490,   // 90 - 99
            495                                                 // 100
    };

    public static int convertListening(int rawCorrect) {
        if (rawCorrect <= 0) return 5;
        if (rawCorrect >= 100) return 495;
        return LISTENING_SCALE[rawCorrect];
    }

    public static int convertReading(int rawCorrect) {
        if (rawCorrect <= 0) return 5;
        if (rawCorrect >= 100) return 495;
        return READING_SCALE[rawCorrect];
    }

    public static int convertTotal(int rawListening, int rawReading) {
        return convertListening(rawListening) + convertReading(rawReading);
    }
}
