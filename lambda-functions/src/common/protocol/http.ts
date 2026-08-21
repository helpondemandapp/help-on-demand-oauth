import type { APIGatewayProxyEvent } from 'aws-lambda';

export const parseCookies = (event: APIGatewayProxyEvent) => {
  const rawCookieHeader = event.headers?.cookie ?? event.headers?.Cookie ?? '';
  return rawCookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .reduce<Record<string, string>>((acc, part) => {
      const eq = part.indexOf('=');
      if (eq === -1) return acc;
      const key = decodeURIComponent(part.slice(0, eq).trim());
      acc[key] = decodeURIComponent(part.slice(eq + 1).trim());
      return acc;
    }, {});
};
