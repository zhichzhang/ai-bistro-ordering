import express from "express";

import dotenv from "dotenv";

import { createApiRouter } from "./routes";

import { CartService } from "./services/cart.service";
import { ChatService } from "./services/chat.service";
import { GeminiService } from "./services/gemini.service";
import { OpenAIService } from "./services/openai.service";
import { NormalizationService } from "./services/normalization.service";
import { OrderingService } from "./services/ordering.service";
import { ResolutionService } from "./services/resolution.service";
import { BenchmarkMockLLMService } from "./services/benchmark-mock-llm.service";
import { createBenchmarkMockRouter } from "./routes/benchmark-mock.routes";

dotenv.config();

const app = express();

const allowedOrigins = new Set(
    (process.env.CORS_ORIGINS ?? "")
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean)
);

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (process.env.NODE_ENV !== "production" || allowedOrigins.has(origin))) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") {
        res.sendStatus(204);
        return;
    }
    next();
});

app.use(express.json());

const provider = process.env.LLM_PROVIDER ?? "openai";
const benchmarkEnabled = provider === "mock";
if (!["openai", "gemini", "mock"].includes(provider)) {
    throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
}
if (benchmarkEnabled) {
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (process.env.NODE_ENV === "production" ||
        process.env.BENCHMARK_MODE !== "true" ||
        !["127.0.0.1", "localhost"].includes(url.hostname) ||
        url.port !== "5433" || url.pathname !== "/ai_bistro_benchmark" ||
        !process.env.BENCHMARK_TOKEN || process.env.BENCHMARK_TOKEN.length < 16) {
        throw new Error("Mock LLM requires local benchmark DB, BENCHMARK_MODE=true and BENCHMARK_TOKEN");
    }
}
const mockLLM = benchmarkEnabled ? new BenchmarkMockLLMService() : null;
const llm = mockLLM ?? (provider === "gemini"
    ? GeminiService.createFromEnv()
    : OpenAIService.createFromEnv());

/**
 * Shared text generation pipeline used across orchestration stages.
 */
const normalizationService =
    new NormalizationService(llm);

const resolutionService =
    new ResolutionService(llm);

const cartService =
    new CartService();

const chatService =
    new ChatService();

const orderingService =
    new OrderingService(
        normalizationService,
        resolutionService,
        cartService
    );

app.use("/api", createApiRouter({
    cartService,
    chatService,
    orderingService,
}));

if (mockLLM) {
    app.use("/api/__benchmark/mock", createBenchmarkMockRouter(mockLLM));
}

if (benchmarkEnabled) {
    app.listen(3000, "127.0.0.1", () => {
        console.log("Local benchmark server running on 127.0.0.1:3000");
    });
} else {
    app.listen(3000, () => {
        console.log("Server running on port 3000");
    });
}
