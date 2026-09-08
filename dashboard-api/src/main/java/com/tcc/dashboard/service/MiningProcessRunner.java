package com.tcc.dashboard.service;

import com.tcc.dashboard.exception.BadRequestException;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.FutureTask;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/** Bounds both process execution and log draining by the same deadline. */
final class MiningProcessRunner {
    private MiningProcessRunner() {}

    static void run(ProcessBuilder builder, Duration timeout) throws IOException, InterruptedException {
        long timeoutNanos = timeout.toNanos();
        if (timeoutNanos <= 0) throw new IllegalArgumentException("mining.process.timeout deve ser positivo.");
        builder.redirectErrorStream(true);
        builder.environment().put("PYTHONIOENCODING", "utf-8");
        Process process = builder.start();
        long started = System.nanoTime();
        FutureTask<String> output = new FutureTask<>(() -> {
            String miningError = null;
            try (var reader = new BufferedReader(new InputStreamReader(
                    process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    System.out.println("[PYTHON]: " + line);
                    if (line.startsWith("[MINING_ERROR] ")) {
                        miningError = line.substring("[MINING_ERROR] ".length());
                    }
                }
            }
            return miningError;
        });
        Thread readerThread = new Thread(output, "mining-process-output");
        readerThread.setDaemon(true);
        try {
            readerThread.start();
            process.getOutputStream().close();
            if (!process.waitFor(timeoutNanos, TimeUnit.NANOSECONDS)) throw new TimeoutException();
            String miningError = output.get(Math.max(0, timeoutNanos - (System.nanoTime() - started)),
                    TimeUnit.NANOSECONDS);
            if (process.exitValue() != 0) {
                throw new BadRequestException(miningError != null ? miningError
                        : "Script Python falhou com código de saída: " + process.exitValue());
            }
        } catch (TimeoutException error) {
            throw new BadRequestException("A mineração excedeu o limite de " + timeout.toSeconds()
                    + " segundos e foi interrompida.");
        } catch (ExecutionException error) {
            throw new IOException("Falha ao ler a saída do minerador.", error.getCause());
        } finally {
            // Snapshot before killing Python so Playwright/Chromium are still its descendants.
            var descendants = process.descendants().toList();
            for (int index = descendants.size() - 1; index >= 0; index--) {
                descendants.get(index).destroyForcibly();
            }
            if (process.isAlive()) process.destroyForcibly();
            output.cancel(true);
        }
    }
}
