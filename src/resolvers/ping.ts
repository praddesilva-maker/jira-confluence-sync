export interface PingResponse {
  message: string;
  timestamp: string;
}

export function getPingResponse(): PingResponse {
  return {
    message: 'pong from Initiative Sync backend',
    timestamp: new Date().toISOString(),
  };
}
