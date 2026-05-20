// // apps/server/src/services/__tests__/ordering.service.test.ts
//
// import {
//     beforeEach,
//     describe,
//     expect,
//     it,
//     vi,
// } from "vitest";
//
// import { OrderingService }
//     from "../ordering.service";
//
// import type {
//     CartExecutionService,
// } from "../cart.service";
//
// import { NormalizationService }
//     from "../normalization.service";
//
// import { ResolutionService }
//     from "../resolution.service";
//
// describe(
//     "OrderingService prompt synthesis",
//     () => {
//
//         let orderingService:
//             OrderingService;
//
//         const normalizationService = {
//             normalizeMessage:
//                 vi.fn(),
//         } as unknown as
//             NormalizationService;
//
//         const resolutionService = {
//             resolveAction:
//                 vi.fn(),
//         } as unknown as
//             ResolutionService;
//
//         const cartExecutionService = {
//             executeResolvedAction:
//                 vi.fn(),
//         } as unknown as
//             CartExecutionService;
//
//         beforeEach(() => {
//
//             vi.clearAllMocks();
//
//             orderingService =
//                 new OrderingService(
//                     normalizationService,
//                     resolutionService,
//                     cartExecutionService
//                 );
//         });
//
//         it(
//             "should print synthesized prompts",
//             async () => {
//
//                 //
//                 // normalization response
//                 //
//
//                 vi.mocked(
//                     normalizationService
//                         .normalizeMessage
//                 ).mockResolvedValue({
//                     intent:
//                         "multi_action",
//
//                     status:
//                         "success",
//
//                     actions: [
//                         {
//                             index: 0,
//
//                             type:
//                                 "add_item",
//
//                             target_text:
//                                 "beef sandwich",
//
//                             quantity: 2,
//
//                             modifiers: {
//                                 spice:
//                                     "spicy",
//                             },
//
//                             reference: {
//                                 type:
//                                     "none",
//                             },
//
//                             depends_on: [],
//
//                             raw_text:
//                                 "Add two spicy beef sandwiches",
//                         },
//
//                         {
//                             index: 1,
//
//                             type:
//                                 "modify_item",
//
//                             target_text:
//                                 "one sandwich",
//
//                             quantity: 1,
//
//                             modifiers: {
//                                 size:
//                                     "double",
//                             },
//
//                             reference: {
//                                 type:
//                                     "previous_action",
//
//                                 action_index:
//                                     0,
//                             },
//
//                             depends_on:
//                                 [0],
//
//                             raw_text:
//                                 "make one double",
//                         },
//                     ],
//
//                     confidence:
//                         0.95,
//                 } as any);
//
//                 //
//                 // resolution response #1
//                 //
//
//                 vi.mocked(
//                     resolutionService
//                         .resolveAction
//                 )
//
//                     .mockResolvedValueOnce({
//                         intent:
//                             "add_item",
//
//                         status:
//                             "success",
//
//                         action: {
//                             type:
//                                 "add_item",
//
//                             target_text:
//                                 "beef sandwich",
//
//                             menu_item_id:
//                                 "sandwich_beef",
//
//                             name:
//                                 "Grilled Beef Sandwich",
//
//                             quantity:
//                                 2,
//
//                             modifiers: {
//                                 spice:
//                                     "spicy",
//                             },
//
//                             reference_resolution:
//                                 {
//                                     type:
//                                         "none",
//                                 },
//                         },
//
//                         confidence:
//                             0.97,
//                     } as any)
//
//                     //
//                     // resolution response #2
//                     //
//
//                     .mockResolvedValueOnce({
//                         intent:
//                             "modify_item",
//
//                         status:
//                             "success",
//
//                         action: {
//                             type:
//                                 "modify_item",
//
//                             target_text:
//                                 "one sandwich",
//
//                             menu_item_id:
//                                 "sandwich_beef",
//
//                             name:
//                                 "Grilled Beef Sandwich",
//
//                             quantity:
//                                 1,
//
//                             modifiers: {
//                                 size:
//                                     "double",
//                             },
//
//                             reference_resolution:
//                                 {
//                                     type:
//                                         "previous_action",
//
//                                     action_index:
//                                         0,
//                                 },
//                         },
//
//                         confidence:
//                             0.94,
//                     } as any);
//
//                 //
//                 // cart execution mock
//                 //
//
//                 vi.mocked(
//                     cartExecutionService
//                         .executeResolvedAction
//                 ).mockResolvedValue();
//
//                 //
//                 // execute orchestration
//                 //
//
//                 const result =
//                     await orderingService
//                         .handleUserMessage({
//                             sessionId:
//                                 "56a15706-863e-4e56-aa7a-0bd239a7932e",
//
//                             userMessage:
//                                 "Add two spicy beef sandwiches and make one double",
//                         });
//
//                 //
//                 // final result
//                 //
//
//                 console.log(
//                     "\n============================"
//                 );
//
//                 console.log(
//                     "FINAL RESULT"
//                 );
//
//                 console.log(
//                     "============================\n"
//                 );
//
//                 console.dir(
//                     result,
//                     {
//                         depth: null,
//                     }
//                 );
//
//                 //
//                 // normalization input
//                 //
//
//                 console.log(
//                     "\n============================"
//                 );
//
//                 console.log(
//                     "NORMALIZATION INPUT"
//                 );
//
//                 console.log(
//                     "============================\n"
//                 );
//
//                 console.dir(
//                     vi.mocked(
//                         normalizationService
//                             .normalizeMessage
//                     ).mock.calls[0][0],
//                     {
//                         depth: null,
//                     }
//                 );
//
//                 //
//                 // resolution input #1
//                 //
//
//                 console.log(
//                     "\n============================"
//                 );
//
//                 console.log(
//                     "RESOLUTION INPUT #1"
//                 );
//
//                 console.log(
//                     "============================\n"
//                 );
//
//                 console.dir(
//                     vi.mocked(
//                         resolutionService
//                             .resolveAction
//                     ).mock.calls[0][0],
//                     {
//                         depth: null,
//                     }
//                 );
//
//                 //
//                 // resolution input #2
//                 //
//
//                 console.log(
//                     "\n============================"
//                 );
//
//                 console.log(
//                     "RESOLUTION INPUT #2"
//                 );
//
//                 console.log(
//                     "============================\n"
//                 );
//
//                 console.dir(
//                     vi.mocked(
//                         resolutionService
//                             .resolveAction
//                     ).mock.calls[1][0],
//                     {
//                         depth: null,
//                     }
//                 );
//
//                 //
//                 // assertions
//                 //
//
//                 expect(
//                     result.normalization
//                         .actions.length
//                 ).toBe(2);
//
//                 expect(
//                     result.resolutions.length
//                 ).toBe(2);
//
//                 expect(
//                     normalizationService
//                         .normalizeMessage
//                 ).toHaveBeenCalledOnce();
//
//                 expect(
//                     resolutionService
//                         .resolveAction
//                 ).toHaveBeenCalledTimes(2);
//
//                 expect(
//                     cartExecutionService
//                         .executeResolvedAction
//                 ).toHaveBeenCalledTimes(2);
//             }
//         );
//     }
// );
