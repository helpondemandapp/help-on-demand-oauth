import { useRequestId } from '@/contexts/RequestId/context.ts';
import { useMutation, useQuery } from '@tanstack/react-query';
import React from 'react';
import { Alert, Button, Card, Col, ListGroup, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router';
import { tryParseErrorMessage } from '@/api/apiHelpers.ts';
import { ConsentRequestDetails } from '@/library/ConsentRequestDetails.ts';

type ConsentProps = {
  consentDetails: ConsentRequestDetails;
};

const Consent = ({ consentDetails }: ConsentProps) => {
  const requestId = useRequestId();
  const navigate = useNavigate();

  const allowMutation = useMutation({
    mutationKey: ['consent', 'allow', requestId],
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const response = await fetch(`/api/allow?requestId=${requestId}`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ requestId }),
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized');
        }
        if (response.status === 403) {
          throw new Error('Forbidden');
        }
        throw new Error(tryParseErrorMessage(await response.text(), 'Failed to allow consent request'));
      }
    },
    onSuccess: () => {
      window.location.href = `/api/consent?requestId=${requestId}`;
    },
    onError: (e) => {
      if (e.message === 'Unauthorized' || e.message === 'Forbidden') {
        navigate(`/login?requestId=${requestId}`, { replace: true });
      }
    },
  });

  const onAllowClick = () => {
    if (allowMutation.isPending || allowMutation.isSuccess) return;
    allowMutation.mutate({ requestId: requestId });
  };

  return (
    <>
      <Card.Title>{consentDetails.client.name} Has Requested Access</Card.Title>
      <Card.Text>
        {consentDetails.client.name} is requesting access to your Help on Demand account, {consentDetails.user.email}.
      </Card.Text>
      <Card className={'mb-3'}>
        <Card.Header>The following permissions are requested</Card.Header>
        <Card.Body className={'p-0 border-top-0'}>
          {consentDetails.scopes.map((scope) => (
            <div key={scope.scope} className={'scope-list-item'}>
              {scope.description}
            </div>
          ))}
        </Card.Body>
      </Card>
      <Alert variant={'warning'}>
        Make sure you trust {consentDetails.client.name} before allowing access to your account. You may be sharing
        sensitive information with this web site or app.
      </Alert>
      <Row>
        <Col className={'d-grid'}>
          <Button
            href={`/api/deny?requestId=${requestId}`}
            variant={'secondary'}
            className={'no-text-decoration'}
            disabled={allowMutation.isPending || allowMutation.isSuccess}
          >
            Deny
          </Button>
        </Col>
        <Col className={'d-grid'}>
          <Button
            type={'button'}
            variant={'hod-primary'}
            onClick={onAllowClick}
            disabled={allowMutation.isPending || allowMutation.isSuccess}
          >
            {allowMutation.isPending || allowMutation.isSuccess ? (
              <>
                <Spinner size={'sm'} />
              </>
            ) : (
              'Allow'
            )}
          </Button>
        </Col>
      </Row>
      <Alert
        show={allowMutation.isError}
        dismissible
        onClose={() => allowMutation.reset()}
        variant={'danger'}
        className={'mt-3'}
      >
        {allowMutation.error?.message}
      </Alert>
    </>
  );
};

const ConsentWrapper = () => {
  const requestId = useRequestId();
  const navigate = useNavigate();
  const requestQuery = useQuery({
    queryKey: ['consent', 'request', requestId],
    queryFn: async () => {
      const response = await fetch(`/api/consent-request?requestId=${requestId}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Unauthorized');
        }
        throw new Error(tryParseErrorMessage(await response.text(), 'Failed to fetch consent request'));
      }
      return (await response.json()) as ConsentRequestDetails;
    },
  });

  React.useEffect(() => {
    if (requestQuery.error === null) return;
    if (requestQuery.error.message === 'Unauthorized') {
      navigate(`/login?requestId=${requestId}`, { replace: true });
    }
  }, [requestQuery.error, requestId, navigate]);

  if (requestQuery.error !== null) {
    return <Alert variant={'danger'}>{requestQuery.error.message}</Alert>;
  }

  if (!requestQuery.data) {
    return (
      <Row className={'justify-content-center'}>
        <Col xs={'auto'}>
          <Spinner />
        </Col>
      </Row>
    );
  }

  return <Consent consentDetails={requestQuery.data} />;
};

export default ConsentWrapper;
