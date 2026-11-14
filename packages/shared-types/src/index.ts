export type PingResponse = {
  status: string;
  message: string;
  timestamp: string;
};

export * from './company';
export * from './job-posting';
export * from './events';
export * from './affinity';
export * from './mentor';


export interface Requirements {
  id: string;
  description: string;
  isFulfilled?: boolean;
  [key: string]: any;
}