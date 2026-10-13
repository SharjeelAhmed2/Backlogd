package com.backlogd.api.connection.steam;

import com.backlogd.api.connection.steam.SteamClient.OwnedGame;
import com.backlogd.api.log.LogStatus;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class SteamImportServiceTest {

    @Test
    void statusFollowsPlaytime() {
        assertThat(SteamImportService.statusFor(new OwnedGame(1, "Recent", 600, 30))).isEqualTo(LogStatus.IN_PROGRESS);
        assertThat(SteamImportService.statusFor(new OwnedGame(2, "Old", 600, 0))).isEqualTo(LogStatus.PAUSED);
        assertThat(SteamImportService.statusFor(new OwnedGame(3, "Never", 0, 0))).isEqualTo(LogStatus.PLANNED);
    }

    @Test
    void minutesBecomeHoursWithOneDecimal() {
        assertThat(SteamImportService.hoursFor(new OwnedGame(1, "x", 6745, 0))).isEqualByComparingTo(new BigDecimal("112.4"));
        assertThat(SteamImportService.hoursFor(new OwnedGame(1, "x", 0, 0))).isNull();
    }

    @Test
    void titlesMatchIgnoringCaseSymbolsAndAccents() {
        assertThat(SteamImportService.normalize("ELDEN RING™")).isEqualTo(SteamImportService.normalize("Elden Ring"));
        assertThat(SteamImportService.normalize("Pokémon: Legends")).isEqualTo("pokemonlegends");
    }
}
