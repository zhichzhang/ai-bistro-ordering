import { randomUUID } from "node:crypto";
import type { GenerationStage, TextGenerationClient } from "./llm.types";

type Gate = {
    id: string;
    stage: GenerationStage;
    state: "armed" | "waiting" | "released" | "expired";
    unblock: (() => void) | null;
    rejectWait: ((reason: Error) => void) | null;
};

/** Local benchmark only. Gates affect the next matching model call, not cart logic. */
export class BenchmarkMockLLMService implements TextGenerationClient {
    private readonly gates = new Map<string, Gate>();
    private readonly waitMs = 30000;

    arm(stage: GenerationStage): string {
        if (this.gates.size >= 100) {
            for (const [key, gate] of this.gates) {
                if (gate.state === "released" || gate.state === "expired") this.gates.delete(key);
            }
        }
        if (this.gates.size >= 100) throw new Error("Too many benchmark gates");
        const id = randomUUID();
        this.gates.set(id, { id, stage, state: "armed", unblock: null, rejectWait: null });
        return id;
    }

    status(id: string): string | null {
        return this.gates.get(id)?.state ?? null;
    }

    release(id: string): boolean {
        const gate = this.gates.get(id);
        if (!gate || (gate.state !== "armed" && gate.state !== "waiting")) return false;
        gate.state = "released";
        gate.unblock?.();
        return true;
    }

    private async block(stage: GenerationStage): Promise<void> {
        const gate = [...this.gates.values()].find(g => g.stage === stage && g.state === "armed");
        if (!gate) return;
        gate.state = "waiting";
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                gate.state = "expired";
                gate.unblock = null;
                gate.rejectWait = null;
                reject(new Error("Benchmark gate timed out"));
            }, this.waitMs);
            gate.unblock = () => { clearTimeout(timeout); gate.unblock = null; resolve(); };
            gate.rejectWait = (e) => { clearTimeout(timeout); reject(e); };
        });
    }

    async generate(prompt: string, stage: GenerationStage): Promise<string> {
        // Keep gate control identical to the already verified AI-vs-checkout harness.
        await this.block(stage);
        // Fixture selection uses the *input* section, not keywords in the template.
        // The normal model provider is unaffected (only LLM_PROVIDER=mock uses this).
        let kind: "add_item" | "clear_cart" = "add_item";
        if (stage === "normalization") {
            const input = prompt.match(/(?:^|\n)USER_MESSAGE:\s*\n([^\n]*)/);
            kind = /^clear (?:the )?cart$/i.test(input?.[1]?.trim() ?? "")
                ? "clear_cart" : "add_item";
        } else {
            const section = prompt.match(/(?:^|\n)NORMALIZED_ACTION:\s*\n([\s\S]*?)\n\s*RETURN JSON IN THIS FORMAT:/);
            if (section) {
                try {
                    const action = JSON.parse(section[1]);
                    kind = action?.type === "clear_cart" ? "clear_cart" : "add_item";
                } catch { /* The existing default add fixture remains available. */ }
            }
        }
        if (stage === "normalization") {
            return JSON.stringify({
                intent: kind, status: "success", confidence: 1,
                actions: [{ index: 0, type: kind,
                    target_text: kind === "clear_cart" ? "" : "Beef Sandwich",
                    quantity: 1, modifiers: {},
                    reference: { type: "none", action_index: null,
                        cart_item_id: null, position: null, text: null },
                    depends_on: [], raw_text: kind === "clear_cart"
                        ? "Clear cart" : "Add one beef sandwich" }],
            });
        }
        return JSON.stringify({
            intent: kind, status: "success", confidence: 1,
            action: { type: kind,
                target_text: kind === "clear_cart" ? "" : "Beef Sandwich",
                menu_item_id: kind === "clear_cart" ? "" : "sandwich_beef",
                name: kind === "clear_cart" ? "" : "Beef Sandwich",
                quantity: 1, modifiers: {},
                reference_resolution: { type: "none", action_index: null,
                    cart_item_id: null, position: null, text: null } },
            question: "", message: "", suggestions: [], error_type: "",
        });
    }
}
