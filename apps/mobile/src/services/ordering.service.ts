// apps/mobile/src/services/ordering.service.ts

import { apiService }
    from "./api.service";

import type {
    OrderingTurnResponse,
} from "../types/ai.types";

export const orderingService = {

    //
    // EXECUTE AI ORDERING TURN
    //

    async sendMessage(
        sessionId: string,
        message: string
    ) {

        return apiService.post<OrderingTurnResponse>(
            `/ordering/sessions/${sessionId}/turn`,
            {
                userMessage: message,
            }
        );
    },
};