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

export function QueuePage({ context }: PageProps): React.JSX.Element {
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);

  const load = React.useCallback(async () => {
    try {
      const output = await context.runHelper('queue-list.sh');
      setQueue(JSON.parse(output || '[]'));
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

  const queueAction = async (script: string, id: string, title: string) => {
    try {
      await context.runHelper(script, [id]);
      context.notify('success', title);
      await load();
    } catch (error) {
      context.notify('danger', title, String(error));
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
                  <Button variant="link" onClick={() => void queueAction('queue-hold.sh', entry.id, `Held ${entry.id}`)}>Hold</Button>
                  <Button variant="link" onClick={() => void queueAction('queue-release.sh', entry.id, `Released ${entry.id}`)}>Release</Button>
                  <Button variant="link" isDanger onClick={() => void queueAction('queue-delete.sh', entry.id, `Deleted ${entry.id}`)}>Delete</Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );
}
