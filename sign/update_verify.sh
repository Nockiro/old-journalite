#/bin/sh

# Usage: ./update_verify.sh update.json < update.json.sig

PUB_KEY=`dirname $0`/update_dsa_pub.pem

openssl enc -d -base64 > .sig_bin
openssl dgst -dsaWithSHA -verify $PUB_KEY -signature .sig_bin < $1
rm .sig_bin
