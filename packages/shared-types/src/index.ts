export type PingResponse = {
  status: string;
  message: string;
  timestamp: string;
};

export * from "./auth";
export * from "./company";
export * from "./company-invitation";
export * from "./job-posting";
export * from "./events";
export type {
  EventPassStatus,
  EventPassQrPayload,
  EventPassEventDetails,
  EventPassDto,
} from "./event-pass";
export type {
  ConditionId,
  Requirements as MentorRequirements,
  MentorState,
  MentorDirectoryArea,
  MentorDirectoryResponse,
  CompanyItem,
  CompanyInvitationItem,
} from "./mentor";
export * from "./perfil";
export * from "./email-verification";
export * from "./review";
export * from "./affinity";
export * from "./nlp";
export * from "./correction";

export type { TechnicalVacancyRequirement } from "./technical-vacancy-requirement";

export interface Requirements {
  id: string;
  description: string;
  isFulfilled?: boolean;
  [key: string]: any;
}
