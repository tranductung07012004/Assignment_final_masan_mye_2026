package com.app.chat.utils;

import com.app.chat.filter.HeaderAuthenticationFilter;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    private final String SECRET_KEY;

    private final long EXPIRATION_ACCESS;

    private final long EXPIRATION_REFRESH;

    private static final Logger logger = LoggerFactory.getLogger(JwtUtil.class);


    public JwtUtil(
            @Value("${jwt.secret}") String secretKey,
            @Value("${jwt.expiration_access}") long expiration_access,
            @Value("${jwt.expiration_refresh}") long expiration_refresh
    ) {
        this.SECRET_KEY = secretKey;
        this.EXPIRATION_ACCESS = expiration_access;
        this.EXPIRATION_REFRESH = expiration_refresh;
    }

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(this.SECRET_KEY.getBytes());
    }

    public String generateAccessToken(String userId) {
        return Jwts.builder()
                .setSubject(userId)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + this.EXPIRATION_ACCESS))
                .signWith(this.getSigningKey())
                .compact();
    }

    public String generateRefreshToken(String userId) {
        return Jwts.builder()
                .setSubject(userId)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + this.EXPIRATION_REFRESH))
                .signWith(this.getSigningKey())
                .compact();
    }

    public String extractUserId(String token) {
        return this.getClaims(token).getSubject();
    }


    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(this.getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(this.getSigningKey())
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            logger.error("Error in validating jwt token {}", e.getMessage());
            return false;
        }
    }
}
