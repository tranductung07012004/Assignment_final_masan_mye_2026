package com.app.chat.exception;

import com.app.chat.dto.ApiResponse;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationException(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(
                error -> {
                    String fieldName = ((FieldError) error).getField();
                    String errorMessage = error.getDefaultMessage();
                    errors.put(fieldName, errorMessage);
                }
        );

        return ResponseEntity
                .status(400)
                .body(new ApiResponse<>("Validation failed", errors));
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<?> handleNoHandlerFoundException(NoHandlerFoundException ex) {
        return ResponseEntity
                .status(404)
                .body(new ApiResponse<>(
                        "API endpoint not found " + ex.getRequestURL() + ". Please check the path.",
                        null
                ));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<?> handleAccessDeniedException(AccessDeniedException ex) {
        return ResponseEntity
                .status(403)
                .body(new ApiResponse<>("You do not have permission to access this resource", null));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, UnrecognizedPropertyException.class})
    public ResponseEntity<?> handleBadRequestPayload(Exception ex) {
        return ResponseEntity
                .status(400)
                .body(new ApiResponse<>("Invalid request payload: " + ex.getMessage(), null));
    }


    @ExceptionHandler(ApplicationException.class)
    public ResponseEntity<?> handleApplicationException(ApplicationException ex) {
        Map<String, Object> errorData = new HashMap<>();
        errorData.put("errorCode", ex.getErrorCode());
        return ResponseEntity
                .status(400)
                .body(new ApiResponse<>(ex.getMessage(), errorData));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleRuntimeException(RuntimeException ex) {
        return ResponseEntity
                .status(500)
                .body(new ApiResponse<>("Internal server error: " + ex.getMessage(), null));
    }
}
