# cockpit-postfix

`cockpit-postfix` is a Cockpit plugin for administering Postfix and Dovecot with a native Cockpit React/PatternFly interface.

## Build

1. Clone the repository.
2. Run:
   ```bash
   make
   ```
   This fetches Cockpit `pkg/lib`, installs npm dependencies, and builds `dist/`.

## Development install

```bash
make devel-install
```

This symlinks `dist/` to `~/.local/share/cockpit/cockpit-postfix` for fast local iteration.

## Production install

```bash
make install
```

This installs:
- UI bundle to `/usr/share/cockpit/cockpit-postfix/`
- Helper scripts to `/usr/local/lib/cockpit-postfix/`

## Uninstall development symlink

```bash
make devel-uninstall
```

## Helper scripts

All backend shell helpers remain in `helpers/` and are installed as executable scripts.
