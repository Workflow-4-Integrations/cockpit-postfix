# cockpit-postfix

`cockpit-postfix` is a Cockpit plugin for administering a Postfix + Dovecot virtual mailbox server from a native Cockpit UI.

## Features

- Domains tab: manage `virtual_mailbox_domains`
- Mailboxes tab: manage `virtual_mailbox_maps` and Dovecot user passwords
- Aliases tab: manage `virtual_alias_maps`
- Queue tab: list, flush, hold/release, and delete queued mail
- Logs tab: stream `/var/log/mail.log` in real-time
- Services tab: manage `postfix` and `dovecot` service state and enablement

## Prerequisites

- Cockpit installed and running
- Postfix installed with virtual mailbox configuration
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

## Configuration assumptions

- Postfix map files are text files that are rebuilt with `postmap` after changes.
- Mailbox map entries are written as `<email>\t<domain>/<user>/`.
- Dovecot user records are managed in `/etc/dovecot/users` using `doveadm pw` generated hashes.
- Queue operations use `postqueue` and `postsuper`.

## Screenshots

- Example UI screenshot: https://github.com/user-attachments/assets/bf1c1e29-e49f-4368-b32e-e7ae05f722b3

## License

GPL-2.0
