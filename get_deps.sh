#!/bin/bash
:'
TWS_FILE="tws-linux-x86_64"
TWS_VERSION="0.1.5"
TWS_URL="https://github.com/davlgd/tws/releases/download/v${TWS_VERSION}/${TWS_FILE}"
TWS_SHA512="47f5ee76e589c1edfa9948b5274b0855b302f22d3eca82f07afd491faecf28f6f334ee3ef3356b9672f97d00301114331a61acdcb49bf1cd0fe9ce17f1dbe4de"

wget -q ${TWS_URL} ${TWS_URL}.sha512

if echo "${TWS_SHA512} ${TWS_FILE}" | sha512sum -c ; then
  chmod +x ${TWS_FILE}
  echo "${TWS_FILE} has been downloaded and checked successfully"
else
  echo "error: ${TWS_FILE} download failed"
  exit 1
fi

git clone https://github.com/vlang/v
cd v
make
cd ..

git clone https://github.com/davlgd/vserve_gzip
cd vserve_gzip
../v/v -prod . -o ../vgzip_server
cd ..


git clone https://github.com/static-web-server/static-web-server.git
cd static-web-server
cargo build --release --features compression-brotli 
cd ..
cp static-web-server/target/release/static-web-server ./sws
'

echo "${INDEXNOW}" > public/${INDEXNOW}.txt

cargo install static-web-server --root .
mv ./bin/static-web-server ./sws

npm ci
npm run astro telemetry disable
