package com.printflow.common.security;

import com.printflow.users.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public record UserPrincipal(
    UUID id,
    String email,
    String role,
    UUID shopId,
    Collection<SimpleGrantedAuthority> authorities
) implements UserDetails {

    public static UserPrincipal from(User user, UUID shopId) {
        return new UserPrincipal(
            user.getId(),
            user.getEmail(),
            user.getRole(),
            shopId,
            List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole()))
        );
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public String getPassword() {
        return null;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
