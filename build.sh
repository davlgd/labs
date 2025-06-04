#!/bin/bash

set -euo pipefail

astro telemetry disable
astro build

pagefind --site dist

echo "gzip" && gzip --force -r dist
echo "brotli" && find dist -type f -exec brotli --keep --best {} \;
