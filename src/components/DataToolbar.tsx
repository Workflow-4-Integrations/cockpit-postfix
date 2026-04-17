import React from 'react';
import { Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core/dist/esm/components/Toolbar/index.js';
import { SearchInput } from '@patternfly/react-core/dist/esm/components/SearchInput/index.js';
import { Pagination } from '@patternfly/react-core/dist/esm/components/Pagination/index.js';
import { Button } from '@patternfly/react-core/dist/esm/components/Button/index.js';

interface Props {
  search: string;
  setSearch: (value: string) => void;
  itemCount: number;
  page: number;
  perPage: number;
  setPage: (value: number) => void;
  setPerPage: (value: number) => void;
  addLabel?: string;
  onAdd?: () => void;
}

export function DataToolbar({
  search,
  setSearch,
  itemCount,
  page,
  perPage,
  setPage,
  setPerPage,
  addLabel,
  onAdd
}: Props): React.JSX.Element {
  return (
    <Toolbar>
      <ToolbarContent>
        <ToolbarItem variant="search-filter">
          <SearchInput value={search} onChange={(_event, value) => setSearch(value)} onClear={() => setSearch('')} />
        </ToolbarItem>
        {onAdd && addLabel && (
          <ToolbarItem>
            <Button variant="primary" onClick={onAdd}>{addLabel}</Button>
          </ToolbarItem>
        )}
        <ToolbarItem className="cp-toolbar-actions">
          <Pagination
            itemCount={itemCount}
            page={page}
            perPage={perPage}
            onSetPage={(_event, value) => setPage(value)}
            onPerPageSelect={(_event, value) => {
              setPerPage(value);
              setPage(1);
            }}
            isCompact
          />
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
}
