import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface InvitationEmailProps {
  invitedByUsername?: string;
  teamName?: string;
  inviteLink?: string;
  siteName?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export const InvitationEmail = ({
  invitedByUsername = 'A user',
  teamName = 'their team',
  inviteLink = baseUrl,
  siteName = 'XLSConvert',
}: InvitationEmailProps) => {
  const previewText = `Join ${teamName} on ${siteName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Join {teamName} on {siteName}</Heading>
          <Text style={text}>
            Hello,
          </Text>
          <Text style={text}>
            <strong>{invitedByUsername}</strong> has invited you to collaborate on <strong>{teamName}</strong>.
            By accepting this invitation, you will gain access to the shared subscription and conversion limits.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={inviteLink}>
              Accept Invitation
            </Button>
          </Section>
          <Text style={text}>
            If you were not expecting this invitation, you can ignore this email.
          </Text>
          <Hr style={hr} />
          <Link href={baseUrl} style={footer}>
            {siteName}
          </Link>
        </Container>
      </Body>
    </Html>
  );
};

export default InvitationEmail;

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '580px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
};

const text = {
  color: '#555',
  fontSize: '16px',
  lineHeight: '26px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#A085CF', // Primary color from your theme
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 20px',
};

const hr = {
  borderColor: '#cccccc',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
};
