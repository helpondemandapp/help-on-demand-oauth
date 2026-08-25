import { apiRequestLambdaWrapper, ResponseBuilder } from '/opt/nodejs/protocol/http.js';
import { z } from 'zod';
import { setContext } from '/opt/nodejs/logging/wideEvent.js';

const RequestSchema = z.object({
  username: z.string().trim().toLowerCase().nonempty('username is required'),
  password: z.string().trim().nonempty('password is required'),
});

export const authenticate = apiRequestLambdaWrapper({
  callback: async (event) => {
    const res = new ResponseBuilder();
    const safeBody = RequestSchema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!safeBody.success) {
      return res.status(400).json({ error: JSON.parse(safeBody.error.message) });
    }
    const request = safeBody.data;
    setContext('username', request.username);
    return res.status(500).json({ error: 'Not implemented' });
  },
});
