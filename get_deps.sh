#!/bin/bash

TWS_FILE="tws-linux-x86_64"
TWS_VERSION="0.1.3"
TWS_URL="https://github.com/davlgd/tws/releases/download/v${TWS_VERSION}/${TWS_FILE}"
TWS_SHA512="5e632162172b48709e453717d25fb544f4512ffe8dadf5c9a02975ca0fd6f5d43f12937c14f1b42f2a07a8ce1a414557da1f2b9fd925376beeffc3ee0341b5fb"

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
