package com.elearning.emotion.service.report;

import com.elearning.emotion.entity.LearningSession;
import com.elearning.emotion.repository.*;
import com.elearning.emotion.service.chat.ChatLlmClient;
import com.elearning.emotion.service.chat.ChatLlmResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Sinh "Lời khuyên sư phạm cá nhân hóa" cho Báo cáo ngày.
 *
 * Nguyên tắc: Java tính TOÀN BỘ số liệu (không để LLM tự tính/bịa), LLM chỉ diễn giải thành lời khuyên
 * và CHỌN bài tiếp theo trong danh sách ứng viên do hệ thống cung cấp. Nếu LLM tắt / lỗi / trả sai
 * định dạng -> tự rơi về lời khuyên theo luật (rule-based) nhưng vẫn dùng dữ liệu thật, và gắn source = RULE.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DailyAdviceService {

    private final ChatLlmClient llm;
    private final ObjectMapper objectMapper;
    private final LearningSessionRepository learningSessionRepository;
    private final AttemptAnswerRepository attemptAnswerRepository;
    private final LearningPlanRepository learningPlanRepository;
    private final ReportCalculationService calc;
    private final StudentReportService studentReportService; // chỉ dùng getSectionFriendlyName

    // ====== Dữ liệu đầu vào do DailyReportGeneratorService đã tính sẵn ======
    public record LessonFact(String title, String section, int minutes, Double focus, Double confusedPct, Double boredPct) {}
    public record TodayFacts(LocalDate date, boolean hasActivity, int studyMinutes, int sessions, int attempts,
                             Double avgFocus, Double avgPracticeScore, double confusedPct, double boredPct,
                             List<LessonFact> lessons) {}

    // ====== Kết quả ======
    public record PlanItem(String itemId, String title, String section, String sectionCode,
                           String courseId, String courseTitle, String groupTitle, String reason) {}
    public record Advice(String summaryExtra, String text, List<PlanItem> plan, String source) {}

    private record Candidate(String itemId, String title, String section, String sectionName, String group,
                             String courseId, String course) {}

    public boolean isLlmAvailable() { return llm.isAvailable(); }

    public Advice build(String userId, TodayFacts today) {
        LocalDate date = today.date();

        // 1) Ngữ cảnh 7 ngày trước đó (không gồm hôm nay) -> để so sánh xu hướng tập trung
        Double avgFocus7 = null;
        long activeDays7 = 0;
        LocalDate lastActiveDay = null;
        List<LearningSession> past = learningSessionRepository.findByUserIdAndStartTimeBetweenOrderByStartTimeDesc(
                userId, calc.getStartOfDayUtc(date.minusDays(30)), calc.getStartOfDayUtc(date)); // < đầu ngày hôm nay
        if (!past.isEmpty()) {
            lastActiveDay = calc.toVnLocalDate(past.get(0).getStartTime());
            LocalDate from7 = date.minusDays(7);
            List<Float> f7 = new ArrayList<>();
            Set<LocalDate> days7 = new HashSet<>();
            for (LearningSession s : past) {
                LocalDate d = calc.toVnLocalDate(s.getStartTime());
                if (!d.isBefore(from7)) {
                    days7.add(d);
                    if (s.getFocusScore() != null) f7.add(s.getFocusScore());
                }
            }
            activeDays7 = days7.size();
            if (!f7.isEmpty()) {
                avgFocus7 = Math.round(f7.stream().mapToDouble(Float::doubleValue).average().orElse(0) * 10.0) / 10.0;
            }
        }
        long daysSinceLast = lastActiveDay == null ? -1 : ChronoUnit.DAYS.between(lastActiveDay, date);

        // 2) Điểm yếu 30 ngày gần nhất: theo Part + theo tag (chủ điểm)
        LocalDateTime from30 = calc.getStartOfDayUtc(date.minusDays(29));
        LocalDateTime to = calc.getEndOfDayUtc(date);
        List<Map<String, Object>> weakSections = new ArrayList<>();
        for (var p : attemptAnswerRepository.getPartAccuracy(userId, null, from30, to)) {
            long total = p.getTotalQuestions() == null ? 0 : p.getTotalQuestions();
            long ok = p.getCorrectCount() == null ? 0 : p.getCorrectCount();
            if (total < 5) continue; // quá ít dữ liệu thì không kết luận
            double rate = Math.round(ok * 1000.0 / total) / 10.0;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("code", p.getSectionCode());
            m.put("name", studentReportService.getSectionFriendlyName(p.getSectionCode()));
            m.put("accuracyPct", rate);
            m.put("questions", total);
            weakSections.add(m);
        }
        weakSections.sort(Comparator.comparingDouble(m -> (double) m.get("accuracyPct")));
        List<Map<String, Object>> weakTags = new ArrayList<>();
        for (var t : attemptAnswerRepository.getTagAccuracy(userId, null, from30, to)) {
            long total = t.getTotalQuestions() == null ? 0 : t.getTotalQuestions();
            long ok = t.getCorrectCount() == null ? 0 : t.getCorrectCount();
            if (total < 4) continue;
            double rate = Math.round(ok * 1000.0 / total) / 10.0;
            if (rate >= 70) continue;
            weakTags.add(Map.of("tag", t.getTag(), "accuracyPct", rate, "questions", total));
            if (weakTags.size() >= 3) break; // query đã ORDER BY tỉ lệ đúng tăng dần
        }
        if (weakSections.size() > 3) weakSections = new ArrayList<>(weakSections.subList(0, 3));

        // 3) Ứng viên "bài nên học tiếp": ưu tiên mục yếu nhất, rồi tới bài kế tiếp theo thứ tự khoá học
        Set<String> weakCodes = new LinkedHashSet<>();
        for (var m : weakSections) if ((double) m.get("accuracyPct") < 75) weakCodes.add((String) m.get("code"));
        List<Candidate> all = new ArrayList<>();
        for (var n : learningPlanRepository.findNextUncompletedItems(userId, 60)) {
            all.add(new Candidate(n.getItemId(), n.getTitle(), n.getSectionCode(),
                    studentReportService.getSectionFriendlyName(n.getSectionCode()), n.getGroupTitle(),
                    n.getCourseId(), n.getCourseTitle()));
        }
        List<Candidate> candidates = new ArrayList<>();
        for (String code : weakCodes) {
            all.stream().filter(c -> code.equalsIgnoreCase(c.section())).limit(2).forEach(candidates::add);
        }
        for (Candidate c : all) {
            if (candidates.size() >= 8) break;
            if (!candidates.contains(c)) candidates.add(c);
        }
        if (candidates.size() > 8) candidates = new ArrayList<>(candidates.subList(0, 8));

        // 4) Gói context
        Map<String, Object> ctx = new LinkedHashMap<>();
        ctx.put("ngay", date.toString());
        ctx.put("homNay", Map.of(
                "coHoatDong", today.hasActivity(),
                "phutHocVideo", today.studyMinutes(),
                "soBuoiVideo", today.sessions(),
                "soBaiLuyenTap", today.attempts(),
                "diemTapTrungTB", today.avgFocus() == null ? "khong-co-du-lieu" : today.avgFocus(),
                "diemLuyenTapTB", today.avgPracticeScore() == null ? "khong-co" : today.avgPracticeScore(),
                "boiRoiPct", today.confusedPct(),
                "chanPhanTamPct", today.boredPct(),
                "cacBaiDaHoc", today.lessons()));
        ctx.put("tapTrungTB7NgayTruoc", avgFocus7 == null ? "khong-co-du-lieu" : avgFocus7);
        ctx.put("soNgayCoHocTrong7NgayTruoc", activeDays7);
        ctx.put("soNgayTuLanHocGanNhat", daysSinceLast < 0 ? "chua-tung-hoc-video" : daysSinceLast);
        ctx.put("mucYeu30Ngay", weakSections);
        ctx.put("chuDiemYeu30Ngay", weakTags);
        List<Map<String, Object>> candCtx = new ArrayList<>();
        for (Candidate c : candidates) {
            candCtx.add(Map.of("itemId", c.itemId(), "tenBai", c.title(), "muc", c.sectionName(),
                    "nhom", c.group() == null ? "" : c.group(), "khoaHoc", c.course()));
        }
        ctx.put("baiUngVien", candCtx);

        // 5) Gọi LLM; lỗi -> fallback
        if (llm.isAvailable()) {
            try {
                String json = objectMapper.writeValueAsString(ctx);
                ChatLlmResponse res = llm.callChat(SYSTEM_PROMPT,
                        List.of(Map.of("role", "user", "content", "Dữ liệu học viên (JSON):\n" + json)));
                if (res.isSuccess() && res.getContent() != null) {
                    Advice a = parse(res.getContent(), candidates);
                    if (a != null) return a;
                    log.warn("[DailyAdvice] LLM trả về định dạng không hợp lệ, dùng lời khuyên theo luật");
                } else {
                    log.warn("[DailyAdvice] LLM lỗi: {}", res.getErrorMessage());
                }
            } catch (Exception e) {
                log.warn("[DailyAdvice] Lỗi gọi LLM: {}", e.getMessage());
            }
        }
        return ruleBased(today, avgFocus7, daysSinceLast, weakSections, weakTags, candidates);
    }

    // ===================== LLM =====================
    private static final String SYSTEM_PROMPT = """
        Bạn là cố vấn học tập TOEIC cho một học viên trên nền tảng e-learning có nhận diện cảm xúc/tập trung qua camera.
        Bạn nhận một JSON số liệu THẬT đã được hệ thống tính sẵn. Hãy viết lời khuyên bằng tiếng Việt, xưng "bạn", giọng
        thân thiện, cụ thể, không sáo rỗng.

        QUY TẮC BẮT BUỘC
        1. Chỉ dùng số liệu và tên bài có trong JSON. Tuyệt đối không bịa số, không bịa tên bài/khoá học/chủ điểm.
        2. Chọn tối đa 3 bài để học tiếp, CHỈ từ "baiUngVien" (dùng đúng itemId). Ưu tiên bài thuộc "mucYeu30Ngay"
           hoặc "chuDiemYeu30Ngay". Nếu "baiUngVien" rỗng thì plan = [] và khuyên chung dựa trên điểm yếu.
        3. Nếu homNay.coHoatDong = false: nói thẳng hôm nay chưa học; nếu soNgayTuLanHocGanNhat >= 2 thì nhắc nhẹ việc
           bị gián đoạn (không trách móc); đề xuất lộ trình ngắn khoảng 20-40 phút gồm các bài đã chọn, nêu rõ làm gì trước.
        4. Nếu có học: so sánh diemTapTrungTB hôm nay với tapTrungTB7NgayTruoc.
           - Thấp hơn từ 10 điểm trở lên: nói rõ giảm bao nhiêu, chỉ ra bài trong "cacBaiDaHoc" có chanPhanTamPct hoặc
             boiRoiPct cao nhất, gợi ý cách xử lý (chia buổi 15-20 phút, xem lại đoạn khó, đổi sang bài luyện tập nhẹ hơn
             khi mất tập trung). Các bài khuyên học tiếp nên nhẹ/ngắn hơn bài vừa gây mệt.
           - Bối rối cao (boiRoiPct >= 25): gợi ý xem lại lý thuyết của bài đó trước khi làm bài mới.
           - Tập trung tốt: ghi nhận ngắn gọn rồi đẩy tiến độ sang bài mới/mục yếu.
        5. Nếu thiếu dữ liệu (giá trị "khong-co-du-lieu") thì nói rõ chưa đủ dữ liệu, đừng suy diễn.
        6. Không chẩn đoán y tế/tâm lý. Không dùng emoji. "advice" tối đa 5 câu, không gạch đầu dòng.

        CHỈ TRẢ VỀ JSON thuần (không markdown, không giải thích ngoài JSON) theo đúng dạng:
        {"summaryExtra":"1 câu nhận xét về xu hướng so với 7 ngày trước, hoặc chuỗi rỗng",
         "advice":"đoạn lời khuyên",
         "plan":[{"itemId":"...","reason":"vì sao nên học bài này hôm nay, 1 câu, dẫn số liệu"}]}
        """;

    private Advice parse(String raw, List<Candidate> candidates) throws Exception {
        String s = raw.trim();
        if (s.startsWith("```")) {
            s = s.replaceFirst("^```[a-zA-Z]*\\s*", "").replaceFirst("```\\s*$", "").trim();
        }
        int a = s.indexOf('{'), b = s.lastIndexOf('}');
        if (a < 0 || b <= a) return null;
        JsonNode root = objectMapper.readTree(s.substring(a, b + 1));
        String advice = root.path("advice").asText("").trim();
        if (advice.length() < 20) return null;

        Map<String, Candidate> byId = new HashMap<>();
        candidates.forEach(c -> byId.put(c.itemId(), c));
        List<PlanItem> plan = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (JsonNode n : root.path("plan")) {
            Candidate c = byId.get(n.path("itemId").asText(""));
            if (c == null || !seen.add(c.itemId())) continue; // loại id LLM tự bịa
            plan.add(new PlanItem(c.itemId(), c.title(), c.sectionName(), c.section(), c.courseId(), c.course(), c.group(),
                    n.path("reason").asText("").trim()));
            if (plan.size() >= 3) break;
        }
        return new Advice(root.path("summaryExtra").asText("").trim(), advice, plan, "AI");
    }

    // ===================== Fallback theo luật (vẫn dùng số liệu thật) =====================
    private Advice ruleBased(TodayFacts t, Double avgFocus7, long daysSinceLast,
                             List<Map<String, Object>> weakSections, List<Map<String, Object>> weakTags,
                             List<Candidate> candidates) {
        StringBuilder sb = new StringBuilder();
        String extra = "";
        if (!t.hasActivity()) {
            sb.append("Hôm nay bạn chưa học buổi nào. ");
            if (daysSinceLast >= 2) sb.append("Bạn đã nghỉ ").append(daysSinceLast).append(" ngày, hãy quay lại bằng một buổi ngắn 20-30 phút để lấy lại nhịp. ");
        } else if (t.avgFocus() != null && avgFocus7 != null && avgFocus7 - t.avgFocus() >= 10) {
            extra = "Tập trung hôm nay thấp hơn trung bình 7 ngày trước " + Math.round((avgFocus7 - t.avgFocus()) * 10) / 10.0 + " điểm.";
            sb.append("Mức tập trung hôm nay (").append(t.avgFocus()).append("%) thấp hơn trung bình 7 ngày trước (")
              .append(avgFocus7).append("%). ");
            t.lessons().stream().filter(l -> l.boredPct() != null)
                    .max(Comparator.comparingDouble(LessonFact::boredPct))
                    .ifPresent(l -> sb.append("Bài \"").append(l.title()).append("\" có tỉ lệ chán/phân tâm cao nhất; hãy chia nhỏ thành các đoạn 15-20 phút. "));
        } else if (t.avgFocus() != null) {
            sb.append("Bạn duy trì tập trung ").append(t.avgFocus()).append("% hôm nay. ");
        } else if (t.sessions() > 0) {
            sb.append("Hãy bật camera khi học video để hệ thống đánh giá mức tập trung của bạn. ");
        }
        if (t.confusedPct() >= 25) sb.append("Tỉ lệ bối rối khá cao, hãy xem lại phần lý thuyết bài vừa học trước khi sang bài mới. ");
        if (!weakSections.isEmpty() && (double) weakSections.get(0).get("accuracyPct") < 75) {
            sb.append("Mục cần củng cố nhất 30 ngày qua là ").append(weakSections.get(0).get("name"))
              .append(" (đúng ").append(weakSections.get(0).get("accuracyPct")).append("%). ");
        }
        if (!weakTags.isEmpty()) sb.append("Chủ điểm hay sai: ").append(weakTags.get(0).get("tag")).append(". ");

        List<PlanItem> plan = new ArrayList<>();
        for (Candidate c : candidates) {
            plan.add(new PlanItem(c.itemId(), c.title(), c.sectionName(), c.section(), c.courseId(), c.course(), c.group(),
                    weakCodesContains(weakSections, c.section()) ? "Mục bạn đang làm chưa tốt trong 30 ngày qua" : "Bài kế tiếp trong lộ trình chưa hoàn thành"));
            if (plan.size() >= 3) break;
        }
        if (sb.length() == 0) sb.append("Hãy tiếp tục theo lộ trình và làm thêm bài luyện tập để có thêm dữ liệu cho gợi ý chính xác hơn.");
        return new Advice(extra, sb.toString().trim(), plan, "RULE");
    }

    private boolean weakCodesContains(List<Map<String, Object>> weak, String code) {
        return weak.stream().anyMatch(m -> m.get("code").toString().equalsIgnoreCase(code) && (double) m.get("accuracyPct") < 75);
    }
}