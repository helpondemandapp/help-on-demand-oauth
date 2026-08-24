import { Button, Col, Form, InputGroup, Row } from 'react-bootstrap';
import React from 'react';
import FloatingTextInput from '@/components/FloatingTextInput/FloatingTextInput.tsx';

const Login = () => {
  const [username, setUsername] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');

  const [blurState, setBlurState] = React.useState<{ username: boolean; password: boolean }>({
    username: false,
    password: false,
  });

  const [showingPassword, setShowingPassword] = React.useState<boolean>(false);

  const usernameValid = React.useMemo(() => username.trim().toLowerCase().length > 0, [username]);
  const passwordValid = React.useMemo(() => password.trim().length > 0, [password]);

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
              <Button type={'submit'} variant={'hod-primary'}>
                Log in
              </Button>
            </Col>
          </Row>
        </Col>
        <Col xs={12}>
          <Row className={'justify-content-between mx-0 mx-md-4'}>
            <Col xs={'auto'}>
              <a href={'https://app.bigwavesystems.com/forgot_username'}>Forgot Username?</a>
            </Col>
            <Col xs={'auto'}>
              <a href={'https://app.bigwavesystems.com/forgot_password'}>Forgot Password?</a>
            </Col>
          </Row>
        </Col>
      </Row>
    </Form>
  );
};

export default Login;
