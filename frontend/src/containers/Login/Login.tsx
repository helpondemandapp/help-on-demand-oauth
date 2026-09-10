import { Alert, Button, Col, Form, InputGroup, Row, Spinner } from 'react-bootstrap';
import React from 'react';
import FloatingTextInput from '@/components/FloatingTextInput/FloatingTextInput.tsx';
import { useMutation } from '@tanstack/react-query';
import { tryParseErrorMessage } from '@/api/apiHelpers.ts';
import { useRequestId } from '@/contexts/RequestId/context.ts';

const Login = () => {
  const [username, setUsername] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');
  const requestId = useRequestId();

  const [blurState, setBlurState] = React.useState<{ username: boolean; password: boolean }>({
    username: false,
    password: false,
  });

  const [showingPassword, setShowingPassword] = React.useState<boolean>(false);

  const authMutation = useMutation({
    mutationKey: ['login', 'auth', requestId],
    mutationFn: async (body: { username: string; password: string }) => {
      const response = await fetch('/api/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(tryParseErrorMessage(await response.text(), 'Failed to authenticate'));
      }
    },
    onSuccess: () => {
      window.location.href = `/api/consent?requestId=${requestId}`;
    },
  });

  const usernameValid = React.useMemo(() => username.trim().toLowerCase().length > 0, [username]);
  const passwordValid = React.useMemo(() => password.trim().length > 0, [password]);

  const formValid = usernameValid && passwordValid;

  const toggleShowingPassword = () => setShowingPassword((current) => !current);

  const onUsernameChange = (value: string) => {
    setUsername(value.trim().toLowerCase());
  };

  const onPasswordChange = (value: string) => {
    setPassword(value.trim());
  };

  const blurField = (field: 'username' | 'password') => {
    setBlurState((current) => ({ ...current, [field]: true }));
  };

  const onSubmit = (event: React.SubmitEvent) => {
    event.preventDefault();
    if (authMutation.isPending || authMutation.isSuccess) return;
    if (!usernameValid || !passwordValid) return;
    authMutation.mutate({ password: password, username: username });
  };

  return (
    <Form onSubmit={onSubmit}>
      <Row className={'g-3'}>
        <Col xs={12}>
          <FloatingTextInput
            value={username}
            onChange={onUsernameChange}
            id={'username'}
            label={'Username'}
            placeholder={'Username'}
            onBlur={() => blurField('username')}
            isInvalid={blurState.username && !usernameValid}
          />
        </Col>
        <Col xs={12}>
          <InputGroup>
            <FloatingTextInput
              value={password}
              onChange={onPasswordChange}
              id={'password'}
              label={'Password'}
              placeholder={'Password'}
              type={showingPassword ? 'text' : 'password'}
              onBlur={() => blurField('password')}
              isInvalid={blurState.password && !passwordValid}
            />
            <Button type={'button'} variant={'secondary'} onClick={toggleShowingPassword}>
              <i className={`bi ${showingPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
            </Button>
          </InputGroup>
        </Col>
        <Col xs={12}>
          <Row className={'justify-content-center'}>
            <Col xs={8} md={4} lg={4} className={'d-grid'}>
              <Button
                type={'submit'}
                variant={'hod-primary'}
                disabled={!formValid || authMutation.isPending || authMutation.isSuccess}
              >
                {authMutation.isPending ? (
                  <>
                    <Spinner size={'sm'} />
                  </>
                ) : (
                  <>Log in</>
                )}
              </Button>
            </Col>
          </Row>
        </Col>
        <Col xs={12}>
          <Row className={'justify-content-between mx-0 mx-md-4'}>
            <Col xs={'auto'}>
              <a href={`${import.meta.env.VITE_WEB_APP_BASE_URL}/forgot_username`}>Forgot Username?</a>
            </Col>
            <Col xs={'auto'}>
              <a href={`${import.meta.env.VITE_WEB_APP_BASE_URL}/forgot_password`}>Forgot Password?</a>
            </Col>
          </Row>
        </Col>
      </Row>
      <Alert
        variant={'danger'}
        className={'mt-2 mb-0'}
        onClose={() => authMutation.reset()}
        dismissible
        show={authMutation.isError}
      >
        {authMutation.error?.message}
      </Alert>
    </Form>
  );
};

export default Login;
