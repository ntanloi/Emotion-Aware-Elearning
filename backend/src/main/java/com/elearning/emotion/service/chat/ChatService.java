package com.elearning.emotion.service.chat;

import com.elearning.emotion.dto.chat.ChatConversationDto;
import com.elearning.emotion.dto.chat.ChatMessageDto;
import com.elearning.emotion.dto.chat.CreateConversationRequest;
import com.elearning.emotion.dto.chat.SendMessageRequest;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.enums.ToeicPart;
import com.elearning.emotion.repository.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StreamUtils;
import org.springframework.web.server.ResponseStatusException;

import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatConversationRepository conversationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatLlmClient chatLlmClient;
    private final CourseRepository courseRepository;
    private final QuestionRepository questionRepository;
    private final AnswerOptionRepository answerOptionRepository;
    private final AttemptAnswerRepository attemptAnswerRepository;
    private final UserRepository userRepository;

    private String courseAdvicePromptTemplate = "";
    private String questionExplainPromptTemplate = "";

    // Cache danh mục khóa học trong RAM 10 phút để giảm tải DB
    private volatile String cachedCourseCatalog = "";
    private volatile Set<String> cachedCourseIds = Collections.emptySet();
    private volatile long lastCatalogRefreshTime = 0L;
    private static final long CATALOG_CACHE_TTL_MS = 10 * 60 * 1000L;

    private static final Pattern COURSE_LINK_PATTERN = Pattern.compile("\\[\\[course:([a-zA-Z0-9\\-]+)\\]\\]");

    @PostConstruct
    public void initPrompts() {
        courseAdvicePromptTemplate = loadPromptFromClasspath("chat/prompts/course_advice_system.txt");
        questionExplainPromptTemplate = loadPromptFromClasspath("chat/prompts/question_explain_system.txt");
    }

    private String loadPromptFromClasspath(String path) {
        try {
            ClassPathResource resource = new ClassPathResource(path);
            try (InputStream is = resource.getInputStream()) {
                return StreamUtils.copyToString(is, StandardCharsets.UTF_8);
            }
        } catch (Exception ex) {
            log.warn("[ChatService] Không thể đọc file prompt từ classpath: {}. Lỗi: {}", path, ex.getMessage());
            return "";
        }
    }

    @Transactional
    public ChatConversationDto createConversation(String userId, CreateConversationRequest req) {
        String contextType = (req != null && req.getContextType() != null && !req.getContextType().isBlank())
                ? req.getContextType().trim().toUpperCase()
                : "COURSE_ADVICE";

        String contextRefId = (req != null && req.getContextRefId() != null && !req.getContextRefId().isBlank())
                ? req.getContextRefId().trim()
                : null;

        String title = "Tư vấn khóa học";

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin tài khoản"));

        boolean isTeacherOrAdmin = "TEACHER".equalsIgnoreCase(user.getRole()) || "ADMIN".equalsIgnoreCase(user.getRole());

        if ("QUESTION_EXPLAIN".equals(contextType)) {
            if (contextRefId == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu mã câu hỏi (contextRefId) cho loại hội thoại giải thích.");
            }

            // Chống gian lận cho học viên: yêu cầu đã nộp bài làm cho câu này
            if (!isTeacherOrAdmin) {
                List<AttemptAnswer> userAnswers = attemptAnswerRepository.findSubmittedByUserAndQuestion(
                        userId, contextRefId, PageRequest.of(0, 1));
                if (userAnswers.isEmpty()) {
                    log.warn("[ChatService] Học viên {} cố gắng mở hội thoại giải thích câu {} khi chưa nộp bài.", userId, contextRefId);
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn chưa nộp bài làm cho câu hỏi này.");
                }
            }

            Question question = questionRepository.findById(contextRefId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy câu hỏi"));

            String qSnippet = question.getPromptText() != null ? question.getPromptText().trim() : "";
            if (qSnippet.length() > 40) {
                qSnippet = qSnippet.substring(0, 40) + "...";
            }
            title = "Giải thích câu hỏi: " + (qSnippet.isEmpty() ? contextRefId : qSnippet);

        } else if (!"COURSE_ADVICE".equals(contextType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loại hội thoại không hợp lệ: " + contextType);
        }

        ChatConversation conversation = ChatConversation.builder()
                .user(user)
                .contextType(contextType)
                .contextRefId(contextRefId)
                .title(title)
                .startedAt(LocalDateTime.now())
                .build();

        conversation = conversationRepository.save(conversation);

        return ChatConversationDto.builder()
                .id(conversation.getId())
                .contextType(conversation.getContextType())
                .contextRefId(conversation.getContextRefId())
                .title(conversation.getTitle())
                .startedAt(conversation.getStartedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<ChatConversationDto> listConversations(String userId) {
        List<ChatConversation> convs = conversationRepository.findByUserIdOrderByStartedAtDesc(
                userId, PageRequest.of(0, 20));

        return convs.stream().map(c -> ChatConversationDto.builder()
                .id(c.getId())
                .contextType(c.getContextType())
                .contextRefId(c.getContextRefId())
                .title(c.getTitle())
                .startedAt(c.getStartedAt())
                .build()
        ).toList();
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getMessages(String conversationId, String userId) {
        ChatConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hội thoại"));

        if (!conversation.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem hội thoại này");
        }

        List<ChatMessage> messages = chatMessageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        return messages.stream().map(m -> ChatMessageDto.builder()
                .id(m.getId())
                .sender(m.getSender())
                .content(m.getContent())
                .createdAt(m.getCreatedAt())
                .model(m.getModel())
                .promptTokens(m.getPromptTokens())
                .completionTokens(m.getCompletionTokens())
                .build()
        ).toList();
    }

    @Transactional
    public ChatMessageDto sendMessage(String conversationId, String userId, SendMessageRequest req) {
        ChatConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hội thoại"));

        if (!conversation.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền gửi tin nhắn trong hội thoại này");
        }

        // Kiểm tra hạn mức người dùng trong ngày
        long userMsgsToday = chatMessageRepository.countByConversation_User_IdAndSenderAndCreatedAtAfter(
                userId, "USER", LocalDate.now().atStartOfDay());
        if (userMsgsToday >= chatLlmClient.getMaxUserMsgsPerDay()) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Bạn đã đạt giới hạn " + chatLlmClient.getMaxUserMsgsPerDay() + " tin nhắn mỗi ngày.");
        }

        // Kiểm tra tính khả dụng của LLM
        if (!chatLlmClient.isAvailable()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Chatbot đang được nâng cấp, vui lòng quay lại sau.");
        }

        // Lưu tin nhắn người dùng
        ChatMessage userMessage = ChatMessage.builder()
                .conversation(conversation)
                .sender("USER")
                .content(req.getContent().trim())
                .createdAt(LocalDateTime.now())
                .build();
        chatMessageRepository.save(userMessage);

        // Chuẩn bị System Prompt theo ngữ cảnh
        String systemPrompt;
        Set<String> validCourseIds = Collections.emptySet();

        if ("QUESTION_EXPLAIN".equalsIgnoreCase(conversation.getContextType())) {
            systemPrompt = buildQuestionExplainSystemPrompt(conversation.getContextRefId(), userId);
        } else {
            ensureCourseCatalogCached();
            systemPrompt = courseAdvicePromptTemplate.replace("{courses}", cachedCourseCatalog);
            validCourseIds = cachedCourseIds;
        }

        // Lấy 10 tin nhắn gần nhất làm lịch sử hội thoại (gồm cả tin nhắn vừa lưu)
        List<ChatMessage> recentMsgs = chatMessageRepository.findByConversationIdOrderByCreatedAtDesc(
                conversationId, PageRequest.of(0, 10));
        List<ChatMessage> chronologicalMsgs = new ArrayList<>(recentMsgs);
        Collections.reverse(chronologicalMsgs);

        List<Map<String, String>> historyForLlm = new ArrayList<>();
        for (ChatMessage msg : chronologicalMsgs) {
            String role = "USER".equalsIgnoreCase(msg.getSender()) ? "user" : "assistant";
            historyForLlm.add(Map.of("role", role, "content", msg.getContent()));
        }

        // Gọi LLM
        ChatLlmResponse llmResponse = chatLlmClient.callChat(systemPrompt, historyForLlm);
        if (!llmResponse.isSuccess()) {
            log.error("[ChatService] Lỗi từ ChatLlmClient: {}", llmResponse.getErrorMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Dịch vụ AI đang bận hoặc quá tải, vui lòng thử lại sau.");
        }

        String botContent = llmResponse.getContent();
        if ("COURSE_ADVICE".equalsIgnoreCase(conversation.getContextType())) {
            botContent = sanitizeCourseAdviceResponse(botContent, validCourseIds);
        }

        // Lưu tin nhắn BOT
        ChatMessage botMessage = ChatMessage.builder()
                .conversation(conversation)
                .sender("BOT")
                .content(botContent)
                .model(llmResponse.getModel())
                .promptTokens(llmResponse.getPromptTokens())
                .completionTokens(llmResponse.getCompletionTokens())
                .createdAt(LocalDateTime.now())
                .build();
        chatMessageRepository.save(botMessage);

        return ChatMessageDto.builder()
                .id(botMessage.getId())
                .sender(botMessage.getSender())
                .content(botMessage.getContent())
                .createdAt(botMessage.getCreatedAt())
                .model(botMessage.getModel())
                .promptTokens(botMessage.getPromptTokens())
                .completionTokens(botMessage.getCompletionTokens())
                .build();
    }

    private synchronized void ensureCourseCatalogCached() {
        long now = System.currentTimeMillis();
        if (now - lastCatalogRefreshTime < CATALOG_CACHE_TTL_MS && !cachedCourseCatalog.isEmpty()) {
            return;
        }

        try {
            List<Course> courses = courseRepository.findByStatus("PUBLISHED",
                    PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "avgRating")))
                    .stream()
                    .filter(c -> !"EXAM".equalsIgnoreCase(c.getProfile()) && !"BANK".equalsIgnoreCase(c.getProfile()))
                    .limit(30)
                    .toList();

            StringBuilder sb = new StringBuilder();
            Set<String> ids = new HashSet<>();

            for (Course c : courses) {
                ids.add(c.getId());
                String priceStr = (c.getPrice() == null || c.getPrice().compareTo(BigDecimal.ZERO) == 0)
                        ? "Miễn phí"
                        : String.format(Locale.US, "%,.0f VNĐ", c.getPrice());
                String origPriceStr = (c.getOriginalPrice() != null && c.getOriginalPrice().compareTo(BigDecimal.ZERO) > 0)
                        ? String.format(Locale.US, "%,.0f VNĐ", c.getOriginalPrice())
                        : null;
                String priceDisplay = origPriceStr != null ? priceStr + " (Gốc: " + origPriceStr + ")" : priceStr;

                String shortDesc = "";
                if (c.getDescription() != null && !c.getDescription().isBlank()) {
                    String plainDesc = Jsoup.parse(c.getDescription()).text();
                    shortDesc = plainDesc.length() > 200 ? plainDesc.substring(0, 200) + "..." : plainDesc;
                }

                sb.append("- [[course:").append(c.getId()).append("]]: ").append(c.getTitle())
                        .append(" | Trình độ: ").append(c.getLevel() != null ? c.getLevel() : "Tất cả")
                        .append(" | Mục tiêu/Profile: ").append(c.getProfile() != null ? c.getProfile() : "Chung")
                        .append(" | Thời lượng: ").append(c.getDurationHours() != null ? c.getDurationHours() : 0).append("h")
                        .append(" | Giá: ").append(priceDisplay)
                        .append(" | Đánh giá: ").append(c.getAvgRating() != null ? c.getAvgRating() : 0.0).append("★ (")
                        .append(c.getReviewCount() != null ? c.getReviewCount() : 0).append(" đánh giá)")
                        .append(" | Mô tả tóm tắt: ").append(shortDesc)
                        .append("\n");
            }

            cachedCourseCatalog = sb.toString();
            cachedCourseIds = ids;
            lastCatalogRefreshTime = now;
            log.info("[ChatService] Đã cập nhật bộ đệm danh mục khóa học ({} khóa).", courses.size());
        } catch (Exception ex) {
            log.error("[ChatService] Lỗi khi làm mới bộ đệm danh mục khóa học: {}", ex.getMessage());
        }
    }

    private String sanitizeCourseAdviceResponse(String content, Set<String> validIds) {
        if (content == null || content.isBlank()) return "";
        Matcher matcher = COURSE_LINK_PATTERN.matcher(content);
        StringBuilder sb = new StringBuilder();
        while (matcher.find()) {
            String courseId = matcher.group(1);
            if (validIds != null && validIds.contains(courseId)) {
                matcher.appendReplacement(sb, Matcher.quoteReplacement(matcher.group(0)));
            } else {
                matcher.appendReplacement(sb, "");
            }
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private String buildQuestionExplainSystemPrompt(String questionId, String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin tài khoản"));
        boolean isTeacherOrAdmin = "TEACHER".equalsIgnoreCase(user.getRole()) || "ADMIN".equalsIgnoreCase(user.getRole());

        // Chống gian lận cho học viên: Yêu cầu bài làm của câu hỏi này đã được nộp
        List<AttemptAnswer> userAnswers = attemptAnswerRepository.findSubmittedByUserAndQuestion(
                userId, questionId, PageRequest.of(0, 1));
        if (userAnswers.isEmpty() && !isTeacherOrAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn chưa nộp bài làm cho câu hỏi này.");
        }
        AttemptAnswer latestAnswer = userAnswers.isEmpty() ? null : userAnswers.get(0);

        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy câu hỏi"));

        ToeicPart toeicPart = question.getToeicPart();
        String partStr = toeicPart != null ? toeicPart.name() : (question.getContentItem() != null ? question.getContentItem().getSectionCode() : "Không xác định");
        String tag = question.getTag() != null ? question.getTag() : "Không có";
        String prompt = question.getPromptText() != null ? question.getPromptText() : "";

        List<AnswerOption> options = answerOptionRepository.findByQuestionIdOrderByLabelAsc(questionId);
        StringBuilder optSb = new StringBuilder();
        String correctOptionText = "Chưa xác định";
        for (AnswerOption opt : options) {
            optSb.append(opt.getLabel()).append(". ").append(opt.getContent()).append("\n");
            if (Boolean.TRUE.equals(opt.getIsCorrect())) {
                correctOptionText = opt.getLabel() + ". " + opt.getContent();
            }
        }

        String userChoiceText;
        if (latestAnswer != null) {
            if (latestAnswer.getSelectedOption() != null) {
                AnswerOption sel = latestAnswer.getSelectedOption();
                userChoiceText = sel.getLabel() + ". " + sel.getContent() + (Boolean.TRUE.equals(latestAnswer.getIsCorrect()) ? " (Đúng)" : " (Sai)");
            } else if (latestAnswer.getSubmittedText() != null && !latestAnswer.getSubmittedText().isBlank()) {
                userChoiceText = latestAnswer.getSubmittedText() + (Boolean.TRUE.equals(latestAnswer.getIsCorrect()) ? " (Đúng)" : " (Sai)");
            } else {
                userChoiceText = "Chưa chọn đáp án";
            }
        } else {
            userChoiceText = "Chế độ xem trước của " + (user.getRole() != null ? user.getRole() : "Giảng viên");
        }

        String explanation = question.getExplanation() != null ? question.getExplanation() : "Không có";

        String passageText = "Không có";
        if (question.getPassage() != null) {
            Passage p = question.getPassage();
            String raw = p.getTranscriptHtml() != null && !p.getTranscriptHtml().isBlank()
                    ? p.getTranscriptHtml()
                    : p.getPassageHtml();
            if (raw != null && !raw.isBlank()) {
                String clean = Jsoup.parse(raw).text();
                passageText = clean.length() > 1500 ? clean.substring(0, 1500) + "..." : clean;
            }
        }

        StringBuilder contextBuilder = new StringBuilder();
        contextBuilder.append("Part: ").append(partStr).append("\n");
        contextBuilder.append("Chủ đề (tag): ").append(tag).append("\n");
        contextBuilder.append("Câu hỏi: ").append(prompt).append("\n");
        contextBuilder.append("Các lựa chọn:\n").append(optSb);
        contextBuilder.append("ĐÁP ÁN ĐÚNG: ").append(correctOptionText).append("\n");
        contextBuilder.append("Lựa chọn của học viên: ").append(userChoiceText).append("\n");
        contextBuilder.append("Giải thích của giảng viên: ").append(explanation).append("\n");
        contextBuilder.append("Đoạn văn / Transcript:\n").append(passageText).append("\n");

        return questionExplainPromptTemplate.replace("{question_context}", contextBuilder.toString());
    }
}
