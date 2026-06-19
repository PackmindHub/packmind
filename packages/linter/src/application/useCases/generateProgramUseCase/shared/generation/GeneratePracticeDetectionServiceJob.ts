// import {IRepositories} from "../../domain/repository/IRepositories";
// import {IPracticeDetectionToolingRepository} from "../../domain/repository/detection/IPracticeDetectionToolingRepository";
// import AIProvider from "../../domain/AIProvider";
// import {buildAIProvider} from "../../infra/ai/AIFactory";
// import {GenerateRuleDetection} from "./GenerateRuleDetection";
// import DetectionToolingLogWriter from "./log/DetectionToolingLogWriter";
// import { PackmindLanguage, PracticeDetectionTooling } from '../../domain/PracticeDetectionTooling';
// import {logger} from "../../utils/Logger";
// import RepositoriesFactory from "../../infra/RepositoriesFactory";
// import {Practice} from "../../domain/Practice";
// import {PackmindUser} from "../../domain/PackmindUser";
// import IAiAgentInternalEventEmitter from "../../domain/IAiAgentInternalEventEmitter";
// import InternalEventEmitterFactory from "../../infra/InternalEventEmitterFactory";
// import {PackmindTimeoutError} from "../../domain/Error";
// import PracticeDiagnosis from "./diagnosis/PracticeDiagnosis";
// import {AIConfig} from "../../domain/AIConfig";
// import { getLanguage, isPackmindLanguage } from './ToolingLanguageUtils';
//
// export async function generateToolingInBackground(taskId: string, practice: Practice, ai: AIConfig, user: PackmindUser, signal: AbortSignal): Promise<void> {
//     //this is awful since our infra layer is called here,  but I don't know how to fix it
//     const repositories: IRepositories = RepositoriesFactory.buildRepositories();
//     const aiAgentEventEmitter: IAiAgentInternalEventEmitter = InternalEventEmitterFactory.buildEventEmitter();
//     const practiceDetectionRepository: IPracticeDetectionToolingRepository = repositories.getPracticeDetectionToolingRepository();
//
//     if (!practice) throw new Error("Practice is missing");
//     if (!ai) throw new Error("AI is missing");
//     if (!practiceDetectionRepository) throw new Error("practiceDetectRepository is missing");
//     if (!user) throw new Error("User is missing");
//
//     if (signal.aborted) {
//         throw new Error("Timeout");
//     }
//
//     //We need to wait 2 seconds to ensure the "IN_QUEUE" has been stored
//     await new Promise((resolve) => setTimeout(resolve, 2000));
//
//     const tooling = await upsertToolingStatusToPending(taskId, practice, practiceDetectionRepository);
//
//     //dirty but no other option
//     const aiProvider: AIProvider = buildAIProvider(ai);
//     const practiceDetection = new GenerateRuleDetection(taskId, practice, aiProvider, new DetectionToolingLogWriter(practiceDetectionRepository, tooling._id));
//
//     if (signal.aborted) {
//         logger.warn(`Aborted signal due to timeout receive for job ${taskId}`);
//         practiceDetection.setAborted();
//     }
//
//     signal.addEventListener('abort', () => {
//         logger.warn(`Operation aborted for job ${taskId}`);
//         practiceDetection.setAborted();
//     });
//
//     const MAX_RETRY = 3;
//     let retry = 1;
//     while (retry < MAX_RETRY) {
//         if (signal.aborted) {
//             logger.info(`[${practice.id}] Job aborted, exiting`);
//             return;
//         }
//         try {
//             logger.info(`[${practice.id}}] Generation of tooling started ${retry}/${MAX_RETRY}`);
//             await generationDetection(practiceDetection, user, practice, aiAgentEventEmitter, tooling, practiceDetectionRepository);
//             return;
//         } catch (error) {
//             if (error instanceof PackmindTimeoutError) {
//                 logger.error(`[${practice.id}] Timeout error during generation of tooling`);
//                 return;
//             }
//             logger.error(`[${practice.id}] Error during generation of tooling, retry ${retry + 1}/${MAX_RETRY}`);
//             retry++;
//             if (retry === MAX_RETRY) {
//                 return;
//             }
//         }
//     }
// }
//
// async function generationDetection(practiceDetection: GenerateRuleDetection,
//                                    user: PackmindUser,
//                                    practice: Practice,
//                                    aiAgentEventEmitter: IAiAgentInternalEventEmitter,
//                                    tooling: PracticeDetectionTooling,
//                                    practiceDetectionRepository: IPracticeDetectionToolingRepository) {
//     const generatedDetection = await practiceDetection.assessDetectionPractice();
//     const tokens = practiceDetection.assessTokensUsage();
//
//     //Extract below in method
//     const result: PracticeDetectionTooling = {
//         ...generatedDetection,
//         tokens,
//     };
//
//     //If tooling is cancelled, do not update it, we do nothing, otherwise, we do it like below
//     logger.info(`[${practice.id}] Update tooling in database`);
//     const lastToolingVersion = await practiceDetectionRepository.getToolingForPractice(tooling.practiceId.toString());
//     if (!lastToolingVersion) {
//         logger.info(`[${practice.id}] A more recent tooling has been generated, current one has been removed.`);
//         return;
//     }
//     if (lastToolingVersion._id.toString() !== tooling._id.toString()) {
//         logger.info(`[${practice.id}] A more recent tooling has been generated, no update of tooling`);
//         return;
//     }
//     if (lastToolingVersion.status === 'CANCELLED') {
//         logger.info(`[${practice.id}] Job has been cancelled, no update of tooling`);
//         return;
//     }
//     logger.info(`[${practice.id}] Delete existing tooling and insert new one`);
//     await practiceDetectionRepository.deleteToolingsForPractice(practice.id);
//     await practiceDetectionRepository.insertTooling(result);
// }
//
// async function upsertToolingStatusToPending(taskId: string, practice: Practice, practiceDetectionRepository: IPracticeDetectionToolingRepository): Promise<PracticeDetectionTooling> {
//     const tooling = await practiceDetectionRepository.getToolingForPractice(practice.id);
//     if(tooling && tooling.taskId === taskId) {
//         return await updateToolingStatusToPending(practice, practiceDetectionRepository);
//     }
//
//     return await initTooling(taskId, practice, practiceDetectionRepository);
// }
//
// async function initTooling(taskId: string, practice: Practice, practiceDetectionRepository: IPracticeDetectionToolingRepository): Promise<PracticeDetectionTooling> {
//     logger.info(`[${practice.id}] Init tooling for practice`);
//     const result: PracticeDetectionTooling = {
//         taskId,
//         practiceId: practice.id,
//         status: 'PENDING',
//         language: isPackmindLanguage(practice.language) ? practice.language as PackmindLanguage : getLanguage(practice.language),
//         sourceCodeState: 'NONE',
//     };
//     await practiceDetectionRepository.deleteToolingsForPractice(practice.id);
//     await practiceDetectionRepository.insertTooling(result);
//     const tooling = await practiceDetectionRepository.getToolingForPractice(practice.id);
//     return tooling;
// }
//
// async function updateToolingStatusToPending(practice: Practice, practiceDetectionRepository: IPracticeDetectionToolingRepository): Promise<PracticeDetectionTooling> {
//     logger.info(`[${practice.id}] Update tooling status to PENDING`);
//     const toolingToUpdate = await practiceDetectionRepository.getToolingForPractice(practice.id);
//     if(!toolingToUpdate) {
//         logger.error(`[${practice.id}] No tooling found to update for practice ${practice.id}`);
//         return;
//     }
//
//     const toolingUpdated: PracticeDetectionTooling = {
//         ...toolingToUpdate,
//         status: 'PENDING',
//     }
//
//     await practiceDetectionRepository.upsertTooling(toolingUpdated);
//     const tooling = await practiceDetectionRepository.getToolingForPractice(practice.id);
//     return tooling;
// }
