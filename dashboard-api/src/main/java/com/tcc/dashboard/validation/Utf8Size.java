package com.tcc.dashboard.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = Utf8SizeValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface Utf8Size {
    String message() default "A senha excede o tamanho máximo permitido.";
    int max();
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
