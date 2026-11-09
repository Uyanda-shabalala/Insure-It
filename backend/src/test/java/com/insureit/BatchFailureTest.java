package com.insureit;
import com.insureit.models.SerialNumberResponse;
import com.insureit.services.*;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.concurrent.Executors;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class BatchFailureTest {
    @Test void failedImageDoesNotDiscardOtherImagesAndOrderIsPreserved() throws Exception {
        OcrService ocr = mock(OcrService.class);
        when(ocr.extract("a")).thenReturn(new SerialNumberResponse("A", SerialNumberResponse.Status.FOUND));
        when(ocr.extract("b")).thenThrow(new IllegalStateException("private provider detail"));
        when(ocr.extract("c")).thenReturn(new SerialNumberResponse("C", SerialNumberResponse.Status.FOUND));
        var executor = Executors.newFixedThreadPool(2);
        try {
            var results = new BatchOCRService(ocr, executor).processBatch(List.of("a", "b", "c")).results();
            assertEquals("A", results.get(0).serialNumber());
            assertEquals(SerialNumberResponse.Status.FAILED, results.get(1).status());
            assertNull(results.get(1).serialNumber());
            assertEquals("C", results.get(2).serialNumber());
        } finally { executor.shutdownNow(); }
    }
}
