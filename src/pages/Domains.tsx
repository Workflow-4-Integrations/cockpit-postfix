import React from 'react';
import { Button } from '@patternfly/react-core/dist/esm/components/Button/index.js';
import { Modal } from '@patternfly/react-core/dist/esm/components/Modal/index.js';
import { Form, FormGroup } from '@patternfly/react-core/dist/esm/components/Form/index.js';
import { TextInput } from '@patternfly/react-core/dist/esm/components/TextInput/index.js';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core/dist/esm/components/EmptyState/index.js';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table/dist/esm/components/Table/index.js';
import { DataToolbar } from '../components/DataToolbar';
import type { PageProps } from '../types';

const DOMAINS_FILE = '/etc/postfix/virtual_mailbox_domains';

export function DomainsPage({ context }: PageProps): React.JSX.Element {
  const [domains, setDomains] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [isOpen, setIsOpen] = React.useState(false);
  const [domain, setDomain] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      const output = await context.runCommand([
        'bash', '-lc',
        'if [[ -f "$1" ]]; then grep -Ev "^\\s*($|#)" "$1" | sed "s/[[:space:]]*$//"; fi',
        '--',
        DOMAINS_FILE
      ], { err: 'ignore' });
      setDomains(output.split('\n').map((entry) => entry.trim()).filter(Boolean));
    } catch (error) {
      context.notify('danger', 'Failed to load domains', String(error));
    }
  }, [context]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = domains.filter((entry) => entry.toLowerCase().includes(search.toLowerCase()));
  const start = (page - 1) * perPage;
  const rows = filtered.slice(start, start + perPage);

  const addDomain = async () => {
    try {
      await context.runCommand([
        'bash', '-lc',
        'touch "$1"; if grep -Fqx "$2" "$1"; then echo "Domain already exists: $2" >&2; exit 1; fi; printf "%s\\n" "$2" >> "$1"; postmap "$1"',
        '--',
        DOMAINS_FILE,
        domain.trim()
      ], { superuser: 'require', err: 'message' });
      setDomain('');
      setIsOpen(false);
      context.notify('success', `Added domain ${domain}`);
      await load();
    } catch (error) {
      context.notify('danger', 'Failed to add domain', String(error));
    }
  };

  const deleteDomain = async (value: string) => {
    try {
      await context.runCommand([
        'bash', '-lc',
        'if [[ -f "$1" ]]; then tmp="$(mktemp)"; grep -Fvx "$2" "$1" > "$tmp" || true; mv "$tmp" "$1"; postmap "$1"; fi',
        '--',
        DOMAINS_FILE,
        value
      ], { superuser: 'require', err: 'message' });
      context.notify('success', `Deleted domain ${value}`);
      await load();
    } catch (error) {
      context.notify('danger', 'Failed to delete domain', String(error));
    }
  };

  return (
    <>
      <DataToolbar
        search={search}
        setSearch={setSearch}
        itemCount={filtered.length}
        page={page}
        perPage={perPage}
        setPage={setPage}
        setPerPage={setPerPage}
        addLabel="Add domain"
        onAdd={() => setIsOpen(true)}
      />
      {filtered.length === 0 ? (
        <EmptyState headingLevel="h2" titleText="No domains"><EmptyStateBody>Add your first virtual domain.</EmptyStateBody></EmptyState>
      ) : (
        <Table aria-label="Domains table">
          <Thead><Tr><Th>Domain</Th><Th>Actions</Th></Tr></Thead>
          <Tbody>
            {rows.map((entry) => (
              <Tr key={entry}>
                <Td dataLabel="Domain">{entry}</Td>
                <Td dataLabel="Actions">
                  <Button variant="link" isDanger onClick={() => void deleteDomain(entry)}>Delete</Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
      <Modal
        title="Add domain"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        actions={[
          <Button key="add" variant="primary" onClick={() => void addDomain()} isDisabled={!domain.trim()}>Add</Button>,
          <Button key="cancel" variant="link" onClick={() => setIsOpen(false)}>Cancel</Button>
        ]}
      >
        <Form>
          <FormGroup label="Domain" fieldId="domain-input">
            <TextInput id="domain-input" value={domain} onChange={(_event, value) => setDomain(value)} />
          </FormGroup>
        </Form>
      </Modal>
    </>
  );
}
