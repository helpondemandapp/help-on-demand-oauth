import type { Context } from 'aws-lambda';

export const handler = (event: unknown, context: Context) => {
  console.log(event);
  console.log(context);
  return 'Hello, World!';
};
