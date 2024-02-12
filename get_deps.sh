#!/bin/bash

TWS_FILE="tws-linux-x86_64"
TWS_VERSION="0.1.1"
TWS_URL="https://github.com/davlgd/tws/releases/download/v${TWS_VERSION}/${TWS_FILE}"
TWS_SHA512="363512d1bb0ea166ba81fd23cc27c9fe5271ee7b17964e708e7eefd37335f1e0ee515f9548298ff9047a3d5a9756927fe36859c106cf1d0a201ff1e74f824b90"

wget -q ${TWS_URL} ${TWS_URL}.sha512

if echo "${TWS_SHA512} ${TWS_FILE}" | sha512sum -c ; then
  chmod +x ${TWS_FILE}
  echo "${TWS_FILE} has been downloaded and checked successfully"
else
  echo "error: ${TWS_FILE} download failed"
  exit 1
fi

npm ci
npm run astro telemetry disable
