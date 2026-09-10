import type { Context } from 'aws-lambda';
import { ZodError } from 'zod';

const wideEvent = new Map<string, unknown>();

const dumpContext = () => {
  console.log(JSON.stringify(Object.fromEntries(wideEvent.entries())));
};

export const dumpAndResetContext = (lambdaContext: Context) => {
  if (wideEvent.size > 0) {
    dumpContext();
    wideEvent.clear();
  }
  wideEvent.set('requestId', lambdaContext.awsRequestId);
};

export const clearContext = () => {
  wideEvent.clear();
};

const serializeError = (err: Error, depth = 0): unknown => {
  if (depth > 5) return { message: err.message, note: 'cause chain truncated' };
  const base = JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err))) as Record<string, unknown>;
  if (err.cause instanceof Error) {
    base.cause = serializeError(err.cause, depth + 1);
  }
  return base;
};

export const setContext = (key: string, value: unknown) => {
  if (typeof value === 'object') {
    if (value === null) return;
    if (value instanceof Error) {
      if (value instanceof ZodError) {
        wideEvent.set(key, JSON.parse(value.message));
        return;
      }
      wideEvent.set(key, serializeError(value));
      return;
    }
  }
  wideEvent.set(key, value);
};

export const pushContextArray = (key: string, value: unknown) => {
  const currentValue = wideEvent.get(key) ?? null;
  if (currentValue === null || typeof currentValue !== 'object' || !Array.isArray(currentValue)) {
    setContext(key, [value]);
    return;
  }
  currentValue.push(value);
  setContext(key, currentValue);
};

export const lambdaHandler = <EventType = unknown, ResultType = void>(
  callBack: (event: EventType, context: Context) => Promise<ResultType>
) => {
  return async (event: EventType, context: Context): Promise<ResultType> => {
    clearContext();
    dumpAndResetContext(context);
    try {
      const result = await callBack(event, context);
      dumpContext();
      return result;
    } catch (e) {
      setContext('error', e);
      dumpContext();
      throw e;
    }
  };
};
