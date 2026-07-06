package com.engram.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** Nightly refresh of every GitHub-backed page so stars/README stay current. */
@Service
public class ScheduledGithubSyncService {

    private static final Logger log = LoggerFactory.getLogger(ScheduledGithubSyncService.class);

    private final GithubService githubService;

    public ScheduledGithubSyncService(GithubService githubService) {
        this.githubService = githubService;
    }

    @Scheduled(cron = "${engram.github.sync-cron:0 45 3 * * *}")
    public void run() {
        try {
            int synced = githubService.syncAll();
            if (synced > 0) {
                log.info("Synced {} GitHub repo pages", synced);
            }
        } catch (Exception e) {
            log.error("GitHub sync sweep failed", e);
        }
    }
}
