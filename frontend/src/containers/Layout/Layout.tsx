import React from 'react';
import { Card, Col, Container, Row, Image } from 'react-bootstrap';
import Footer from '@/components/Footer/Footer.tsx';
import { useSystemTheme } from '@/contexts/SystemTheme/context.ts';

type LayoutProps = {
  children: React.ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  const theme = useSystemTheme();
  const logoSource = React.useMemo(
    () => (theme === 'light' ? 'help_on_demand_logo.png' : 'HOD_Logo_Solid_white.png'),
    [theme]
  );
  return (
    <div style={{ minHeight: '100svh' }} className={'d-flex flex-column'}>
      <Container className={'flex-grow-1 d-flex flex-column justify-content-center'}>
        <Row className={'justify-content-center'}>
          <Col xs={12} md={11} lg={6}>
            <Row className={'mb-2 justify-content-center'}>
              <Col xs={5} md={4}>
                <Image src={`/images/${logoSource}`} alt={'Help on Demand Logo'} className={'w-100 h-auto'} />
              </Col>
            </Row>
            <Card>
              <Card.Body>{children}</Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      <Container fluid>
        <Footer />
      </Container>
    </div>
  );
};

export default Layout;
