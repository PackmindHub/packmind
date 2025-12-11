export interface ISubscribeDto {
  eventType: string;
  params?: string[];
}

export interface IUnsubscribeDto {
  eventType: string;
  params?: string[];
}
