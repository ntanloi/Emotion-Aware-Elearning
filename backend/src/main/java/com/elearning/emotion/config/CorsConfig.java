package com.elearning.emotion.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // BUGFIX: FRONTEND_URL trong .env co the bi go nham them dau "/" cuoi (vd
        // "http://localhost:5173/"). Header Origin cua trinh duyet KHONG BAO GIO co dau "/"
        // cuoi, trong khi setAllowedOrigins() so khop CHINH XAC tung ky tu -> chi can thua 1
        // dau "/" la moi request bi CorsFilter cua Spring Security tu choi voi 403, truoc ca
        // khi toi duoc security/controller (rat kho nhan ra vi loi 403 trong nhu la loi xac thuc).
        // -> chuan hoa: trim khoang trang va bo dau "/" cuoi cua tung origin truoc khi dang ky.
        List<String> origins = Stream.of(allowedOrigins.split(","))
                .map(String::trim)
                .map(o -> o.endsWith("/") ? o.substring(0, o.length() - 1) : o)
                .collect(Collectors.toList());
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}