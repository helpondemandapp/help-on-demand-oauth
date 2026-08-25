import { apiRequestLambdaWrapper, ResponseBuilder } from '/opt/nodejs/protocol/http.js';
import { z } from 'zod';
import { setContext } from '/opt/nodejs/logging/wideEvent.js';
import { getHODToken } from '/opt/nodejs/data/hodAPI/hodTokens.js';

const RequestSchema = z.object({
  username: z.string().trim().toLowerCase().nonempty('username is required'),
  password: z.string().trim().nonempty('password is required'),
});

export const handler = apiRequestLambdaWrapper({
  callback: async (event) => {
    const res = new ResponseBuilder();
    const safeBody = RequestSchema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!safeBody.success) {
      return res.status(400).json({ error: JSON.parse(safeBody.error.message) });
    }
    const request = safeBody.data;
    setContext('username', request.username);
    const hodTokenResponse = await getHODToken(request);
    if (hodTokenResponse.error) {
      return res.status(hodTokenResponse.statusCode).json({ error: hodTokenResponse.errorMessage });
    }
    const hodToken = hodTokenResponse.tokenData;
    setContext('tokenLength', hodToken.access_token.length);
    return res.status(500).json({ error: 'Not implemented' });
  },
});
