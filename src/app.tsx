import React, { useState } from 'react';
import cockpit from 'cockpit';
import {
  Panel, PanelMain, PanelMainBody, PanelHeader
} from '@patternfly/react-core/dist/esm/components/Panel/index.js';
import { Title } from '@patternfly/react-core/dist/esm/components/Title/index.js';
import { Tabs, Tab, TabTitleText } from '@patternfly/react-core/dist/esm/components/Tabs/index.js';
import { Alert, AlertActionCloseButton, AlertGroup } from '@patternfly/react-core/dist/esm/components/Alert/index.js';

import { DashboardPage } from './pages/Dashboard';
import { DomainsPage } from './pages/Domains';
import { MailboxesPage } from './pages/Mailboxes';
import { AliasesPage } from './pages/Aliases';
import { PostfixConfigPage } from './pages/PostfixConfig';
import { QueuePage } from './pages/Queue';
import { LogsPage } from './pages/Logs';
import { ServicesPage } from './pages/Services';
import type { AlertVariant, AppContext } from './types';

const _ = cockpit.gettext;

interface Toast {
  id: number;
  title: string;
  detail?: string;
  variant: AlertVariant;
}

export function Application(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<string | number>('dashboard');
  const [alerts, setAlerts] = useState<Toast[]>([]);

  const notify = React.useCallback((variant: AlertVariant, title: string, detail = '') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setAlerts((prev) => [...prev, { id, variant, title, detail }]);
  }, []);

  const runCommand = React.useCallback((command: string[], options: Record<string, unknown> = {}) => {
    return cockpit.spawn(command, {
      superuser: 'try',
      err: 'message',
      ...options
    }) as Promise<string>;
  }, []);

  const context: AppContext = React.useMemo(() => ({ runCommand, notify }), [notify, runCommand]);

  const renderPage = () => {
    switch (activeTab) {
      case 'domains': return <DomainsPage context={context} />;
      case 'mailboxes': return <MailboxesPage context={context} />;
      case 'aliases': return <AliasesPage context={context} />;
      case 'postfix-config': return <PostfixConfigPage context={context} />;
      case 'queue': return <QueuePage context={context} />;
      case 'logs': return <LogsPage context={context} />;
      case 'services': return <ServicesPage context={context} />;
      case 'dashboard':
      default: return <DashboardPage context={context} />;
    }
  };

  return (
    <>
      <Panel>
        <PanelHeader>
          <Title headingLevel="h1" size="lg">{_("Mail Server")}</Title>
        </PanelHeader>
        <PanelMain>
          <PanelMainBody>
            <Tabs activeKey={activeTab} onSelect={(_event, tabKey) => setActiveTab(tabKey)} isFilled>
              <Tab eventKey="dashboard" title={<TabTitleText>{_("Dashboard")}</TabTitleText>} />
              <Tab eventKey="domains" title={<TabTitleText>{_("Domains")}</TabTitleText>} />
              <Tab eventKey="mailboxes" title={<TabTitleText>{_("Mailboxes")}</TabTitleText>} />
              <Tab eventKey="aliases" title={<TabTitleText>{_("Aliases")}</TabTitleText>} />
              <Tab eventKey="postfix-config" title={<TabTitleText>{_("Configuration")}</TabTitleText>} />
              <Tab eventKey="queue" title={<TabTitleText>{_("Queue")}</TabTitleText>} />
              <Tab eventKey="logs" title={<TabTitleText>{_("Logs")}</TabTitleText>} />
              <Tab eventKey="services" title={<TabTitleText>{_("Services")}</TabTitleText>} />
            </Tabs>
            <div style={{ paddingTop: '1rem' }}>
              {renderPage()}
            </div>
          </PanelMainBody>
        </PanelMain>
      </Panel>
      <AlertGroup isToast isLiveRegion>
        {alerts.map((alert) => (
          <Alert
            key={alert.id}
            variant={alert.variant}
            title={alert.title}
            timeout={5000}
            actionClose={<AlertActionCloseButton onClose={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))} />}
          >
            {alert.detail}
          </Alert>
        ))}
      </AlertGroup>
    </>
  );
}
