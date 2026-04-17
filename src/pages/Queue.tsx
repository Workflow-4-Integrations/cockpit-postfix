import React from 'react';
import { Button } from '@patternfly/react-core/dist/esm/components/Button/index.js';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core/dist/esm/components/EmptyState/index.js';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table/dist/esm/components/Table/index.js';
import { DataToolbar } from '../components/DataToolbar';
import type { PageProps } from '../types';

interface QueueItem {
  id: string;
  sender: string;
  recipients: string[];
  size: string;
}

function parseQueue(output: string): QueueItem[] {
  const rows: QueueItem[] = [];
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    try {
      const entry = JSON.parse(trimmed) as {
        queue_id?: string;
        sender?: string;
        message_size?: string | number;
        recipients?: Array<{ address?: string } | string>;
      };
      rows.push({
        id: entry.queue_id || '',
        sender: entry.sender || '',
        size: String(entry.message_size ?? ''),
        recipients: (entry.recipients || []).map((recipient) => {
          if (typeof recipient === 'string') {
            return recipient;
          }
          return recipient.address || '';
        }).filter(Boolean)
      });
    } catch {
      // Ignore malformed lines
    }
  }
  return rows;
}

export function QueuePage({ context }: PageProps): React.JSX.Element {
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);

  const load = React.useCallback(async () => {
    try {
      const output = await context.runCommand(['postqueue', '-j'], { superuser: 'try', err: 'ignore' });
      setQueue(parseQueue(output));
    } catch (error) {
      context.notify('danger', 'Failed to load queue', String(error));
    }
  }, [context]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = queue.filter((entry) => {
    const text = `${entry.id} ${entry.sender} ${(entry.recipients || []).join(' ')}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });
  const start = (page - 1) * perPage;
  const rows = filtered.slice(start, start + perPage);

  const queueAction = async (id: string, flag: '-h' | '-H' | '-d', title: string) => {
    try {
      await context.runCommand(['postsuper', flag, id], { superuser: 'require', err: 'message' });
      context.notify('success', title);
      await load();
    } catch (error) {
      context.notify('danger', title, String(error));
    }
  };

  const flushQueue = async () => {
    try {
      await context.runCommand(['postqueue', '-f'], { superuser: 'try', err: 'message' });
      context.notify('success', 'Queue flush requested');
      await load();
    } catch (error) {
      context.notify('danger', 'Failed to flush queue', String(error));
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
      />
      <Button variant="secondary" onClick={() => void flushQueue()}>Flush queue</Button>
      {filtered.length === 0 ? (
        <EmptyState headingLevel="h2" titleText="Queue is empty"><EmptyStateBody>No queued messages found.</EmptyStateBody></EmptyState>
      ) : (
        <Table aria-label="Queue table">
          <Thead><Tr><Th>ID</Th><Th>Sender</Th><Th>Recipients</Th><Th>Size</Th><Th>Actions</Th></Tr></Thead>
          <Tbody>
            {rows.map((entry) => (
              <Tr key={entry.id}>
                <Td dataLabel="ID">{entry.id}</Td>
                <Td dataLabel="Sender">{entry.sender}</Td>
                <Td dataLabel="Recipients">{(entry.recipients || []).join(', ')}</Td>
                <Td dataLabel="Size">{entry.size}</Td>
                <Td dataLabel="Actions">
                  <Button variant="link" onClick={() => void queueAction(entry.id, '-h', `Held ${entry.id}`)}>Hold</Button>
                  <Button variant="link" onClick={() => void queueAction(entry.id, '-H', `Released ${entry.id}`)}>Release</Button>
                  <Button variant="link" isDanger onClick={() => void queueAction(entry.id, '-d', `Deleted ${entry.id}`)}>Delete</Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );
}
