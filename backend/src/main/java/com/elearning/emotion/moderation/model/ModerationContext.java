package com.elearning.emotion.moderation.model;

import com.elearning.emotion.entity.*;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;
import lombok.Getter;

import java.util.*;

@Getter
@Builder
public class ModerationContext {

    private final Course course;
    private final String profile;
    private final JsonNode policy;
    private final int policyVersion;
    private final String contentHash;

    private final List<ContentGroup> groups;
    private final List<ContentItem> items;
    private final List<Question> questions;
    private final List<AnswerOption> options;
    private final List<Passage> passages;
    private final List<VocabSetItem> vocabSetItems;
    private final List<VocabWord> vocabWords;
    private final List<VocabExample> vocabExamples;
    private final Map<String, MediaAsset> mediaMap;

    private final Set<String> openedSections;
    private final Map<String, List<ContentGroup>> groupsBySection;
    private final Map<String, List<ContentItem>> itemsBySection;
    private final Map<String, List<ContentItem>> itemsByGroup;
    private final Map<String, List<Question>> questionsByItem;
    private final Map<String, List<AnswerOption>> optionsByQuestion;
    private final Map<String, List<Passage>> passagesByItem;
    private final Map<String, List<VocabWord>> vocabWordsByItem;
    private final Map<String, List<VocabExample>> examplesByWord;
    private final Map<String, GrammarTopic> grammarTopicMap;

    @Builder.Default
    private Map<String, List<Question>> questionsByPassage = new HashMap<>();
    @Builder.Default
    private Map<String, MediaAsset> audioByPassage = new HashMap<>();
    @Builder.Default
    private Map<String, MediaAsset> imageByQuestion = new HashMap<>();
    @Builder.Default
    private Map<String, MediaAsset> mediaByItem = new HashMap<>();

    public boolean isSectionOpened(String sectionCode) {
        return openedSections != null && openedSections.contains(sectionCode != null ? sectionCode.toUpperCase() : "");
    }

    public List<ContentItem> getSectionItems(String sectionCode) {
        if (itemsBySection == null || sectionCode == null) return Collections.emptyList();
        return itemsBySection.getOrDefault(sectionCode.toUpperCase(), Collections.emptyList());
    }

    public List<ContentGroup> getSectionGroups(String sectionCode) {
        if (groupsBySection == null || sectionCode == null) return Collections.emptyList();
        return groupsBySection.getOrDefault(sectionCode.toUpperCase(), Collections.emptyList());
    }

    public List<ContentItem> getGroupItems(String groupId) {
        if (itemsByGroup == null || groupId == null) return Collections.emptyList();
        return itemsByGroup.getOrDefault(groupId, Collections.emptyList());
    }

    public List<Question> getItemQuestions(String itemId) {
        if (questionsByItem == null || itemId == null) return Collections.emptyList();
        return questionsByItem.getOrDefault(itemId, Collections.emptyList());
    }

    public List<AnswerOption> getQuestionOptions(String questionId) {
        if (optionsByQuestion == null || questionId == null) return Collections.emptyList();
        return optionsByQuestion.getOrDefault(questionId, Collections.emptyList());
    }

    public List<Passage> getItemPassages(String itemId) {
        if (passagesByItem == null || itemId == null) return Collections.emptyList();
        return passagesByItem.getOrDefault(itemId, Collections.emptyList());
    }

    public List<VocabWord> getItemVocabWords(String itemId) {
        if (vocabWordsByItem == null || itemId == null) return Collections.emptyList();
        return vocabWordsByItem.getOrDefault(itemId, Collections.emptyList());
    }

    public MediaAsset getMedia(String mediaId) {
        if (mediaMap == null || mediaId == null) return null;
        return mediaMap.get(mediaId);
    }

    public List<VocabExample> getWordExamples(String wordId) {
        if (examplesByWord == null || wordId == null) return Collections.emptyList();
        return examplesByWord.getOrDefault(wordId, Collections.emptyList());
    }

    public GrammarTopic getGrammarTopic(String code) {
        if (grammarTopicMap == null || code == null) return null;
        return grammarTopicMap.get(code.toUpperCase());
    }

    public Map<String, GrammarTopic> getAllGrammarTopics() {
        return grammarTopicMap != null ? grammarTopicMap : Collections.emptyMap();
    }

    public List<ContentItem> getContentItems() {
        return items != null ? items : Collections.emptyList();
    }

    public List<ContentGroup> getContentGroups() {
        return groups != null ? groups : Collections.emptyList();
    }

    public List<Question> getQuestionsForPassage(String passageId) {
        if (questionsByPassage != null && questionsByPassage.containsKey(passageId)) {
            return questionsByPassage.get(passageId);
        }
        if (questions == null || passageId == null) return Collections.emptyList();
        return questions.stream()
                .filter(q -> q.getPassage() != null && passageId.equals(q.getPassage().getId()))
                .toList();
    }

    public Map<String, List<Question>> getQuestionsByPassage() {
        if (questionsByPassage == null) questionsByPassage = new HashMap<>();
        if (questionsByPassage.isEmpty() && questions != null) {
            for (Question q : questions) {
                if (q.getPassage() != null && q.getPassage().getId() != null) {
                    questionsByPassage.computeIfAbsent(q.getPassage().getId(), k -> new ArrayList<>()).add(q);
                }
            }
        }
        return questionsByPassage;
    }

    public Map<String, MediaAsset> getAudioByPassage() {
        if (audioByPassage == null) audioByPassage = new HashMap<>();
        if (audioByPassage.isEmpty() && passages != null) {
            for (Passage p : passages) {
                if (p.getAudio() != null) {
                    audioByPassage.put(p.getId(), p.getAudio());
                }
            }
        }
        return audioByPassage;
    }

    public Map<String, MediaAsset> getImageByQuestion() {
        if (imageByQuestion == null) imageByQuestion = new HashMap<>();
        if (imageByQuestion.isEmpty() && questions != null) {
            for (Question q : questions) {
                if (q.getImage() != null) {
                    imageByQuestion.put(q.getId(), q.getImage());
                }
            }
        }
        return imageByQuestion;
    }

    public Map<String, MediaAsset> getMediaByItem() {
        if (mediaByItem == null) mediaByItem = new HashMap<>();
        if (mediaByItem.isEmpty() && items != null) {
            for (ContentItem it : items) {
                if (it.getVideo() != null) {
                    mediaByItem.put(it.getId(), it.getVideo());
                }
            }
        }
        return mediaByItem;
    }

    public String getItemSectionCode(String itemId) {
        if (items == null || itemId == null) return null;
        for (ContentItem it : items) {
            if (itemId.equals(it.getId())) {
                return it.getSectionCode();
            }
        }
        return null;
    }

    public static class ModerationContextBuilder {
        public ModerationContextBuilder contentGroups(List<ContentGroup> contentGroups) {
            return groups(contentGroups);
        }

        public ModerationContextBuilder contentItems(List<ContentItem> contentItems) {
            return items(contentItems);
        }
    }
}
