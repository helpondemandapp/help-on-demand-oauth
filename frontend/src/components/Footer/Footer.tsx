import { Col, Row } from 'react-bootstrap';
import React from 'react';

const Footer = () => {
  const currentYear = React.useMemo(() => new Date().getFullYear(), []);

  return (
    <Row style={{ minHeight: '3.75rem' }} className={'pt-3'}>
      <Col className={'text-center'}>
        © 2015-{currentYear} Big Wave Systems LLC dba Help On Demand |{' '}
        <a href={'https://aws-devapp.bigwavesystems.com/disclosure.html'} target={'_blank'}>
          Privacy Policy/Terms of Use
        </a>
      </Col>
    </Row>
  );
};

export default Footer;
