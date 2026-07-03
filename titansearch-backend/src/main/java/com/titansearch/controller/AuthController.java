package com.titansearch.controller;

import com.titansearch.dto.request.LoginRequest;
import com.titansearch.dto.request.RefreshTokenRequest;
import com.titansearch.dto.request.RegisterRequest;
import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.dto.response.AuthResponse;
import com.titansearch.service.auth.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Registration, login, and token refresh")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Create a new account")
    public ResponseEntity<ApiEnvelope<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiEnvelope.ok(authService.register(request)));
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate and receive access + refresh tokens")
    public ResponseEntity<ApiEnvelope<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiEnvelope.ok(authService.login(request)));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rotate an access token using a valid refresh token")
    public ResponseEntity<ApiEnvelope<AuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(ApiEnvelope.ok(authService.refresh(request.refreshToken())));
    }
}
