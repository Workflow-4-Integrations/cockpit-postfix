import React from 'react';
import { Badge } from '@patternfly/react-core/dist/esm/components/Badge/index.js';
import { Button } from '@patternfly/react-core/dist/esm/components/Button/index.js';
import { Modal } from '@patternfly/react-core/dist/esm/components/Modal/index.js';
import { Form, FormGroup } from '@patternfly/react-core/dist/esm/components/Form/index.js';
import { TextInput } from '@patternfly/react-core/dist/esm/components/TextInput/index.js';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core/dist/esm/components/EmptyState/index.js';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table/dist/esm/components/Table/index.js';
import { DataToolbar } from '../components/DataToolbar';
import type { PageProps } from '../types';

interface MailboxRow {
  email: string;
  used: number;
  total: number;
}

export function MailboxesPage({ context }: PageProps): React.JSX.Element {
  const [mailboxes, setMailboxes] = React.useState<MailboxRow[]>([]);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [isOpen, setIsOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      const [mailboxOutput, quotaOutput] = await Promise.all([
        context.runHelper('mailbox-list.sh'),
        context.runHelper('mailbox-quota.sh')
      ]);
      const mailboxList = mailboxOutput.split('\n').map((entry) => entry.trim()).filter(Boolean);
      const quotaRows = JSON.parse(quotaOutput || '[]') as MailboxRow[];
      const quotaByMailbox = new Map(quotaRows.map((entry) => [entry.email, entry]));
      setMailboxes(mailboxList.map((item) => quotaByMailbox.get(item) ?? { email: item, used: 0, total: 0 }));
    } catch (error) {
      context.notify('danger', 'Failed to load mailboxes', String(error));
    }
  }, [context]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = mailboxes.filter((entry) => entry.email.toLowerCase().includes(search.toLowerCase()));
  const start = (page - 1) * perPage;
  const rows = filtered.slice(start, start + perPage);

  const addMailbox = async () => {
    try {
      await context.runHelper('mailbox-add.sh', [email, password]);
      setEmail('');
      setPassword('');
      setIsOpen(false);
      context.notify('success', `Added mailbox ${email}`);
      await load();
    } catch (error) {
      context.notify('danger', 'Failed to add mailbox', String(error));
    }
  };

  const deleteMailbox = async (value: string) => {
    try {
      await context.runHelper('mailbox-remove.sh', [value, '--purge']);
      context.notify('success', `Deleted mailbox ${value}`);
      await load();
    } catch (error) {
      context.notify('danger', 'Failed to delete mailbox', String(error));
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
        addLabel="Add mailbox"
        onAdd={() => setIsOpen(true)}
      />
      {filtered.length === 0 ? (
        <EmptyState headingLevel="h2" titleText="No mailboxes"><EmptyStateBody>Create your first mailbox account.</EmptyStateBody></EmptyState>
      ) : (
        <Table aria-label="Mailboxes table">
          <Thead><Tr><Th>Email</Th><Th>Quota</Th><Th>Actions</Th></Tr></Thead>
          <Tbody>
            {rows.map((entry) => (
              <Tr key={entry.email}>
                <Td dataLabel="Email">{entry.email}</Td>
                <Td dataLabel="Quota"><Badge>{entry.used}/{entry.total || '∞'}</Badge></Td>
                <Td dataLabel="Actions">
                  <Button variant="link" isDanger onClick={() => void deleteMailbox(entry.email)}>Delete</Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
      <Modal
        title="Add mailbox"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        actions={[
          <Button key="add" variant="primary" onClick={() => void addMailbox()} isDisabled={!email.trim() || !password}>Add</Button>,
          <Button key="cancel" variant="link" onClick={() => setIsOpen(false)}>Cancel</Button>
        ]}
      >
        <Form>
          <FormGroup label="Email" fieldId="email-input">
            <TextInput id="email-input" value={email} onChange={(_event, value) => setEmail(value)} />
          </FormGroup>
          <FormGroup label="Password" fieldId="password-input">
            <TextInput id="password-input" type="password" value={password} onChange={(_event, value) => setPassword(value)} />
          </FormGroup>
        </Form>
      </Modal>
    </>
  );
}
