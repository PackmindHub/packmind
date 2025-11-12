export interface SubscribeDto {
  eventType: string;
  params?: string[];
}

export interface UnsubscribeDto {
  eventType: string;
  params?: string[];
}
