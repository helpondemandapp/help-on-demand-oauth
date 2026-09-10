import React from 'react';
export const RequestIdContext = React.createContext<string | null>(null);

export const useRequestId = () => {
  const requestId = React.useContext(RequestIdContext);
  if (requestId === null) {
    throw new Error('useRequestId must be used within a RequestIdProvider');
  }
  return requestId;
};
