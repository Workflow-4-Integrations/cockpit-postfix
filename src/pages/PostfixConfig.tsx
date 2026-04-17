import React from 'react';
import { Alert } from '@patternfly/react-core/dist/esm/components/Alert/index.js';
import { Button } from '@patternfly/react-core/dist/esm/components/Button/index.js';
import { Form, FormGroup } from '@patternfly/react-core/dist/esm/components/Form/index.js';
import { TextInput } from '@patternfly/react-core/dist/esm/components/TextInput/index.js';
import { FormSelect, FormSelectOption } from '@patternfly/react-core/dist/esm/components/FormSelect/index.js';
import { Switch } from '@patternfly/react-core/dist/esm/components/Switch/index.js';
import { Tabs, Tab, TabTitleText } from '@patternfly/react-core/dist/esm/components/Tabs/index.js';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table/dist/esm/components/Table/index.js';
import { SearchInput } from '@patternfly/react-core/dist/esm/components/SearchInput/index.js';
import type { PageProps } from '../types';

const SECTIONS: Array<{ id: string; title: string; fields: string[] }> = [
  { id: 'general', title: 'General', fields: ['myhostname', 'mydomain', 'mydestination', 'compatibility_level'] },
  { id: 'network', title: 'Network', fields: ['inet_interfaces', 'inet_protocols', 'mynetworks', 'relayhost'] },
  { id: 'tls', title: 'TLS', fields: ['smtpd_tls_security_level', 'smtpd_tls_cert_file', 'smtpd_tls_key_file'] },
  { id: 'sasl', title: 'SASL', fields: ['smtpd_sasl_auth_enable', 'smtpd_sasl_type', 'smtpd_sasl_path'] },
  { id: 'virtual', title: 'Virtual', fields: ['virtual_mailbox_domains', 'virtual_mailbox_maps', 'virtual_alias_maps'] },
  { id: 'restrictions', title: 'Restrictions', fields: ['smtpd_recipient_restrictions', 'smtpd_relay_restrictions'] }
];

const BOOLEAN_FIELDS = new Set(['smtpd_sasl_auth_enable']);
const ENUM_FIELDS: Record<string, string[]> = {
  inet_protocols: ['all', 'ipv4', 'ipv6'],
  smtpd_tls_security_level: ['none', 'may', 'encrypt']
};

interface ConfigState {
  params: Record<string, string>;
  defaults: Record<string, string>;
}

