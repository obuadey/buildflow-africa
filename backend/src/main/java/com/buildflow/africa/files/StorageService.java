package com.buildflow.africa.files;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Object storage. Files are written under a per-tenant prefix so a key from one company can never
 * resolve inside another. Swap the two methods for an S3/MinIO client without touching callers.
 */
@Service
public class StorageService {

  private static final long MAX_BYTES = 25L * 1024 * 1024;
  private static final java.util.Set<String> ALLOWED = java.util.Set.of(
      "application/pdf", "image/jpeg", "image/png", "image/webp", "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

  private final Path root;

  public StorageService(@Value("${storage.root:/data/uploads}") String root) {
    this.root = Path.of(root);
  }

  public String store(UUID tenantId, MultipartFile file) throws IOException {
    if (file.isEmpty()) {
      throw new IllegalArgumentException("The uploaded file is empty.");
    }
    if (file.getSize() > MAX_BYTES) {
      throw new IllegalArgumentException("Files must be 25 MB or smaller.");
    }
    String contentType = file.getContentType() == null ? "" : file.getContentType();
    if (!ALLOWED.contains(contentType)) {
      throw new IllegalArgumentException("That file type is not accepted: " + contentType);
    }

    String key = tenantId + "/" + UUID.randomUUID() + extension(file.getOriginalFilename());
    Path target = root.resolve(key).normalize();
    if (!target.startsWith(root)) {
      throw new IllegalArgumentException("Invalid storage key.");
    }
    Files.createDirectories(target.getParent());
    try (InputStream in = file.getInputStream()) {
      Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
    }
    return key;
  }

  public Path resolve(UUID tenantId, String key) {
    Path target = root.resolve(key).normalize();
    if (!target.startsWith(root.resolve(tenantId.toString()))) {
      throw new IllegalArgumentException("That file does not belong to this company.");
    }
    return target;
  }

  private String extension(String filename) {
    if (filename == null || !filename.contains(".")) {
      return "";
    }
    String ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    return ext.matches("\\.[a-z0-9]{1,6}") ? ext : "";
  }
}
