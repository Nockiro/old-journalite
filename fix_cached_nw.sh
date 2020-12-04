#!/bin/sh

# Fixes libudev problem on Linux.
# https://github.com/rogerwang/node-webkit/wiki/The-solution-of-lacking-libudev.so.0
#
# Run this after updating nw.

if [ "$1" = "" ]
then
	echo "usage: fix_cached_nw version_number"
	echo "example: fix_cached_nw 0.8.5"
	exit 1
fi

cd $HOME/build/journalite/dist/cache/linux64/$1 && \
sed -i 's/\x75\x64\x65\x76\x2E\x73\x6F\x2E\x30/\x75\x64\x65\x76\x2E\x73\x6F\x2E\x31/g' nw
