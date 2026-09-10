import { Environment } from '/opt/nodejs/config/env.js';
import { setContext } from '/opt/nodejs/logging/wideEvent.js';
import { type HODMe, HODMeSchema } from '/opt/nodejs/data/hodAPI/schema.js';

export const hodMe = async (impersonationToken: string): Promise<HODMe> => {
  const response = await fetch(`${Environment.BWS_WEB_BASE_URL}/api/accounts/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${impersonationToken}`,
    },
  });
  if (!response.ok) {
    setContext('hodMeError', { status: response.status, statusText: response.statusText, body: await response.text() });
    throw new Error(`Failed to fetch HOD me endpoint: ${response.status} ${response.statusText}`);
  }
  return HODMeSchema.parse(await response.json());
};
