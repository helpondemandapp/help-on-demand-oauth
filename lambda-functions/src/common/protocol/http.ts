import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { lambdaHandler, setContext } from '/opt/nodejs/logging/wideEvent.js';
import { getConsentRequestFromParameters } from '/opt/nodejs/core/consentRequests.js';
import { normalizeScopeString, separateScopeString } from '/opt/nodejs/core/scopes.js';
import { getScopeDescriptionsForNames } from '/opt/nodejs/data/sql/scopes.js';
import { fetchUserWithRoles, type UserWithRoles } from '/opt/nodejs/data/sql/users.js';
import { findSessionById } from '/opt/nodejs/data/dynamodb/sessions.js';
import { openSql } from '/opt/nodejs/data/sql/db.js';

class CaseInsensitiveStringMap {
  private readonly map: ReadonlyMap<string, string>;

  constructor(entries: Iterable<[string, string]>) {
    const map = new Map<string, string>();
    for (const [key, value] of entries) {
      map.set(key.toLowerCase(), value);
    }

    this.map = map;
  }

  public get(key: string): string | null {
    return this.map.get(key.toLowerCase()) ?? null;
  }

  public toJSON() {
    return Object.fromEntries(this.map.entries());
  }

  public toString() {
    return JSON.stringify(this.toJSON());
  }
}

export const parseCookieHeader = (event: APIGatewayProxyEvent) => {
  const cookieHeader = event.headers?.Cookie ?? event.headers?.cookie ?? '';

  return new CaseInsensitiveStringMap(
    Object.entries(
      cookieHeader
        .split(';')
        .map((cookie) => cookie.trim())
        .filter((cookie) => cookie.length > 0)
        .reduce<Record<string, string>>((acc, value) => {
          const eqIndex = value.indexOf('=');
          if (eqIndex === -1) return acc;
          const key = decodeURIComponent(value.substring(0, eqIndex).trim());
          acc[key] = decodeURIComponent(value.substring(eqIndex + 1).trim());
          return acc;
        }, {})
    )
  );
};
type CookieOptions = {
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  path?: string;
  sameSite?: 'Strict' | 'Lax' | 'None';
};

export const httpOnlyCookie = (maxAge: number): CookieOptions => ({
  maxAge,
  secure: true,
  httpOnly: true,
  path: '/',
  sameSite: 'Lax',
});

type HeaderValue = string | number | boolean;

export class ResponseBuilder {
  private statusCode: number;
  private body: string;
  private readonly headerValues: Map<string, HeaderValue>;
  private readonly multiValueHeaderValues: Map<string, [HeaderValue, HeaderValue, ...HeaderValue[]]>;

  constructor() {
    this.statusCode = 204;
    this.body = '';
    this.headerValues = new Map<string, HeaderValue>();
    this.multiValueHeaderValues = new Map<string, [HeaderValue, HeaderValue, ...HeaderValue[]]>();
  }

  public build(): APIGatewayProxyResult {
    const headers = this.headerValues.size > 0 ? Object.fromEntries(this.headerValues.entries()) : null;
    const multiValueHeaders =
      this.multiValueHeaderValues.size > 0 ? Object.fromEntries(this.multiValueHeaderValues.entries()) : null;
    return {
      statusCode: this.statusCode,
      body: this.body,
      ...(headers !== null ? { headers } : {}),
      ...(multiValueHeaders !== null ? { multiValueHeaders } : {}),
    };
  }

  public appendHeader(denormalizedKey: string, value: HeaderValue): ResponseBuilder {
    const key = denormalizedKey.toLowerCase();

    const multiValueHeader = this.multiValueHeaderValues.get(key) ?? null;
    if (multiValueHeader !== null) {
      multiValueHeader.push(value);
      this.multiValueHeaderValues.set(key, multiValueHeader);
      return this;
    }
    const singleHeaderValue = this.headerValues.get(key) ?? null;
    if (singleHeaderValue === null) {
      this.headerValues.set(key, value);
      return this;
    }
    this.headerValues.delete(key);
    this.multiValueHeaderValues.set(key, [singleHeaderValue, value]);
    return this;
  }

  public setHeader(denormalizedKey: string, value: HeaderValue): ResponseBuilder {
    const key = denormalizedKey.toLowerCase();
    this.headerValues.set(key, value);
    if (this.multiValueHeaderValues.has(key)) this.multiValueHeaderValues.delete(key);
    return this;
  }

