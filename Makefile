include Makefile.mk
PREFIX  ?= /usr/local
DESTDIR ?=
all: build
build: build-mod-cv-curve
build-mod-cv-curve: mod-cv-curve.lv2/mod-cv-curve$(LIB_EXT) mod-cv-curve.lv2/manifest.ttl
mod-cv-curve.lv2/mod-cv-curve$(LIB_EXT): mod-cv-curve.c
	$(CC) $^ $(BUILD_C_FLAGS) $(LINK_FLAGS) -lm $(SHARED) -o $@
mod-cv-curve.lv2/manifest.ttl: mod-cv-curve.lv2/manifest.ttl.in
	sed -e "s|@LIB_EXT@|$(LIB_EXT)|" $< > $@
clean:
	rm -f mod-cv-curve.lv2/mod-cv-curve$(LIB_EXT) mod-cv-curve.lv2/manifest.ttl
install: build
	install -d $(DESTDIR)$(PREFIX)/lib/lv2/mod-cv-curve.lv2
	install -m 644 mod-cv-curve.lv2/*.so  $(DESTDIR)$(PREFIX)/lib/lv2/mod-cv-curve.lv2/
	install -m 644 mod-cv-curve.lv2/*.ttl $(DESTDIR)$(PREFIX)/lib/lv2/mod-cv-curve.lv2/
	install -d $(DESTDIR)$(PREFIX)/lib/lv2/mod-cv-curve.lv2/modgui
	install -m 644 mod-cv-curve.lv2/modgui/* $(DESTDIR)$(PREFIX)/lib/lv2/mod-cv-curve.lv2/modgui/
