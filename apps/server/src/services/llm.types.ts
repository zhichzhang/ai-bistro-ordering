export type GenerationStage = "normalization" | "resolution";

export interface TextGenerationClient {
    generate(prompt: string, stage: GenerationStage): Promise<string>;
}
