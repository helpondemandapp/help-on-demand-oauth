import { z } from 'zod';
import {
  HODInvalidLoginErrorSchema,
  type HODTokenRequest,
  HODTokenResponseSchema,
} from '/opt/nodejs/data/hodAPI/schema.js';
import { Environment } from '/opt/nodejs/config/env.js';
import { setContext } from '/opt/nodejs/logging/wideEvent.js';

type tokenSuccess = {
  error: false;
  tokenData: z.infer<typeof HODTokenResponseSchema>;
};

type tokenFailed = {
  error: true;
  errorMessage: string;
  statusCode: number;
};

export const getHODToken = async (
  request: Omit<HODTokenRequest, 'grant_type'>
): Promise<tokenFailed | tokenSuccess> => {
  const hodResponse = await fetch(`${Environment.BWS_WEB_BASE_URL}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...request,
      grant_type: 'password',
    } satisfies HODTokenRequest),
  });
  if (!hodResponse.ok) {
    const responseText = await hodResponse.text();
    try {
      const safeParseError = HODInvalidLoginErrorSchema.safeParse(JSON.parse(responseText));
      if (!safeParseError.success) {
        return { error: true, errorMessage: 'Unable to log in', statusCode: 500 };
      }
      const errorResponse = safeParseError.data;
      return { error: true, errorMessage: errorResponse.error, statusCode: 400 };
    } catch (e) {
      setContext('hodResponseError', e);
      return { error: true, errorMessage: 'Unable to log in', statusCode: 500 };
    }
  }
  return {
    error: false,
    tokenData: HODTokenResponseSchema.parse(await hodResponse.json()),
  };
};
