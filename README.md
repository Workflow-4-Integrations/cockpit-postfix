# cockpit-postfix

`cockpit-postfix` is a Cockpit plugin for administering a Postfix + Dovecot virtual mailbox server from a native Cockpit UI.

## Features

- Dashboard overview with service status cards, queue count, quick actions, recent logs, and system info
- Cockpit-style vertical sidebar navigation with breadcrumbs
- Domains, Mailboxes, Aliases, and Queue management with:
  - Search/filter
  - Sortable columns
  - Pagination (10/25/50/100)
  - Empty states
  - Bulk delete actions
  - Row kebab action menus
- Modal-driven add/edit/delete flows with confirmations
- Toast notifications for operation feedback
- Improved logs view with:
  - Color-coded severity
  - Search and level filters
  - Pause/resume streaming indicator
  - Download current log buffer
- Services tab with running/enabled status badges and quick toggles
- **Postfix Configuration** tab with:
  - Full sectioned parameter editing (General, Network, TLS, SASL, Virtual, Restrictions, Limits, Queue, Transport, Milter)
  - Ordered-list editing for SMTP restriction policies
  - TLS status indicator
  - `master.cf` table editor with add/edit/remove and syntax validation
  - Raw `postconf`/`postconf -n` view with search, inline edit, and per-parameter default display
  - Pending changes banner with validate/reload actions

## Helper scripts

New helper scripts are installed to `/usr/local/lib/cockpit-postfix/`:

- `dashboard-stats.sh`
- `mailbox-quota.sh`
- `postfix-config-get.sh`
- `postfix-config-set.sh`
- `postfix-master-get.sh`
- `postfix-master-set.sh`
- `postfix-check.sh`

## Prerequisites

- Cockpit installed and running
- Postfix installed
- Dovecot installed
- Root privileges through Cockpit for helper script execution
- Expected files:
  - `/etc/postfix/virtual_mailbox_domains`
  - `/etc/postfix/virtual_mailbox_maps`
  - `/etc/postfix/virtual_alias_maps`
  - `/etc/dovecot/users`

## Installation

```bash
make install
```

This installs:

- Cockpit plugin UI to `/usr/share/cockpit/cockpit-postfix/`
- Helper scripts to `/usr/local/lib/cockpit-postfix/`

Then open Cockpit and use **Mail Server** from the tools menu.

## Uninstall

```bash
make uninstall
```

## License

GPL-2.0
