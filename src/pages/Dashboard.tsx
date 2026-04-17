import React from 'react';
import cockpit from 'cockpit';
import { Button } from '@patternfly/react-core/dist/esm/components/Button/index.js';
import { Card, CardBody, CardTitle } from '@patternfly/react-core/dist/esm/components/Card/index.js';
import { Gallery } from '@patternfly/react-core/dist/esm/layouts/Gallery/index.js';
import { Label } from '@patternfly/react-core/dist/esm/components/Label/index.js';
import { Stack, StackItem } from '@patternfly/react-core/dist/esm/layouts/Stack/index.js';
import { Spinner } from '@patternfly/react-core/dist/esm/components/Spinner/index.js';
import { Alert } from '@patternfly/react-core/dist/esm/components/Alert/index.js';
import { Title } from '@patternfly/react-core/dist/esm/components/Title/index.js';
import type { PageProps } from '../types';

const _ = cockpit.gettext;

interface DashboardData {
  postfix_status: string;
  dovecot_status: string;
  queue_count: number;
  domain_count: number;
  mailbox_count: number;
  alias_count: number;
  hostname: string;
  postfix_version: string;
  dovecot_version: string;
}

function parsePostfixVersion(raw: string): string {
  const match = raw.match(/mail_version\\s*=\\s*(.+)$/m);
  return match?.[1]?.trim() || '';
}

async function run(cmd: string[]): Promise<string> {
  try {
    return await cockpit.spawn(cmd, { superuser: 'try', err: 'ignore' });
  } catch {
    return '';
  }
}

async function countFileLines(path: string): Promise<number> {
  try {
    const content = await cockpit.spawn(
      ['grep', '-cEv', '^\\s*($|#)', path],
      { superuser: 'try', err: 'ignore' }
    );
    return Number.parseInt(content.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

async function fetchDashboardData(): Promise<DashboardData> {
  const [
    postfixStatus, dovecotStatus,
    queueRaw,
    domainCount, mailboxCount, aliasCount,
    hostname, postfixVersionRaw, dovecotVersionRaw
  ] = await Promise.all([
    run(['systemctl', 'is-active', 'postfix']),
    run(['systemctl', 'is-active', 'dovecot']),
    run(['postqueue', '-j']),
    countFileLines('/etc/postfix/virtual_mailbox_domains'),
    countFileLines('/etc/postfix/virtual_mailbox_maps'),
    countFileLines('/etc/postfix/virtual_alias_maps'),
    run(['hostname']),
    run(['postconf', '-d', 'mail_version']),
    run(['dovecot', '--version']),
  ]);

  let queueCount = 0;
  if (queueRaw.trim()) {
    queueCount = queueRaw.trim().split('\n').filter((line) => line.trim()).length;
  }

  return {
    postfix_status: postfixStatus.trim() || 'unknown',
    dovecot_status: dovecotStatus.trim() || 'unknown',
    queue_count: queueCount,
    domain_count: domainCount,
    mailbox_count: mailboxCount,
    alias_count: aliasCount,
    hostname: hostname.trim(),
    postfix_version: parsePostfixVersion(postfixVersionRaw),
    dovecot_version: dovecotVersionRaw.trim(),
  };
}

export function DashboardPage({ context }: PageProps): React.JSX.Element {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await fetchDashboardData();
      setData(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const serviceAction = async (service: string) => {
    try {
      await cockpit.spawn(['systemctl', 'restart', service], { superuser: 'require', err: 'message' });
      context.notify('success', `${service} restarted`);
      await load();
    } catch (e) {
      context.notify('danger', `Failed to restart ${service}`, String(e));
    }
  };

  const flushQueue = async () => {
    try {
      await cockpit.spawn(['postqueue', '-f'], { superuser: 'try', err: 'message' });
      context.notify('success', 'Queue flush requested');
      await load();
    } catch (e) {
      context.notify('danger', 'Failed to flush queue', String(e));
    }
  };

  if (loading) return <Spinner />;

  if (error) {
    return (
      <Alert variant="warning" title={_('Dashboard error')}>
        <p>{error}</p>
        <Button variant="link" onClick={() => void load()}>{_('Retry')}</Button>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert variant="info" title={_('No data available')}>
        <p>{_('Could not retrieve mail server status. Ensure Postfix is installed.')}</p>
        <Button variant="link" onClick={() => void load()}>{_('Retry')}</Button>
      </Alert>
    );
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h2" size="lg">{_('Mail Server Dashboard')}</Title>
      </StackItem>
      <StackItem>
        <Gallery hasGutter minWidths={{ default: '200px' }}>
          <Card>
            <CardTitle>{_('Postfix')}</CardTitle>
            <CardBody>
              <Label color={data.postfix_status === 'active' ? 'green' : 'red'}>
                {data.postfix_status}
              </Label>
              {data.postfix_version && <div style={{ marginTop: 8, fontSize: 'small' }}>v{data.postfix_version}</div>}
            </CardBody>
          </Card>
          <Card>
            <CardTitle>{_('Dovecot')}</CardTitle>
            <CardBody>
              <Label color={data.dovecot_status === 'active' ? 'green' : 'red'}>
                {data.dovecot_status}
              </Label>
              {data.dovecot_version && <div style={{ marginTop: 8, fontSize: 'small' }}>v{data.dovecot_version}</div>}
            </CardBody>
          </Card>
          <Card>
            <CardTitle>{_('Mail Queue')}</CardTitle>
            <CardBody>
              <span style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{data.queue_count}</span>
            </CardBody>
          </Card>
          <Card>
            <CardTitle>{_('Domains')}</CardTitle>
            <CardBody>
              <span style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{data.domain_count}</span>
            </CardBody>
          </Card>
          <Card>
            <CardTitle>{_('Mailboxes')}</CardTitle>
            <CardBody>
              <span style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{data.mailbox_count}</span>
            </CardBody>
          </Card>
          <Card>
            <CardTitle>{_('Aliases')}</CardTitle>
            <CardBody>
              <span style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{data.alias_count}</span>
            </CardBody>
          </Card>
        </Gallery>
      </StackItem>
      {data.hostname && (
        <StackItem>
          <Card>
            <CardBody>
              <strong>{_('Hostname:')}</strong> {data.hostname}
            </CardBody>
          </Card>
        </StackItem>
      )}
      <StackItem>
        <Button variant="secondary" onClick={() => void flushQueue()}>{_('Flush Queue')}</Button>{' '}
        <Button variant="secondary" onClick={() => void serviceAction('postfix')}>{_('Restart Postfix')}</Button>{' '}
        <Button variant="secondary" onClick={() => void serviceAction('dovecot')}>{_('Restart Dovecot')}</Button>{' '}
        <Button variant="link" onClick={() => void load()}>{_('Refresh')}</Button>
      </StackItem>
    </Stack>
  );
}
