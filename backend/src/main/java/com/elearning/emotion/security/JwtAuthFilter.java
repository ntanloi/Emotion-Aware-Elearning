package com.elearning.emotion.security;

import com.elearning.emotion.dto.UserAuthInfo;
import com.elearning.emotion.repository.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * B4: Đọc JWT trong header Authorization: Bearer <token>, đối soát tv và status với AuthInfoCache.
 * Nếu tài khoản bị LOCKED hoặc tokenVersion không khớp (đã bị thu hồi), từ chối ngay lập tức.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final AuthInfoCache authInfoCache;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Claims claims = jwtService.parse(header.substring(7));
                String userId = claims.getSubject();
                String role = claims.get("role", String.class);
                int tv = Optional.ofNullable(claims.get("tv", Integer.class)).orElse(0);

                UserAuthInfo info = authInfoCache.get(userId, userRepository::findAuthInfoById);
                if (info == null || "LOCKED".equalsIgnoreCase(info.status()) || info.tokenVersion() != tv) {
                    SecurityContextHolder.clearContext();
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"error\":\"UNAUTHORIZED\",\"message\":\"Phiên đăng nhập đã hết hiệu lực hoặc tài khoản đã bị khóa\"}");
                    return;
                }

                var auth = new UsernamePasswordAuthenticationToken(
                        userId, null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception ex) {
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }
}
