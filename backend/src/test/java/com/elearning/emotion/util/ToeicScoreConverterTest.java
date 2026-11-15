package com.elearning.emotion.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ToeicScoreConverterTest {

    @Test
    @DisplayName("Quy đổi Listening từ 0 đến 100 câu đúng trong phạm vi 5..495")
    void testConvertListening() {
        assertEquals(5, ToeicScoreConverter.convertListening(0));
        assertEquals(5, ToeicScoreConverter.convertListening(-5)); // Ngoai le am
        assertEquals(5, ToeicScoreConverter.convertListening(6));
        assertEquals(10, ToeicScoreConverter.convertListening(7));
        assertEquals(225, ToeicScoreConverter.convertListening(50));
        assertEquals(495, ToeicScoreConverter.convertListening(96));
        assertEquals(495, ToeicScoreConverter.convertListening(100));
        assertEquals(495, ToeicScoreConverter.convertListening(105)); // Ngoai le tren 100
    }

    @Test
    @DisplayName("Quy đổi Reading từ 0 đến 100 câu đúng trong phạm vi 5..495")
    void testConvertReading() {
        assertEquals(5, ToeicScoreConverter.convertReading(0));
        assertEquals(5, ToeicScoreConverter.convertReading(-2));
        assertEquals(5, ToeicScoreConverter.convertReading(9));
        assertEquals(10, ToeicScoreConverter.convertReading(10));
        assertEquals(210, ToeicScoreConverter.convertReading(50));
        assertEquals(495, ToeicScoreConverter.convertReading(100));
        assertEquals(495, ToeicScoreConverter.convertReading(120));
    }

    @Test
    @DisplayName("Quy đổi tổng điểm TOEIC 10..990")
    void testConvertTotal() {
        assertEquals(10, ToeicScoreConverter.convertTotal(0, 0));
        assertEquals(990, ToeicScoreConverter.convertTotal(100, 100));
        assertEquals(435, ToeicScoreConverter.convertTotal(50, 50)); // 225 + 210 = 435
    }
}
