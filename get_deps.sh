#!/bin/bash

TWS_FILE="tws"
TWS_VERSION="0.1.0"
TWS_URL="https://github.com/davlgd/tws/releases/download/v${TWS_VERSION}/${TWS_FILE}"
TWS_SHA512="23406f50fe55b02c6596752380a467f88fa53c69bf4c5068f9c2d31df752b565f13f4c2324e5758fdbfb1cece60ee00c0b12409b65e86c7f10d005672293a4fc"

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
