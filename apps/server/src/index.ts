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
if (provider !== "openai" && provider !== "gemini") {
    throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
}
const llm = provider === "openai"
    ? OpenAIService.createFromEnv()
    : GeminiService.createFromEnv();

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

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
