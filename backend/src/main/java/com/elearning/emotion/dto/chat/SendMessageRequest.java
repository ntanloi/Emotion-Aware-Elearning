package com.elearning.emotion.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {
    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    @Size(max = 500, message = "Tin nhắn tối đa 500 ký tự")
    private String content;
}
