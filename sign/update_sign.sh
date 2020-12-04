#!/bin/sh

# Usage: ./update_sign.sh update.json > update.json.sig

PRIV_KEY=`dirname $0`/update_dsa_priv.pem

openssl dgst -dsaWithSHA -sign $PRIV_KEY < $1 | openssl enc -base64 | tr -d '\n'
