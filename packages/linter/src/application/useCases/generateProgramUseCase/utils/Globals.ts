export default class Globals {
  public static readonly JS_PLAYGROUND_PATH: string =
    process.env.JS_PLAYGROUND_PATH || 'js-playground';

  public static readonly MAX_DEBUG_RETRY: number = process.env.MAX_DEBUG_RETRY
    ? parseInt(process.env.MAX_DEBUG_RETRY)
    : 6;
}
