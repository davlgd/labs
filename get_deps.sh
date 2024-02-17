#!/bin/bash

TWS_FILE="tws-linux-x86_64"
TWS_VERSION="0.1.4"
TWS_URL="https://github.com/davlgd/tws/releases/download/v${TWS_VERSION}/${TWS_FILE}"
TWS_SHA512="31ca175e261401a25036fb332a6b4f6b80b31e2b09b2ebc6d5a8d024d72d79b72780979ee4105a6a332ecd998ec02116eab3360c5625b1538216333a94e3c9cd"

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
