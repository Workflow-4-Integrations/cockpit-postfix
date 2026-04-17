import React from 'react';
import cockpit from 'cockpit';
import { Page, PageSection, PageSidebar, PageSidebarBody } from '@patternfly/react-core/dist/esm/components/Page/index.js';
import { Nav, NavItem, NavList } from '@patternfly/react-core/dist/esm/components/Nav/index.js';
import { Alert, AlertActionCloseButton, AlertGroup } from '@patternfly/react-core/dist/esm/components/Alert/index.js';
import { CogIcon, EnvelopeIcon, UsersIcon, ListIcon, ServerIcon, StreamIcon, WrenchIcon } from '@patternfly/react-icons/dist/esm/icons';
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
const HELPER_ROOT = '/usr/local/lib/cockpit-postfix';

type PageKey = 'dashboard' | 'domains' | 'mailboxes' | 'aliases' | 'postfix-config' | 'queue' | 'logs' | 'services';

interface Toast {
  id: number;
  title: string;
  detail?: string;
  variant: AlertVariant;
}

export function Application(): React.JSX.Element {
  const [active, setActive] = React.useState<PageKey>('dashboard');
  const [alerts, setAlerts] = React.useState<Toast[]>([]);

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

  const runHelper = React.useCallback((script: string, args: string[] = []) => {
    return runCommand([`${HELPER_ROOT}/${script}`, ...args]);
  }, [runCommand]);

  const context: AppContext = React.useMemo(() => ({ runHelper, runCommand, notify }), [notify, runCommand, runHelper]);

  const renderPage = () => {
    switch (active) {
      case 'domains':
        return <DomainsPage context={context} />;
      case 'mailboxes':
        return <MailboxesPage context={context} />;
      case 'aliases':
        return <AliasesPage context={context} />;
      case 'postfix-config':
        return <PostfixConfigPage context={context} />;
      case 'queue':
        return <QueuePage context={context} />;
      case 'logs':
        return <LogsPage context={context} />;
      case 'services':
        return <ServicesPage context={context} />;
      case 'dashboard':
      default:
        return <DashboardPage context={context} />;
    }
  };

  const sidebar = (
    <PageSidebar isSidebarOpen className="cp-sidebar">
      <PageSidebarBody>
        <Nav theme="dark">
          <NavList>
            <NavItem itemId="dashboard" isActive={active === 'dashboard'} onClick={() => setActive('dashboard')}><WrenchIcon /> {_("Dashboard")}</NavItem>
            <NavItem itemId="domains" isActive={active === 'domains'} onClick={() => setActive('domains')}><EnvelopeIcon /> {_("Domains")}</NavItem>
            <NavItem itemId="mailboxes" isActive={active === 'mailboxes'} onClick={() => setActive('mailboxes')}><UsersIcon /> {_("Mailboxes")}</NavItem>
            <NavItem itemId="aliases" isActive={active === 'aliases'} onClick={() => setActive('aliases')}><ListIcon /> {_("Aliases")}</NavItem>
            <NavItem itemId="postfix-config" isActive={active === 'postfix-config'} onClick={() => setActive('postfix-config')}><CogIcon /> {_("Postfix Configuration")}</NavItem>
            <NavItem itemId="queue" isActive={active === 'queue'} onClick={() => setActive('queue')}><StreamIcon /> {_("Queue")}</NavItem>
            <NavItem itemId="logs" isActive={active === 'logs'} onClick={() => setActive('logs')}><ListIcon /> {_("Logs")}</NavItem>
            <NavItem itemId="services" isActive={active === 'services'} onClick={() => setActive('services')}><ServerIcon /> {_("Services")}</NavItem>
          </NavList>
        </Nav>
      </PageSidebarBody>
    </PageSidebar>
  );

  return (
    <>
      <Page sidebar={sidebar}>
        <PageSection hasBodyWrapper={false}>{renderPage()}</PageSection>
      </Page>
      <AlertGroup isToast isLiveRegion>
        {alerts.map((alert) => (
          <Alert
            key={alert.id}
            variant={alert.variant}
            title={alert.title}
            timeout={5000}
            actionClose={<AlertActionCloseButton onClose={() => setAlerts((prev) => prev.filter((entry) => entry.id !== alert.id))} />}
          >
            {alert.detail}
          </Alert>
        ))}
      </AlertGroup>
    </>
  );
}
