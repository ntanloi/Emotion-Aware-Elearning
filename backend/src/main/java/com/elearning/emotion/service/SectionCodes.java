package com.elearning.emotion.service;

import java.util.Set;

/**
 * BR-17: sidebar co dinh - Tu vung/Ngu phap/Part1..7/Chinh ta (10 ma muc hop le), cong them
 * cac ma CUSTOM_{uuid} do giao vien tu them (xem CourseCustomSection). Dung chung boi
 * ContentGroupService va ContentItemService de xac nhan sectionCode hop le truoc khi tao
 * Nhom/hoat dong truc tiep trong 1 muc sidebar cua khoa hoc.
 */
public final class SectionCodes {

    private static final Set<String> FIXED = Set.of(
            "VOCAB", "GRAMMAR", "PART1", "PART2", "PART3", "PART4", "PART5", "PART6", "PART7", "DICTATION");

    private SectionCodes() {}

    public static boolean isValid(String sectionCode) {
        return FIXED.contains(sectionCode) || (sectionCode != null && sectionCode.startsWith("CUSTOM_"));
    }
}
