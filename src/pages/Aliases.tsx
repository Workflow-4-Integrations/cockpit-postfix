import React from 'react';
import { Button } from '@patternfly/react-core/dist/esm/components/Button/index.js';
import { Modal } from '@patternfly/react-core/dist/esm/components/Modal/index.js';
import { Form, FormGroup } from '@patternfly/react-core/dist/esm/components/Form/index.js';
import { TextInput } from '@patternfly/react-core/dist/esm/components/TextInput/index.js';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core/dist/esm/components/EmptyState/index.js';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table/dist/esm/components/Table/index.js';
import { DataToolbar } from '../components/DataToolbar';
import type { PageProps } from '../types';

interface AliasRow {
  source: string;
  destination: string;
}

const ALIAS_FILE = '/etc/postfix/virtual_alias_maps';

export function AliasesPage({ context }: PageProps): React.JSX.Element {
  const [aliases, setAliases] = React.useState<AliasRow[]>([]);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [isOpen, setIsOpen] = React.useState(false);
  const [source, setSource] = React.useState('');
  const [destination, setDestination] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      const output = await context.runCommand([
        'bash', '-lc',
        'if [[ -f "$1" ]]; then grep -Ev "^\\s*($|#)" "$1" | cut -f1,2; fi',
        '--',
        ALIAS_FILE
      ], { err: 'ignore' });
      const rows = output
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [itemSource, itemDestination = ''] = line.split('\t');
          return { source: itemSource, destination: itemDestination };
        });
      setAliases(rows);
    } catch (error) {
      context.notify('danger', 'Failed to load aliases', String(error));
    }
  }, [context]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = aliases.filter((entry) =>
    entry.source.toLowerCase().includes(search.toLowerCase()) || entry.destination.toLowerCase().includes(search.toLowerCase())
  );
  const start = (page - 1) * perPage;
  const rows = filtered.slice(start, start + perPage);

  const addAlias = async () => {
    try {
      await context.runCommand([
        'bash', '-lc',
        'touch "$1"; prefix="$(printf "%s\\t" "$2")"; if grep -Fq "$prefix" "$1"; then echo "Alias already exists: $2" >&2; exit 1; fi; printf "%s\\t%s\\n" "$2" "$3" >> "$1"; postmap "$1"',
        '--',
        ALIAS_FILE,
        source.trim(),
        destination.trim()
      ], { superuser: 'require', err: 'message' });
      setSource('');
      setDestination('');
      setIsOpen(false);
      context.notify('success', `Added alias ${source}`);
      await load();
    } catch (error) {
      context.notify('danger', 'Failed to add alias', String(error));
    }
  };

  const deleteAlias = async (value: string) => {
    try {
      await context.runCommand([
        'bash', '-lc',
        'if [[ -f "$1" ]]; then tmp="$(mktemp)"; prefix="$(printf "%s\\t" "$2")"; grep -Fv "$prefix" "$1" > "$tmp" || true; mv "$tmp" "$1"; postmap "$1"; fi',
        '--',
        ALIAS_FILE,
        value
      ], { superuser: 'require', err: 'message' });
      context.notify('success', `Deleted alias ${value}`);
      await load();
    } catch (error) {
      context.notify('danger', 'Failed to delete alias', String(error));
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
        addLabel="Add alias"
        onAdd={() => setIsOpen(true)}
      />
      {filtered.length === 0 ? (
        <EmptyState headingLevel="h2" titleText="No aliases"><EmptyStateBody>Create your first alias mapping.</EmptyStateBody></EmptyState>
      ) : (
        <Table aria-label="Aliases table">
          <Thead><Tr><Th>Source</Th><Th>Destination</Th><Th>Actions</Th></Tr></Thead>
          <Tbody>
            {rows.map((entry) => (
              <Tr key={entry.source}>
                <Td dataLabel="Source">{entry.source}</Td>
                <Td dataLabel="Destination">{entry.destination}</Td>
                <Td dataLabel="Actions">
                  <Button variant="link" isDanger onClick={() => void deleteAlias(entry.source)}>Delete</Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
      <Modal
        title="Add alias"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        actions={[
          <Button key="add" variant="primary" onClick={() => void addAlias()} isDisabled={!source.trim() || !destination.trim()}>Add</Button>,
          <Button key="cancel" variant="link" onClick={() => setIsOpen(false)}>Cancel</Button>
        ]}
      >
        <Form>
          <FormGroup label="Source" fieldId="source-input">
            <TextInput id="source-input" value={source} onChange={(_event, value) => setSource(value)} />
          </FormGroup>
          <FormGroup label="Destination" fieldId="destination-input">
            <TextInput id="destination-input" value={destination} onChange={(_event, value) => setDestination(value)} />
          </FormGroup>
        </Form>
      </Modal>
    </>
  );
}
