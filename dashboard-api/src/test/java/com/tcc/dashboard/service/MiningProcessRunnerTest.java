package com.tcc.dashboard.service;

import com.tcc.dashboard.exception.BadRequestException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.io.TempDir;
import static org.junit.jupiter.api.Assertions.*;

@Timeout(20)
class MiningProcessRunnerTest {
    @TempDir Path temp;

    @Test
    void acceptsSuccessfulExit() {
        assertDoesNotThrow(() -> MiningProcessRunner.run(command("success"), Duration.ofSeconds(10)));
    }

    @Test
    void preservesUtf8MiningError() {
        var error = assertThrows(BadRequestException.class,
                () -> MiningProcessRunner.run(command("error"), Duration.ofSeconds(10)));
        assertEquals("Falha na mineração", error.getMessage());
    }

    @Test
    void timesOutEvenWhenOutputHasNoNewlineAndAllowsNextRun() throws Exception {
        var error = assertThrows(BadRequestException.class,
                () -> MiningProcessRunner.run(command("hang"), Duration.ofMillis(500)));
        assertTrue(error.getMessage().contains("excedeu o limite"));
        MiningProcessRunner.run(command("success"), Duration.ofSeconds(10));
    }

    @Test
    void timeoutKillsDescendantProcess() throws Exception {
        Path pidFile = temp.resolve("child.pid");
        assertThrows(BadRequestException.class, () -> MiningProcessRunner.run(
                command("child", pidFile.toString()), Duration.ofSeconds(4)));
        assertTrue(Files.exists(pidFile), "The helper must have started its child before the timeout");
        assertProcessStops(Long.parseLong(Files.readString(pidFile)));
    }

    @Test
    void interruptionKillsProcessAndPropagatesToCaller() throws Exception {
        Path pidFile = temp.resolve("parent.pid");
        AtomicReference<Throwable> failure = new AtomicReference<>();
        Thread worker = new Thread(() -> {
            try {
                MiningProcessRunner.run(command("pid", pidFile.toString()), Duration.ofSeconds(15));
            } catch (Throwable error) {
                failure.set(error);
            }
        });
        worker.start();
        try {
            long deadline = System.nanoTime() + Duration.ofSeconds(5).toNanos();
            while (!Files.exists(pidFile) && System.nanoTime() < deadline) Thread.sleep(20);
            assertTrue(Files.exists(pidFile));
        } finally {
            worker.interrupt();
            worker.join(5000);
        }
        assertFalse(worker.isAlive());
        assertInstanceOf(InterruptedException.class, failure.get());
        assertProcessStops(Long.parseLong(Files.readString(pidFile)));
    }

    private static void assertProcessStops(long pid) throws Exception {
        var handle = ProcessHandle.of(pid);
        if (handle.isPresent()) handle.get().onExit().get(5, java.util.concurrent.TimeUnit.SECONDS);
        assertFalse(ProcessHandle.of(pid).map(ProcessHandle::isAlive).orElse(false));
    }

    private static ProcessBuilder command(String... args) {
        var command = new java.util.ArrayList<>(java.util.List.of(
                Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-Dfile.encoding=UTF-8", "-cp", System.getProperty("java.class.path"), Helper.class.getName()));
        command.addAll(java.util.List.of(args));
        return new ProcessBuilder(command);
    }

    public static class Helper {
        public static void main(String[] args) throws Exception {
            switch (args[0]) {
                case "success" -> { return; }
                case "error" -> {
                    System.out.write("[MINING_ERROR] Falha na mineração\n".getBytes(java.nio.charset.StandardCharsets.UTF_8));
                    System.exit(1);
                }
                case "child" -> {
                    Process child = command("hang").start();
                    Files.writeString(Path.of(args[1]), Long.toString(child.pid()));
                }
                case "pid" -> Files.writeString(Path.of(args[1]), Long.toString(ProcessHandle.current().pid()));
                default -> { }
            }
            System.out.print("waiting without a newline");
            System.out.flush();
            Thread.sleep(60000);
        }
    }
}