  public setCookie(name: string, value: string, options?: CookieOptions): ResponseBuilder {
    const maxAge = options?.maxAge ?? null;
    const secure = options?.secure ?? false;
    const httpOnly = options?.httpOnly ?? false;
    const path = options?.path ?? null;
    const sameSite = options?.sameSite ?? null;
    const cookieStringBuilder = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
    if (maxAge !== null) cookieStringBuilder.push(`Max-Age=${maxAge}`);
    if (secure) cookieStringBuilder.push('Secure');
    if (httpOnly) cookieStringBuilder.push('HttpOnly');
    if (path !== null) cookieStringBuilder.push(`Path=${path}`);
    if (sameSite !== null) cookieStringBuilder.push(`SameSite=${sameSite}`);
    this.appendHeader('Set-Cookie', cookieStringBuilder.join('; '));
    return this;
  }

  public status(code: number): ResponseBuilder {
    this.statusCode = code;
    return this;
  }

  public content(body: string): ResponseBuilder {
    this.body = body;
    return this;
  }

  public json<BodyType extends Record<string, unknown> = Record<string, unknown>>(body: BodyType): ResponseBuilder {
    return this.setHeader('Content-Type', 'application/json').content(JSON.stringify(body));
  }

  public redirect(url: string, statusCode: number = 302): ResponseBuilder {
    return this.setHeader('Location', url).status(statusCode);
  }

  public addCodeToContext() {
    setContext('responseStatusCode', this.statusCode);
  }
}

type ApiRequestLambdaWrapperParams = {
  callback: (event: APIGatewayProxyEvent, context: Context) => Promise<ResponseBuilder>;
};

let coldStart = true;

export const apiRequestLambdaWrapper = ({ callback }: ApiRequestLambdaWrapperParams) => {
  return lambdaHandler<APIGatewayProxyEvent, APIGatewayProxyResult>(async (event, context) => {
    setContext('coldStart', coldStart);
    coldStart = false;
    setContext('path', event.path);
    setContext('httpMethod', event.httpMethod);
    const start = new Date();
    setContext('eventTime', start.toISOString());
    try {
      const responseBuilder = await callback(event, context);
      const end = new Date();
      setContext('executionTimeMillis', end.getTime() - start.getTime());
      responseBuilder.addCodeToContext();
      return responseBuilder.build();
    } catch (e) {
      const end = new Date();
      setContext('executionTimeMillis', end.getTime() - start.getTime());
      setContext('executionError', e);
      const res = new ResponseBuilder().status(500).json({ error: 'Internal Server Error' });
      res.addCodeToContext();
      return res.build();
    }
  });
};

type ApiRequestWithUserWrapperParams = {
  callback: (event: APIGatewayProxyEvent, userId: UserWithRoles, context: Context) => Promise<ResponseBuilder>;
  onUnauthorized: (event: APIGatewayProxyEvent, res: ResponseBuilder, context: Context) => Promise<ResponseBuilder>;
};

export const redirectToLoginOnUnAuthorized = () => {
  return async (event: APIGatewayProxyEvent, res: ResponseBuilder, _context: Context) => {
    const requestId = event.queryStringParameters?.requestId ?? null;
    const loginUrl = requestId !== null ? `/login?requestId=${encodeURIComponent(requestId)}` : '/login';
    return res.redirect(loginUrl, 302);
  };
};

export const error401OnUnauthorized = () => {
  return async (_event: APIGatewayProxyEvent, res: ResponseBuilder, _context: Context) => {
    return res.status(401).json({ error: 'Unauthorized' });
  };
};

export const apiRequestWithUserLambdaWrapper = ({ callback, onUnauthorized }: ApiRequestWithUserWrapperParams) => {
  return apiRequestLambdaWrapper({
    callback: async (event, context) => {
      const res = new ResponseBuilder();
      await openSql();
      const cookies = parseCookieHeader(event);
      const sessionId = cookies.get('sessionId');
      if (sessionId === null) {
        return await onUnauthorized(event, res, context);
      }
      const session = await findSessionById(sessionId);
      if (session === null) {
        res.setCookie('sessionId', '', httpOnlyCookie(0));
        return await onUnauthorized(event, res, context);
      }
      const user = await fetchUserWithRoles(session.userId);
      if (user === null) {
        res.setCookie('sessionId', '', httpOnlyCookie(0));
        return await onUnauthorized(event, res, context);
      }
      setContext('sessionUser', user);
      return callback(event, user, context);
    },
  });
};
