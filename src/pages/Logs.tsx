import React from 'react';
import cockpit from 'cockpit';
import { Button } from '@patternfly/react-core/dist/esm/components/Button/index.js';
import { Card, CardBody, CardTitle } from '@patternfly/react-core/dist/esm/components/Card/index.js';
import { Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core/dist/esm/components/Toolbar/index.js';
import { SearchInput } from '@patternfly/react-core/dist/esm/components/SearchInput/index.js';
import { FormSelect, FormSelectOption } from '@patternfly/react-core/dist/esm/components/FormSelect/index.js';
import type { PageProps } from '../types';

interface CockpitStreamProcess {
  stream: (callback: (chunk: string) => void) => void;
  catch: (callback: (error: unknown) => void) => void;
  close?: () => void;
}

export function LogsPage({ context }: PageProps): React.JSX.Element {
  const [query, setQuery] = React.useState('');
  const [level, setLevel] = React.useState('all');
  const [paused, setPaused] = React.useState(false);
  const [lines, setLines] = React.useState<string[]>([]);
  const procRef = React.useRef<CockpitStreamProcess | null>(null);

  React.useEffect(() => {
    const journalProcess = cockpit.spawn(['journalctl', '-u', 'postfix', '-f', '--no-pager'], { superuser: 'try', err: 'message' }) as unknown as CockpitStreamProcess;
    procRef.current = journalProcess;
    journalProcess.stream((chunk: string) => {
      if (paused) {
        return;
      }
      setLines((prev) => [...prev, ...chunk.split('\n').filter(Boolean)].slice(-2000));
    });
    journalProcess.catch((error: unknown) => context.notify('danger', 'Log stream failed', String(error)));

    return () => {
      if (procRef.current?.close) {
        procRef.current.close();
      }
    };
  }, [context, paused]);

  const filtered = lines.filter((line) => {
    const lower = line.toLowerCase();
    if (level === 'error' && !lower.includes('error') && !lower.includes('fatal')) {
      return false;
    }
    if (level === 'warning' && !(lower.includes('warn') || lower.includes('error') || lower.includes('fatal'))) {
      return false;
    }
    return lower.includes(query.toLowerCase());
  });

  const download = () => {
    const blob = new Blob([filtered.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'postfix.log';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardTitle>Postfix logs</CardTitle>
      <CardBody>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem variant="search-filter"><SearchInput value={query} onChange={(_event, value) => setQuery(value)} onClear={() => setQuery('')} /></ToolbarItem>
            <ToolbarItem>
              <FormSelect value={level} onChange={(_event, value) => setLevel(String(value))}>
                <FormSelectOption value="all" label="All" />
                <FormSelectOption value="warning" label="Warnings + errors" />
                <FormSelectOption value="error" label="Errors only" />
              </FormSelect>
            </ToolbarItem>
            <ToolbarItem><Button variant="secondary" onClick={() => setPaused((prev) => !prev)}>{paused ? 'Resume' : 'Pause'}</Button></ToolbarItem>
            <ToolbarItem><Button variant="secondary" onClick={download}>Download</Button></ToolbarItem>
          </ToolbarContent>
        </Toolbar>
        <pre className="cp-log-view cp-mono">{filtered.join('\n')}</pre>
      </CardBody>
    </Card>
  );
}
