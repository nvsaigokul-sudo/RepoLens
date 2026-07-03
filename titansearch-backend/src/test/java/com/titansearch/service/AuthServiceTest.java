package com.titansearch.service;

import com.titansearch.dto.request.LoginRequest;
import com.titansearch.dto.request.RegisterRequest;
import com.titansearch.dto.response.AuthResponse;
import com.titansearch.entity.User;
import com.titansearch.exception.DuplicateResourceException;
import com.titansearch.repository.UserRepository;
import com.titansearch.security.JwtService;
import com.titansearch.service.auth.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtService jwtService;

    @InjectMocks AuthService authService;

    @BeforeEach
    void setUp() {
        lenientStubs();
    }

    private void lenientStubs() {
        lenient().when(jwtService.generateAccessToken(anyString(), anyString())).thenReturn("access-token");
        lenient().when(jwtService.generateRefreshToken(anyString())).thenReturn("refresh-token");
        lenient().when(jwtService.accessTokenTtlSeconds()).thenReturn(900L);
    }

    @Test
    void register_createsUser_whenEmailNotTaken() {
        var request = new RegisterRequest("sai@example.com", "password123", "Sai Gokul");
        when(userRepository.existsByEmail(request.email())).thenReturn(false);
        when(passwordEncoder.encode(request.password())).thenReturn("hashed");

        AuthResponse response = authService.register(request);

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_throwsDuplicate_whenEmailAlreadyExists() {
        var request = new RegisterRequest("sai@example.com", "password123", "Sai Gokul");
        when(userRepository.existsByEmail(request.email())).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(DuplicateResourceException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void login_throwsBadCredentials_whenPasswordDoesNotMatch() {
        var request = new LoginRequest("sai@example.com", "wrongpass");
        User existing = User.builder().email(request.email()).passwordHash("hashed").role(User.Role.USER).build();

        when(userRepository.findByEmail(request.email())).thenReturn(Optional.of(existing));
        when(passwordEncoder.matches(request.password(), existing.getPasswordHash())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void login_succeeds_whenCredentialsValid() {
        var request = new LoginRequest("sai@example.com", "password123");
        User existing = User.builder().email(request.email()).passwordHash("hashed").role(User.Role.USER).build();

        when(userRepository.findByEmail(request.email())).thenReturn(Optional.of(existing));
        when(passwordEncoder.matches(request.password(), existing.getPasswordHash())).thenReturn(true);

        AuthResponse response = authService.login(request);

        assertThat(response.tokenType()).isEqualTo("Bearer");
    }
}
