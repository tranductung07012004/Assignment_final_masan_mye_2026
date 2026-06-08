package com.app.chat.filter;

import com.app.chat.utils.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.List;
import java.io.IOException;

@Component
public class HeaderAuthenticationFilter extends OncePerRequestFilter {
    private final JwtUtil jwtUtil;

    public HeaderAuthenticationFilter(
          JwtUtil injectedJwtUtil
    ) {
        this.jwtUtil = injectedJwtUtil;
    }

     @Override
     protected void doFilterInternal(HttpServletRequest req,
                                     @NonNull HttpServletResponse res,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
         String authHeader = req.getHeader("Authorization");

         String requestURI = req.getRequestURI();
         if (requestURI.startsWith("/api/auth/login") ||
                 requestURI.startsWith("/api/auth/register") ||
                 requestURI.startsWith("/api/auth/refresh")
         ) {
             filterChain.doFilter(req, res);
             return;
         }
         if (authHeader == null || !authHeader.startsWith("Bearer ")) {
             res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
             res.setContentType("application/json");
             res.getWriter().write("{\"message\":\"Request does not have access token in header\",\"error\":\"ACCESS_TOKEN_NOT_FOUND\"}");
             return;
         }

         String token = authHeader.substring(7);

         if (!jwtUtil.validateToken(token)) {
             res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
             res.setContentType("application/json");
             res.getWriter().write("{\"message\":\"Access token in invalid\",\"error\":\"INVALID_ACCESS_TOKEN\"}");
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
}
