import { apiRequestLambdaWrapper, parseCookieHeader, ResponseBuilder } from '/opt/nodejs/protocol/http.js';

export const handler = apiRequestLambdaWrapper({
  callback: async (event) => {
    const res = new ResponseBuilder();

    const cookies = parseCookieHeader(event);
    const sessionIdCookie = cookies.get('sessionId');

    if (sessionIdCookie === null) {
      return res.redirect(`/login`);
    }

    return res.status(200).json({ message: 'Hello world!' });
  },
});
