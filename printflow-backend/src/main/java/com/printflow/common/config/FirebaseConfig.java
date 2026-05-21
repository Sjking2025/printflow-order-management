package com.printflow.common.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${app.firebase.project-id}")
    private String projectId;

    @Value("${app.firebase.service-account-json:#{null}}")
    private String serviceAccountJson;

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        String json = serviceAccountJson;
        if (json == null || json.isBlank()) {
            json = System.getenv("FIREBASE_SERVICE_ACCOUNT_JSON");
        }

        if (json != null && !json.isBlank()) {
            try (InputStream stream = new ByteArrayInputStream(serviceAccountJson.getBytes())) {
                FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(stream))
                    .setProjectId(projectId)
                    .build();
                return FirebaseApp.initializeApp(options);
            }
        }

        log.warn("FIREBASE_SERVICE_ACCOUNT_JSON not set, using Application Default Credentials");
        FirebaseOptions options = FirebaseOptions.builder()
            .setProjectId(projectId)
            .build();
        return FirebaseApp.initializeApp(options);
    }
}
