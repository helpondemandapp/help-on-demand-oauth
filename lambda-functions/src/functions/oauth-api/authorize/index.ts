import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseCookies } from '/opt/nodejs/protocol/http.js';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const cookies = parseCookies(event);
  console.log(cookies);
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'Hello world!' }),
  };
};
