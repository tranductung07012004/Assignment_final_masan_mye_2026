package com.app.chat.config;

import com.app.chat.filter.HeaderAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
// @EnableMethodSecurity(prePostEnabled = true), prePostEnabled = true is default for annotation @EnableMethodSecurity,
// and this method @EnableMethodSecurity is used for authorization, in this project we temporarily do not need authorization
public class SecurityConfig {
    private final HeaderAuthenticationFilter headerAuthenticationFilter;

    public SecurityConfig(
            HeaderAuthenticationFilter injectedHeaderAuthenticationFilter
    ) {
        this.headerAuthenticationFilter = injectedHeaderAuthenticationFilter;
    }
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.cors(cors -> {})
                .csrf(AbstractHttpConfigurer::disable) // normal when using Authorization header with JWT token, because hacker could not add header in the middle (man in the middle attack)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // best practice for Spring
                .authorizeHttpRequests(auth ->
                        auth.requestMatchers(
                                "/api/auth/**",
                                "/ws",
                                "/ws/**"
                        ).permitAll().anyRequest().authenticated()
                ).addFilterBefore(headerAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOriginPatterns(List.of(
                "http://localhost:*",
                "http://127.0.0.1:*"
        ));

        config.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "PATCH",
                "OPTIONS"
        ));

        config.setAllowedHeaders(List.of("*"));

        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();

        src.registerCorsConfiguration("/**", config);

        return src;
    }

}