export function PostfixConfigPage({ context }: PageProps): React.JSX.Element {
  const [activeTab, setActiveTab] = React.useState('general');
  const [config, setConfig] = React.useState<ConfigState>({ params: {}, defaults: {} });
  const [pending, setPending] = React.useState(false);
  const [rawSearch, setRawSearch] = React.useState('');
  const [masterRows, setMasterRows] = React.useState<Array<Record<string, string>>>([]);

  const load = React.useCallback(async (showAll = false) => {
    try {
      const output = await context.runHelper('postfix-config-get.sh', [showAll ? '--all' : '--non-default']);
      const parsed = JSON.parse(output || '{}');
      setConfig({ params: parsed.params || {}, defaults: parsed.defaults || {} });
    } catch (error) {
      context.notify('danger', 'Failed to load Postfix config', String(error));
    }
  }, [context]);

  const loadMaster = React.useCallback(async () => {
    try {
      const output = await context.runHelper('postfix-master-get.sh');
      setMasterRows(JSON.parse(output || '[]'));
    } catch (error) {
      context.notify('danger', 'Failed to load master.cf', String(error));
    }
  }, [context]);

  React.useEffect(() => {
    void load();
    void loadMaster();
  }, [load, loadMaster]);

  const saveFields = async (payload: Record<string, string>) => {
    try {
      await context.runHelper('postfix-config-set.sh', ['--json', JSON.stringify(payload)]);
      setPending(true);
      context.notify('success', 'Configuration saved');
      await load();
    } catch (error) {
      context.notify('danger', 'Failed to save configuration', String(error));
    }
  };

  const validateConfig = async (reload = false) => {
    try {
      await context.runHelper('postfix-check.sh', reload ? ['--reload'] : []);
      context.notify('success', reload ? 'Postfix reloaded' : 'Configuration validated');
      if (reload) {
        setPending(false);
      }
    } catch (error) {
      context.notify('danger', 'Validation failed', String(error));
    }
  };

  const saveMaster = async () => {
    try {
      await context.runHelper('postfix-master-set.sh', ['--json', JSON.stringify(masterRows)]);
      setPending(true);
      context.notify('success', 'master.cf updated');
    } catch (error) {
      context.notify('danger', 'Failed to update master.cf', String(error));
    }
  };

  const section = SECTIONS.find((entry) => entry.id === activeTab);
  const rawRows = Object.entries(config.params).filter(([key, value]) => (`${key} ${value}`).toLowerCase().includes(rawSearch.toLowerCase()));

  return (
    <>
      {pending && (
        <Alert variant="warning" title="Pending configuration changes" actionLinks={<><Button variant="link" onClick={() => void validateConfig(false)}>Validate</Button><Button variant="link" onClick={() => void validateConfig(true)}>Reload Postfix</Button></>} />
      )}
      <Tabs activeKey={activeTab} onSelect={(_event, key) => setActiveTab(String(key))}>
        {SECTIONS.map((entry) => <Tab key={entry.id} eventKey={entry.id} title={<TabTitleText>{entry.title}</TabTitleText>} />)}
        <Tab eventKey="master" title={<TabTitleText>Master.cf</TabTitleText>} />
        <Tab eventKey="raw" title={<TabTitleText>Raw</TabTitleText>} />
      </Tabs>

      {section && (
        <Form>
          {section.fields.map((field) => {
            const value = config.params[field] ?? '';
            if (BOOLEAN_FIELDS.has(field)) {
              const enabled = ['yes', 'true', '1'].includes(String(value).toLowerCase());
              return (
                <FormGroup key={field} label={field} fieldId={field}>
                  <Switch id={field} isChecked={enabled} onChange={(_event, checked) => setConfig((prev) => ({ ...prev, params: { ...prev.params, [field]: checked ? 'yes' : 'no' } }))} />
                </FormGroup>
              );
            }
            if (ENUM_FIELDS[field]) {
              return (
                <FormGroup key={field} label={field} fieldId={field}>
                  <FormSelect value={value} onChange={(_event, next) => setConfig((prev) => ({ ...prev, params: { ...prev.params, [field]: String(next) } }))}>
                    {ENUM_FIELDS[field].map((option) => <FormSelectOption key={option} value={option} label={option} />)}
                  </FormSelect>
                </FormGroup>
              );
            }
            return (
              <FormGroup key={field} label={field} fieldId={field}>
                <TextInput id={field} value={value} onChange={(_event, next) => setConfig((prev) => ({ ...prev, params: { ...prev.params, [field]: next } }))} />
              </FormGroup>
            );
          })}
          <Button variant="primary" onClick={() => void saveFields(Object.fromEntries(section.fields.map((field) => [field, config.params[field] ?? ''])))}>Save</Button>
        </Form>
      )}

      {activeTab === 'master' && (
        <>
          <Button variant="primary" onClick={() => setMasterRows((prev) => [...prev, { service: '', type: 'unix', private: '-', unpriv: '-', chroot: '-', wakeup: '-', maxproc: '-', command: '' }])}>Add row</Button>{' '}
          <Button variant="secondary" onClick={() => void saveMaster()}>Save master.cf</Button>
          <Table aria-label="Master table">
            <Thead><Tr><Th>Service</Th><Th>Type</Th><Th>Command</Th><Th>Actions</Th></Tr></Thead>
            <Tbody>
              {masterRows.map((row, index) => (
                <Tr key={`${row.service}-${index}`}>
                  <Td><TextInput id={`service-${index}`} value={row.service || ''} onChange={(_event, value) => setMasterRows((prev) => prev.map((entry, idx) => idx === index ? { ...entry, service: value } : entry))} /></Td>
                  <Td><TextInput id={`type-${index}`} value={row.type || ''} onChange={(_event, value) => setMasterRows((prev) => prev.map((entry, idx) => idx === index ? { ...entry, type: value } : entry))} /></Td>
                  <Td><TextInput id={`command-${index}`} value={row.command || ''} onChange={(_event, value) => setMasterRows((prev) => prev.map((entry, idx) => idx === index ? { ...entry, command: value } : entry))} /></Td>
                  <Td><Button variant="link" isDanger onClick={() => setMasterRows((prev) => prev.filter((_entry, idx) => idx !== index))}>Remove</Button></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      )}

      {activeTab === 'raw' && (
        <>
          <SearchInput value={rawSearch} onChange={(_event, value) => setRawSearch(value)} onClear={() => setRawSearch('')} />
          <Button variant="secondary" onClick={() => void load(true)}>Show all</Button>{' '}
          <Button variant="secondary" onClick={() => void load(false)}>Show non-default</Button>
          <Table aria-label="Raw config table">
            <Thead><Tr><Th>Parameter</Th><Th>Value</Th><Th>Default</Th></Tr></Thead>
            <Tbody>
              {rawRows.map(([key, value]) => (
                <Tr key={key}>
                  <Td>{key}</Td>
                  <Td>{value}</Td>
                  <Td>{config.defaults[key] || '-'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      )}
    </>
  );
}
