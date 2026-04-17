PREFIX ?= /usr/share/cockpit/cockpit-postfix
HELPER_PREFIX ?= /usr/local/lib/cockpit-postfix

.PHONY: install uninstall

install:
	install -d "$(DESTDIR)$(PREFIX)" "$(DESTDIR)$(PREFIX)/src" "$(DESTDIR)$(PREFIX)/css" "$(DESTDIR)$(HELPER_PREFIX)"
	install -m 0644 manifest.json index.html "$(DESTDIR)$(PREFIX)/"
	install -m 0644 src/*.js "$(DESTDIR)$(PREFIX)/src/"
	install -m 0644 css/*.css "$(DESTDIR)$(PREFIX)/css/"
	install -m 0755 helpers/*.sh "$(DESTDIR)$(HELPER_PREFIX)/"

uninstall:
	rm -rf "$(DESTDIR)$(PREFIX)"
	rm -rf "$(DESTDIR)$(HELPER_PREFIX)"
