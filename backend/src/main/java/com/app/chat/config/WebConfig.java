package com.app.chat.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final String mediaRoot;
    private final String urlPrefix;

    public WebConfig(
            @Value("${app.media.root}") String injectedMediaRoot,
            @Value("${app.media.url-prefix}") String injectedUrlPrefix
    ) {
        this.mediaRoot = injectedMediaRoot;
        this.urlPrefix = injectedUrlPrefix.endsWith("/")
                ? injectedUrlPrefix.substring(0, injectedUrlPrefix.length() - 1)
                : injectedUrlPrefix;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Paths.get(mediaRoot).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler(urlPrefix + "/**")
                .addResourceLocations(location);
    }
}
