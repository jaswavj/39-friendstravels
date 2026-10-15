package com.billing.users.dto;

import lombok.Data;

import java.util.List;

@Data
public class CreateUserRequest {
    private String fullName;
    private String userName;
    private String password;
    private List<Long> moduleIds;
}
