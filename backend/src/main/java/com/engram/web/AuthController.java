package com.engram.web;

import com.engram.model.AppUser;
import com.engram.security.JwtService;
import com.engram.security.SecurityUtils;
import com.engram.service.UserService;
import com.engram.web.dto.AuthResponse;
import com.engram.web.dto.LoginRequest;
import com.engram.web.dto.RegisterRequest;
import com.engram.web.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;

    public AuthController(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        AppUser user = userService.register(request.username(), request.email(), request.password());
        return new AuthResponse(jwtService.generate(user), user.getUsername());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        AppUser user = userService.authenticate(request.username(), request.password());
        return new AuthResponse(jwtService.generate(user), user.getUsername());
    }

    @GetMapping("/me")
    public UserResponse me() {
        AppUser user = userService.require(SecurityUtils.requireUserId());
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getRole());
    }
}
