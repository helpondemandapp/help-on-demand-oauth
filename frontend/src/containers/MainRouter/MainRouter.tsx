import React from 'react';
import { Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router';
import { Alert } from 'react-bootstrap';
import RequestIdProvider from '@/contexts/RequestId';

const Login = React.lazy(() => import('@/containers/Login/Login.tsx'));

const MainRouter = () => {
  const [params] = useSearchParams();
  const location = useLocation();
  const requestId = params.get('requestId');
  const navigate = useNavigate();

  React.useEffect(() => {
    if (requestId === null) return;
    if (location.pathname !== '/login' && location.pathname !== '/consent') {
      navigate(`/login?requestId=${requestId}`, { replace: true });
    }
  }, [location.pathname, requestId, navigate]);

  if (requestId === null) {
    return <Alert variant={'warning'}>No request id given</Alert>;
  }

  return (
    <RequestIdProvider requestId={requestId}>
      <Routes>
        <Route
          path={'/login'}
          element={
            <React.Suspense>
              <Login />
            </React.Suspense>
          }
        />
      </Routes>
    </RequestIdProvider>
  );
};

export default MainRouter;
