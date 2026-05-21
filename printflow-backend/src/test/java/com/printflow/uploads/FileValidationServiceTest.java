package com.printflow.uploads;

import com.printflow.uploads.service.FileValidationService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class FileValidationServiceTest {

    private final FileValidationService service = new FileValidationService();

    @Test
    void shouldAllowValidPdf() {
        assertDoesNotThrow(() -> service.validate("test.pdf", "application/pdf", 1024));
    }

    @Test
    void shouldRejectExe() {
        assertThrows(IllegalArgumentException.class,
            () -> service.validate("virus.exe", "application/x-msdownload", 100));
    }

    @Test
    void shouldRejectTooLargeFile() {
        assertThrows(IllegalArgumentException.class,
            () -> service.validate("large.pdf", "application/pdf", 25 * 1024));
    }

    @Test
    void shouldRejectPathTraversal() {
        assertThrows(IllegalArgumentException.class,
            () -> service.validate("../../etc/passwd.pdf", "application/pdf", 100));
    }
}
