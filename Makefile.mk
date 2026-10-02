AR  ?= ar
CC  ?= gcc
CXX ?= g++
LINUX=true
BASE_FLAGS = -Wall -Wextra -pipe -Wno-unused-parameter
BASE_OPTS  = -O3 -ffast-math
LINK_OPTS  = -Wl,-O1 -Wl,--as-needed -Wl,--strip-all
BASE_FLAGS += -fPIC -DPIC
ifeq ($(DEBUG),true)
BASE_FLAGS += -DDEBUG -O0 -g
LINK_OPTS   =
else
BASE_FLAGS += -DNDEBUG $(BASE_OPTS) -fvisibility=hidden
CXXFLAGS   += -fvisibility-inlines-hidden
endif
BUILD_C_FLAGS   = $(BASE_FLAGS) -std=c99 -std=gnu99 $(CFLAGS)
BUILD_CXX_FLAGS = $(BASE_FLAGS) -std=c++11 $(CXXFLAGS) $(CPPFLAGS)
LINK_FLAGS      = $(LINK_OPTS) -Wl,--no-undefined $(LDFLAGS)
LIB_EXT = .so
SHARED = -shared
