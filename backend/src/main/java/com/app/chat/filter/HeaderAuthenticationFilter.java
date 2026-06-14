package com.app.chat.filter;

import com.app.chat.constants.ErrorCode;
import com.app.chat.dto.ApiResponse;
import com.app.chat.utils.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.List;
import java.util.Map;
import java.io.IOException;

@Component
public class HeaderAuthenticationFilter extends OncePerRequestFilter {
    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper;

    public HeaderAuthenticationFilter(
          JwtUtil injectedJwtUtil,
          ObjectMapper injectedObjectMapper
    ) {
        this.jwtUtil = injectedJwtUtil;
        this.objectMapper = injectedObjectMapper;
    }

     @Override
     protected void doFilterInternal(HttpServletRequest req,
                                     @NonNull HttpServletResponse res,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
         String authHeader = req.getHeader("Authorization");

         String requestURI = req.getRequestURI();
         if (requestURI.startsWith("/api/auth/login") ||
                 requestURI.startsWith("/api/auth/register") ||
                 requestURI.startsWith("/api/auth/refresh") ||
                 requestURI.startsWith("/ws")
         ) {
             filterChain.doFilter(req, res);
             return;
         }
         if (authHeader == null || !authHeader.startsWith("Bearer ")) {
             writeErrorResponse(res, ErrorCode.ACCESS_TOKEN_NOT_FOUND);
             return;
         }

         String token = authHeader.substring(7);

         if (!jwtUtil.validateToken(token)) {
             writeErrorResponse(res, ErrorCode.INVALID_ACCESS_TOKEN);
             return;
         }

         String userId = jwtUtil.extractUserId(token);

         UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                 userId,
                 null,
                 List.of()
         );
         auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));
         SecurityContextHolder.getContext().setAuthentication(auth);

         filterChain.doFilter(req, res);
     }

     private void writeErrorResponse(HttpServletResponse res, ErrorCode errorCode)
             throws IOException {
         res.setStatus(errorCode.getStatus());
         res.setContentType("application/json");
         ApiResponse<Map<String, ErrorCode>> body = new ApiResponse<>(
                 errorCode.getMessage(),
                 Map.of("errorCode", errorCode)
         );
         res.getWriter().write(objectMapper.writeValueAsString(body));
     }
}
