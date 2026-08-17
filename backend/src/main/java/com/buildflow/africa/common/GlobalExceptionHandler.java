package com.buildflow.africa.common;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final org.slf4j.Logger LOG =
      org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(NotFoundException.class)
  ResponseEntity<ApiError> notFound(NotFoundException ex, HttpServletRequest request) {
    return error(HttpStatus.NOT_FOUND, ex.getCode(), ex.getMessage(), request);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> validation(MethodArgumentNotValidException ex, HttpServletRequest request) {
    return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Request validation failed.", request);
  }

  @ExceptionHandler(org.springframework.security.authentication.BadCredentialsException.class)
  ResponseEntity<ApiError> badCredentials(org.springframework.security.authentication.BadCredentialsException ex,
                                          HttpServletRequest request) {
    return error(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", ex.getMessage(), request);
  }

  @ExceptionHandler(org.springframework.security.authentication.LockedException.class)
  ResponseEntity<ApiError> locked(org.springframework.security.authentication.LockedException ex,
                                  HttpServletRequest request) {
    return error(HttpStatus.TOO_MANY_REQUESTS, "ACCOUNT_LOCKED", ex.getMessage(), request);
  }

  @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
  ResponseEntity<ApiError> denied(org.springframework.security.access.AccessDeniedException ex,
                                  HttpServletRequest request) {
    return error(HttpStatus.FORBIDDEN, "FORBIDDEN", ex.getMessage(), request);
  }

  @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
  ResponseEntity<ApiError> tooLarge(org.springframework.web.multipart.MaxUploadSizeExceededException ex,
                                    HttpServletRequest request) {
    return error(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "Files must be 25 MB or smaller.", request);
  }

  /** Anything unmapped is logged and answered generically: no stack traces leave the process. */
  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiError> unexpected(Exception ex, HttpServletRequest request) {
    LOG.error("Unhandled error on {} {}", request.getMethod(), request.getRequestURI(), ex);
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
        "Something went wrong on our side. The team has been notified.", request);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  ResponseEntity<ApiError> badRequest(IllegalArgumentException ex, HttpServletRequest request) {
    return error(HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex.getMessage(), request);
  }

  private ResponseEntity<ApiError> error(HttpStatus status, String code, String message, HttpServletRequest request) {
    String traceId = request.getHeader("X-Trace-Id");
    return ResponseEntity.status(status).body(ApiError.of(code, message, traceId));
  }
}

