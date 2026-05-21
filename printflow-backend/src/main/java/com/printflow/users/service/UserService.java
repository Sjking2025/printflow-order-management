package com.printflow.users.service;

import com.google.firebase.auth.FirebaseToken;
import com.printflow.users.entity.User;
import com.printflow.users.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User findOrCreate(FirebaseToken firebaseToken) {
        return userRepository.findByFirebaseUid(firebaseToken.getUid())
            .orElseGet(() -> {
                User newUser = User.builder()
                    .firebaseUid(firebaseToken.getUid())
                    .name(firebaseToken.getName() != null ? firebaseToken.getName() : "User")
                    .email(firebaseToken.getEmail())
                    .avatarUrl(firebaseToken.getPicture())
                    .build();
                return userRepository.save(newUser);
            });
    }

    public Optional<User> findById(UUID id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByFirebaseUid(String uid) {
        return userRepository.findByFirebaseUid(uid);
    }
}
