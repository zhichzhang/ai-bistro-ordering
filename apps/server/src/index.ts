import express from "express";
import dotenv from "dotenv";
import {GeminiService} from "./services/gemini.service";
import {NormalizationService} from "./services/normalization.service";
import {ResolutionService} from "./services/resolution.service";
import {CartService} from "./services/cart.service";
import {ChatService} from "./services/chat.service";
import {OrderingService} from "./services/ordering.service";
import {createApiRouter} from "./routes";


dotenv.config();

const app = express();

app.use(express.json());

const geminiService = GeminiService.createFromEnv();

const normalizationService = new NormalizationService({
    generate: (prompt) => geminiService.generate(prompt),
});

const resolutionService = new ResolutionService({
    generate: (prompt) => geminiService.generate(prompt),
});
const cartService = new CartService();
const chatService = new ChatService();

const orderingService = new OrderingService(
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