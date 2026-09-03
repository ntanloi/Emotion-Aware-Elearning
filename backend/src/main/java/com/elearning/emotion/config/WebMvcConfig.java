package com.elearning.emotion.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

/** Serve file da upload (uploads/) qua URL /uploads/** de frontend tai anh/audio/video ve. */
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final StorageProperties storageProperties;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String absolutePath = Path.of(storageProperties.getUploadDir()).toAbsolutePath().toUri().toString();
        registry.addResourceHandler(storageProperties.getPublicBaseUrl() + "/**")
                .addResourceLocations(absolutePath);
    }
}
