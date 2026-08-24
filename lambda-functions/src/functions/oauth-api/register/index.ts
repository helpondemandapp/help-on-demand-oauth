import { apiRequestLambdaWrapper, ResponseBuilder } from '/opt/nodejs/protocol/http.js';

export const handler = apiRequestLambdaWrapper({
  callback: async () => {
    const res = new ResponseBuilder();
    return res.status(200).json({ message: 'Hello world!' });
  },
});
