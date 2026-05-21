package com.printflow.users.mapper;

import com.printflow.users.dto.UserResponse;
import com.printflow.users.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "phone", source = "phone")
    @Mapping(target = "createdAt", source = "createdAt")
    UserResponse toResponse(User user);
}
