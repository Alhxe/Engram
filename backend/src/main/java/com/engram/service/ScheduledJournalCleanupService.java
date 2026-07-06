package com.engram.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** Nightly sweep that trashes journal entries left empty (opened but never
 *  written to), so the journal doesn't accumulate blank days. */
@Service
public class ScheduledJournalCleanupService {

    private static final Logger log = LoggerFactory.getLogger(ScheduledJournalCleanupService.class);

    private final NodeService nodeService;

    public ScheduledJournalCleanupService(NodeService nodeService) {
        this.nodeService = nodeService;
    }

    @Scheduled(cron = "${engram.journal.cleanup-cron:0 15 3 * * *}")
    public void run() {
        try {
            int trashed = nodeService.cleanupEmptyJournalEntries();
            if (trashed > 0) {
                log.info("Trashed {} empty journal entries", trashed);
            }
        } catch (Exception e) {
            log.error("Journal cleanup failed", e);
        }
    }
}
