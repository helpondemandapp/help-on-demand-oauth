import { apiRequestLambdaWrapper, ResponseBuilder } from '/opt/nodejs/protocol/http.js';
import type { APIGatewayProxyEvent } from 'aws-lambda';

const getHandler = async (_event: APIGatewayProxyEvent): Promise<ResponseBuilder> => {
  return new ResponseBuilder().status(500).json({ message: 'GET request received' });
};

const postHandler = async (_event: APIGatewayProxyEvent): Promise<ResponseBuilder> => {
  return new ResponseBuilder().status(500).json({ message: 'POST request received' });
};

export const handler = apiRequestLambdaWrapper({
  callback: async (event) => {
    switch (event.httpMethod.trim().toLowerCase()) {
      case 'get':
        return await getHandler(event);
      case 'post':
        return await postHandler(event);
    }
    return new ResponseBuilder().status(405).json({ message: 'Method Not Allowed' });
  },
});
