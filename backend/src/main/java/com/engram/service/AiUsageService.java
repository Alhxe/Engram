package com.engram.service;

import com.engram.ai.AiModelCatalog;
import com.engram.ai.AiProviderType;
import com.engram.ai.AiTask;
import com.engram.model.AiUsage;
import com.engram.repository.AiUsageRepository;
import com.engram.web.dto.AiUsageResponse;
import com.engram.web.dto.AiUsageRow;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Records each AI call and reports spend (tokens + estimated cost) per task. */
@Service
public class AiUsageService {

    private final AiUsageRepository repository;

    public AiUsageService(AiUsageRepository repository) {
        this.repository = repository;
    }

    /**
     * Records usage in its own transaction so it commits regardless of the
     * caller's (possibly read-only) transaction.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(UUID userId, AiTask task, AiProviderType provider, String model,
                       int inputTokens, int outputTokens) {
        AiUsage usage = new AiUsage();
        usage.setUserId(userId);
        usage.setTask(task);
        usage.setProvider(provider);
        usage.setModel(model);
        usage.setInputTokens(inputTokens);
        usage.setOutputTokens(outputTokens);
        repository.save(usage);
    }

    @Transactional(readOnly = true)
    public AiUsageResponse usage(UUID userId) {
        Map<AiTask, long[]> counts = new EnumMap<>(AiTask.class); // [calls, in, out]
        Map<AiTask, Double> costs = new EnumMap<>(AiTask.class);

        for (AiUsage usage : repository.findByUserId(userId)) {
            long[] c = counts.computeIfAbsent(usage.getTask(), k -> new long[3]);
            c[0]++;
            c[1] += usage.getInputTokens();
            c[2] += usage.getOutputTokens();
            costs.merge(usage.getTask(), cost(usage), Double::sum);
        }

        List<AiUsageRow> rows = new ArrayList<>();
        long totalIn = 0;
        long totalOut = 0;
        double totalCost = 0;
        for (Map.Entry<AiTask, long[]> entry : counts.entrySet()) {
            long[] c = entry.getValue();
            double cost = costs.getOrDefault(entry.getKey(), 0.0);
            rows.add(new AiUsageRow(entry.getKey(), c[0], c[1], c[2], round(cost)));
            totalIn += c[1];
            totalOut += c[2];
            totalCost += cost;
        }
        return new AiUsageResponse(rows, totalIn, totalOut, round(totalCost));
    }

    private double cost(AiUsage usage) {
        return AiModelCatalog.find(usage.getProvider(), usage.getModel())
                .map(m -> usage.getInputTokens() / 1_000_000.0 * m.inputPricePerMillion()
                        + usage.getOutputTokens() / 1_000_000.0 * m.outputPricePerMillion())
                .orElse(0.0);
    }

    private double round(double value) {
        return Math.round(value * 10_000.0) / 10_000.0;
    }
}
