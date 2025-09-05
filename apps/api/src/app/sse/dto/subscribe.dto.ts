export class SubscribeDto {
  eventType: string;
  params?: string[];
}

export class UnsubscribeDto {
  eventType: string;
  params?: string[];
}
