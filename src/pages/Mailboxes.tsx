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

const MAILBOX_MAP = '/etc/postfix/virtual_mailbox_maps';
const DOVECOT_USERS = '/etc/dovecot/users';
const VMAIL_ROOT = '/var/vmail';
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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
      const mailboxOutput = await context.runCommand([
        'bash', '-lc',
        'if [[ -f "$1" ]]; then grep -Ev "^\\s*($|#)" "$1" | cut -f1; fi',
        '--',
        MAILBOX_MAP
      ], { err: 'ignore' });
      const mailboxList = mailboxOutput.split('\n').map((entry) => entry.trim()).filter(Boolean);
      const quotaRows = await Promise.all(mailboxList.map(async (entry) => {
        try {
          const quotaOutput = await context.runCommand([
            'bash', '-lc',
            'out="$(doveadm quota get -u "$1" 2>/dev/null || true)"; used="$(echo "$out" | awk "/STORAGE|storage/ {print \$2; exit}")"; total="$(echo "$out" | awk "/STORAGE|storage/ {print \$3; exit}")"; printf "%s\\t%s\\n" "${used:-0}" "${total:-0}"',
            '--',
            entry
          ], { superuser: 'try', err: 'ignore' });
          const [usedRaw, totalRaw] = quotaOutput.trim().split('\t');
          return {
            email: entry,
            used: Number.parseInt(usedRaw || '0', 10) || 0,
            total: Number.parseInt(totalRaw || '0', 10) || 0,
          };
        } catch {
          return { email: entry, used: 0, total: 0 };
        }
      }));
      setMailboxes(quotaRows);
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
      const mailboxEmail = email.trim();
      if (!EMAIL_PATTERN.test(mailboxEmail)) {
        throw new Error('Invalid mailbox address');
      }
      const passwordHash = await context.runCommand([
        'bash', '-lc',
        'printf "%s\\n%s\\n" "$1" "$1" | doveadm pw -s SHA512-CRYPT',
        '--',
        password
      ], { superuser: 'require', err: 'message' });
      await context.runCommand([
        'bash', '-lc',
        'touch "$1" "$2"; local_part="${3%@*}"; domain_part="${3#*@}"; mailbox_path="${domain_part}/${local_part}/"; mailbox_prefix="$(printf "%s\\t" "$3")"; users_prefix="$(printf "%s:" "$3")"; tmp_map="$(mktemp)"; grep -Fv "$mailbox_prefix" "$1" > "$tmp_map" || true; printf "%s\\t%s\\n" "$3" "$mailbox_path" >> "$tmp_map"; mv "$tmp_map" "$1"; tmp_users="$(mktemp)"; grep -Fv "$users_prefix" "$2" > "$tmp_users" || true; printf "%s:%s::::::\\n" "$3" "$4" >> "$tmp_users"; mv "$tmp_users" "$2"; postmap "$1"',
        '--',
        MAILBOX_MAP,
        DOVECOT_USERS,
        mailboxEmail,
        passwordHash.trim()
      ], { superuser: 'require', err: 'message' });
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
      if (!EMAIL_PATTERN.test(value)) {
        throw new Error('Invalid mailbox address');
      }
      await context.runCommand([
        'bash', '-lc',
        'mailbox_prefix="$(printf "%s\\t" "$4")"; users_prefix="$(printf "%s:" "$4")"; if [[ -f "$1" ]]; then tmp_map="$(mktemp)"; grep -Fv "$mailbox_prefix" "$1" > "$tmp_map" || true; mv "$tmp_map" "$1"; postmap "$1"; fi; if [[ -f "$2" ]]; then tmp_users="$(mktemp)"; grep -Fv "$users_prefix" "$2" > "$tmp_users" || true; mv "$tmp_users" "$2"; fi; if [[ "$3" == "--purge" ]]; then local_part="${4%@*}"; domain_part="${4#*@}"; if [[ "$local_part" =~ ^[A-Za-z0-9._+-]+$ && "$domain_part" =~ ^[A-Za-z0-9.-]+$ ]]; then rm -rf "${5}/${domain_part}/${local_part}"; fi; fi',
        '--',
        MAILBOX_MAP,
        DOVECOT_USERS,
        '--purge',
        value,
        VMAIL_ROOT
      ], { superuser: 'require', err: 'message' });
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
