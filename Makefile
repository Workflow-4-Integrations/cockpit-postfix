PACKAGE_NAME := cockpit-postfix
PREFIX ?= /usr
COCKPIT_DEST := $(PREFIX)/share/cockpit/$(PACKAGE_NAME)
HELPER_PREFIX ?= /usr/local/lib/cockpit-postfix
NODE_MODULES_TEST := package-lock.json
COCKPIT_REPO_STAMP := pkg/lib/cockpit-po-plugin.js
COCKPIT_REPO_FILES := pkg/lib
COCKPIT_REPO_URL := https://github.com/cockpit-project/cockpit.git
COCKPIT_REPO_COMMIT := 1a4c2a9c6cbfbe6005b0ca89a8c848b154b4affe

.PHONY: all clean install devel-install devel-uninstall

all: dist/index.js

COCKPIT_REPO_TREE = '$(strip $(COCKPIT_REPO_COMMIT))^{tree}'
$(COCKPIT_REPO_STAMP): Makefile
	@git rev-list --quiet --objects $(COCKPIT_REPO_TREE) -- 2>/dev/null || \
	    git fetch --no-tags --no-write-fetch-head --depth=1 $(COCKPIT_REPO_URL) $(COCKPIT_REPO_COMMIT)
	git archive $(COCKPIT_REPO_TREE) -- $(COCKPIT_REPO_FILES) | tar x

$(NODE_MODULES_TEST): package.json
	rm -f package-lock.json
	for _ in `seq 3`; do timeout 10m env -u NODE_ENV npm install --ignore-scripts && exit 0; done; exit 1
	env -u NODE_ENV npm prune

dist/index.js: $(NODE_MODULES_TEST) $(COCKPIT_REPO_STAMP) $(shell find src -type f) build.js
	NODE_ENV=$(NODE_ENV) ./build.js

clean:
	rm -rf dist node_modules pkg package-lock.json

install: dist/index.js
	mkdir -p $(DESTDIR)$(COCKPIT_DEST)
	cp -r dist/* $(DESTDIR)$(COCKPIT_DEST)
	mkdir -p $(DESTDIR)$(HELPER_PREFIX)
	install -m 0755 helpers/*.sh $(DESTDIR)$(HELPER_PREFIX)/

devel-install: dist/index.js
	mkdir -p ~/.local/share/cockpit
	ln -sfn `pwd`/dist ~/.local/share/cockpit/$(PACKAGE_NAME)

devel-uninstall:
	rm -f ~/.local/share/cockpit/$(PACKAGE_NAME)
