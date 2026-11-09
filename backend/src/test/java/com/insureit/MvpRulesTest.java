package com.insureit;
import com.insureit.config.OcrRateLimit;
import com.insureit.services.TextInput;
import org.junit.jupiter.api.Test;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;
class MvpRulesTest {
    @Test void textRejectsInvisibleEmojiAndPunctuationOnlyButAcceptsInternationalNames() {
        for (String bad : new String[]{"   ", "😀", "Laptop😀", "\u200b", "---", "line\nnext"})
            assertThrows(RuntimeException.class, () -> TextInput.text(bad, "name", true, 120));
        assertEquals("José Ndlovu", TextInput.text(" José Ndlovu ", "name", true, 120));
        assertNull(TextInput.text(" ", "model", false, 120));
        assertEquals("ABC-12", TextInput.serial(" abc-12 "));
        assertThrows(RuntimeException.class, () -> TextInput.serial("😀"));
    }
    @Test void imageWeightsShareClientAndGlobalLimitsWithoutChargingRejectedRequests() {
        var limit = new OcrRateLimit(10, 15, Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC));
        assertTrue(limit.allow("a", 10)); assertFalse(limit.allow("a", 1));
        assertTrue(limit.allow("b", 5)); assertFalse(limit.allow("c", 1));
        assertFalse(limit.allow("c", 0));
    }
    @Test void windowResets() {
        class MutableClock extends Clock {
            Instant now = Instant.parse("2026-01-01T00:00:00Z");
            public ZoneId getZone() { return ZoneOffset.UTC; }
            public Clock withZone(ZoneId zone) { return this; }
            public Instant instant() { return now; }
        }
        var clock = new MutableClock(); var limit = new OcrRateLimit(1, 1, clock);
        assertTrue(limit.allow("a", 1)); assertFalse(limit.allow("a", 1));
        clock.now = clock.now.plusSeconds(60); assertTrue(limit.allow("a", 1));
    }
}
