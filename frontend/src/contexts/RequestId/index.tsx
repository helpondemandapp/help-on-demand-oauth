import React from 'react';
import { RequestIdContext } from '@/contexts/RequestId/context.ts';

const RequestIdProvider = ({ requestId, children }: { requestId: string; children: React.ReactNode }) => {
  return <RequestIdContext.Provider value={requestId}>{children}</RequestIdContext.Provider>;
};

export default RequestIdProvider;
