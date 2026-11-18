package com.insureit.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.util.UUID;
import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "users")
public class User {

    @Id
    // Must match the authentication provider's auth.uid().
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "full_name", nullable = false, columnDefinition = "text")
    private String fullName;

    @Column(name = "email", nullable = false, columnDefinition = "text", unique = true)
    private String email;

    @Column(name = "created_at", nullable = false, columnDefinition = "timestamp with time zone")
    private OffsetDateTime createdAt;
}
