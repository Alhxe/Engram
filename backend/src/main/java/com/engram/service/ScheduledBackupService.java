package com.engram.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** Writes a full-vault backup ZIP to disk on a schedule, keeping the latest N. */
@Service
public class ScheduledBackupService {

    private static final Logger log = LoggerFactory.getLogger(ScheduledBackupService.class);

    private final BackupService backupService;
    private final boolean enabled;
    private final String directory;
    private final int keep;

    public ScheduledBackupService(BackupService backupService,
                                  @Value("${engram.backup.enabled:false}") boolean enabled,
                                  @Value("${engram.backup.dir:./data/backups}") String directory,
                                  @Value("${engram.backup.keep:7}") int keep) {
        this.backupService = backupService;
        this.enabled = enabled;
        this.directory = directory;
        this.keep = keep;
    }

    @Scheduled(cron = "${engram.backup.cron:0 0 3 * * *}")
    public void run() {
        if (!enabled) {
            return;
        }
        try {
            Path dir = Path.of(directory);
            Files.createDirectories(dir);
            String name = "engram-backup-" + Instant.now().toString().replace(':', '-') + ".zip";
            Files.write(dir.resolve(name), backupService.export());
            prune(dir);
            log.info("Wrote scheduled backup {}", name);
        } catch (Exception e) {
            log.error("Scheduled backup failed", e);
        }
    }

    private void prune(Path dir) throws IOException {
        try (Stream<Path> files = Files.list(dir)) {
            List<Path> backups = files
                    .filter(p -> p.getFileName().toString().endsWith(".zip"))
                    .sorted(Comparator.comparing((Path p) -> p.getFileName().toString()).reversed())
                    .toList();
            for (int i = keep; i < backups.size(); i++) {
                Files.deleteIfExists(backups.get(i));
            }
        }
    }
}
