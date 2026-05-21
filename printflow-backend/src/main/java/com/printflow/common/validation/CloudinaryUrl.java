package com.printflow.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

import java.lang.annotation.*;
import java.util.regex.Pattern;

@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = CloudinaryUrlValidator.class)
@Documented
public @interface CloudinaryUrl {
    String message() default "Must be a valid Cloudinary URL";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

class CloudinaryUrlValidator implements ConstraintValidator<CloudinaryUrl, String> {
    private static final Pattern CLOUDINARY_PATTERN =
        Pattern.compile("^https://res\\.cloudinary\\.com/.*");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) return false;
        return CLOUDINARY_PATTERN.matcher(value).matches();
    }
}
