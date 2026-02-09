/* eslint-disable @typescript-eslint/no-explicit-any */
// That's pretty ugly, but we need to rely on the any type for infering properly the use case types.

import { PackmindEventSource } from './events';

export type PublicPackmindCommand = object;
export type PublicEmptyPackmindCommand = Record<string, never>;

export type PackmindCommand = {
  userId: string;
  organizationId: string;
  source?: PackmindEventSource;
  originSkill?: string;
};

export type SystemPackmindCommand = {
  organizationId: string;
  userId?: string; // Optional for system operations
};
export type PackmindCommandBody<Command extends PackmindCommand> = Omit<
  Command,
  'userId' | 'organizationId'
>;

export type NewPackmindCommandBody<Command extends PackmindCommand> = Omit<
  Command,
  'userId'
>;

export type PackmindResult = object;

export interface IPublicUseCase<
  Command extends PublicPackmindCommand,
  Result extends PackmindResult,
> {
  execute: (command: Command) => Promise<Result>;
}

export interface IUseCase<
  Command extends PackmindCommand,
  Result extends PackmindResult,
> {
  execute: (command: Command) => Promise<Result>;
}

export interface ISystemUseCase<
  Command extends SystemPackmindCommand,
  Result extends PackmindResult,
> {
  execute: (command: Command) => Promise<Result>;
}

type CommandType<U> = U extends IUseCase<infer C, any> ? C : never;

type ResultType<U> = U extends IUseCase<any, infer R> ? R : never;

export type Gateway<U extends IUseCase<any, any>> = (
  params: PackmindCommandBody<CommandType<U>>,
) => Promise<ResultType<U>>;

export type NewGateway<U extends IUseCase<any, any>> = (
  params: NewPackmindCommandBody<CommandType<U>>,
) => Promise<ResultType<U>>;

type PublicCommandType<U> = U extends IPublicUseCase<infer C, any> ? C : never;

type PublicResultType<U> = U extends IPublicUseCase<any, infer R> ? R : never;

export type PublicGateway<U extends IPublicUseCase<any, any>> = (
  params: PublicCommandType<U>,
) => Promise<PublicResultType<U>>;
