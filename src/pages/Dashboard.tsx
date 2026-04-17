import React from 'react';
import { Button } from '@patternfly/react-core/dist/esm/components/Button/index.js';
import { Card, CardBody, CardTitle } from '@patternfly/react-core/dist/esm/components/Card/index.js';
import { Gallery } from '@patternfly/react-core/dist/esm/layouts/Gallery/index.js';
import { Label } from '@patternfly/react-core/dist/esm/components/Label/index.js';
import { Stack, StackItem } from '@patternfly/react-core/dist/esm/layouts/Stack/index.js';
import { Spinner } from '@patternfly/react-core/dist/esm/components/Spinner/index.js';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core/dist/esm/components/EmptyState/index.js';
import type { PageProps } from '../types';

interface DashboardData {
  postfix_status: string;
  dovecot_status: string;
  queue_count: number;
  domain_count: number;
  mailbox_count: number;
}

export function DashboardPage({ context }: PageProps): React.JSX.Element {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<DashboardData | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const output = await context.runHelper('dashboard-stats.sh');
      setData(JSON.parse(output || '{}'));
    } catch (error) {
      context.notify('danger', 'Failed to load dashboard', String(error));
    } finally {
      setLoading(false);
    }
  }, [context]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const serviceAction = async (service: string) => {
    try {
      await context.runHelper('service-control.sh', ['restart', service]);
      context.notify('success', `${service} restarted`);
      await load();
    } catch (error) {
      context.notify('danger', `Failed to restart ${service}`, String(error));
    }
  };

  const flushQueue = async () => {
    try {
      await context.runHelper('queue-flush.sh');
      context.notify('success', 'Queue flush requested');
      await load();
    } catch (error) {
      context.notify('danger', 'Failed to flush queue', String(error));
    }
  };

  if (loading) {
    return <Spinner />;
  }

  if (!data) {
    return <EmptyState headingLevel="h2" titleText="No dashboard data"><EmptyStateBody>Unable to read Postfix status.</EmptyStateBody></EmptyState>;
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <Gallery hasGutter minWidths={{ default: '220px' }}>
          <Card>
            <CardTitle>Postfix status</CardTitle>
            <CardBody><Label color={data.postfix_status === 'active' ? 'green' : 'red'}>{data.postfix_status || 'unknown'}</Label></CardBody>
          </Card>
          <Card>
            <CardTitle>Dovecot status</CardTitle>
            <CardBody><Label color={data.dovecot_status === 'active' ? 'green' : 'red'}>{data.dovecot_status || 'unknown'}</Label></CardBody>
          </Card>
          <Card>
            <CardTitle>Queue count</CardTitle>
            <CardBody>{data.queue_count ?? 0}</CardBody>
          </Card>
          <Card>
            <CardTitle>Domain count</CardTitle>
            <CardBody>{data.domain_count ?? 0}</CardBody>
          </Card>
          <Card>
            <CardTitle>Mailbox count</CardTitle>
            <CardBody>{data.mailbox_count ?? 0}</CardBody>
          </Card>
        </Gallery>
      </StackItem>
      <StackItem>
        <Button variant="secondary" onClick={flushQueue}>Flush queue</Button>{' '}
        <Button variant="secondary" onClick={() => serviceAction('postfix')}>Restart Postfix</Button>{' '}
        <Button variant="secondary" onClick={() => serviceAction('dovecot')}>Restart Dovecot</Button>
      </StackItem>
    </Stack>
  );
}
