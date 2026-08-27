import { apiRequestLambdaWrapper, ResponseBuilder } from '/opt/nodejs/protocol/http.js';
import { setContext } from '/opt/nodejs/logging/wideEvent.js';

export const handler = apiRequestLambdaWrapper({
  callback: async (event) => {
    const res = new ResponseBuilder();
    setContext('eventBody', JSON.parse(event.body ?? '{}'));
    setContext('eventHeaders', event.headers);
    return res.status(200).json({ message: 'Hello world!' });
  },
});
