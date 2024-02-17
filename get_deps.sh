#!/bin/bash

TWS_FILE="tws-linux-x86_64"
TWS_VERSION="0.1.2"
TWS_URL="https://github.com/davlgd/tws/releases/download/v${TWS_VERSION}/${TWS_FILE}"
TWS_SHA512="9639b30cf8499638eef10f1f2c125bf6c1efc51cb87d16d1107fe83dd112f55c8a93b8431abd57c6747861b5442c27b0b030bb13e0003c8af28d8613f73c6a0d"

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
