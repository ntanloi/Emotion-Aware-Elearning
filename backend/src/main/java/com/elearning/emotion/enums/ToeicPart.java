package com.elearning.emotion.enums;

public enum ToeicPart {
    PART_1,
    PART_2,
    PART_3,
    PART_4,
    PART_5,
    PART_6,
    PART_7;

    public static ToeicPart fromSectionCode(String sectionCode) {
        if (sectionCode == null) return null;
        String normalized = sectionCode.trim().toUpperCase().replace(" ", "_");
        if (normalized.equals("PART1")) return PART_1;
        if (normalized.equals("PART2")) return PART_2;
        if (normalized.equals("PART3")) return PART_3;
        if (normalized.equals("PART4")) return PART_4;
        if (normalized.equals("PART5")) return PART_5;
        if (normalized.equals("PART6")) return PART_6;
        if (normalized.equals("PART7")) return PART_7;
        try {
            return ToeicPart.valueOf(normalized);
        } catch (Exception e) {
            return null;
        }
    }
}
