package com.elearning.emotion.controller;

import com.elearning.emotion.entity.GrammarTopic;
import com.elearning.emotion.service.GrammarTopicService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/grammar-topics")
@RequiredArgsConstructor
public class GrammarTopicController {

    private final GrammarTopicService grammarTopicService;

    @GetMapping
    public ResponseEntity<List<GrammarTopic>> getAllTopics() {
        return ResponseEntity.ok(grammarTopicService.getAllTopics());
    }
}
