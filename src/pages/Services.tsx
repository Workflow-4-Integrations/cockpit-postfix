import React from 'react';
import { Button } from '@patternfly/react-core/dist/esm/components/Button/index.js';
import { DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription } from '@patternfly/react-core/dist/esm/components/DescriptionList/index.js';
import { Label } from '@patternfly/react-core/dist/esm/components/Label/index.js';
import { Switch } from '@patternfly/react-core/dist/esm/components/Switch/index.js';
import { Card, CardBody, CardTitle } from '@patternfly/react-core/dist/esm/components/Card/index.js';
import type { PageProps } from '../types';

interface ServiceStatus {
  active: string;
  enabled: string;
}

export function ServicesPage({ context }: PageProps): React.JSX.Element {
  const [services, setServices] = React.useState<Record<string, ServiceStatus>>({});

  const load = React.useCallback(async () => {
    try {
      const entries = await Promise.all(['postfix', 'dovecot'].map(async (service) => {
        const output = await context.runHelper('service-control.sh', ['status', service]);
        return [service, JSON.parse(output || '{}')] as const;
      }));
      setServices(Object.fromEntries(entries));
    } catch (error) {
      context.notify('danger', 'Failed to load services', String(error));
    }
  }, [context]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const action = async (service: string, command: string, message: string) => {
    try {
      await context.runHelper('service-control.sh', [command, service]);
      context.notify('success', message);
      await load();
    } catch (error) {
      context.notify('danger', `Failed to ${command} ${service}`, String(error));
    }
  };

  return (
    <Card>
      <CardTitle>Service control</CardTitle>
      <CardBody>
        {['postfix', 'dovecot'].map((service) => {
          const status = services[service] || { active: 'unknown', enabled: 'unknown' };
          return (
            <DescriptionList key={service} isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>{service}</DescriptionListTerm>
                <DescriptionListDescription>
                  <Label color={status.active === 'active' ? 'green' : 'red'}>{status.active}</Label>{' '}
                  <Button variant="secondary" onClick={() => void action(service, status.active === 'active' ? 'stop' : 'start', `${service} toggled`)}>
                    {status.active === 'active' ? 'Stop' : 'Start'}
                  </Button>{' '}
                  <Button variant="secondary" onClick={() => void action(service, 'restart', `${service} restarted`)}>Restart</Button>{' '}
                  <Switch
                    id={`${service}-enable`}
                    label="Enabled"
                    labelOff="Disabled"
                    isChecked={status.enabled === 'enabled'}
                    onChange={(_event, checked) => void action(service, checked ? 'enable' : 'disable', `${service} boot setting updated`)}
                  />
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          );
        })}
      </CardBody>
    </Card>
  );
}
