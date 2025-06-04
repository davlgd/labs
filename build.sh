#!/bin/bash

echo "gzip" && gzip --force -r dist
echo "brotli" && find dist -type f -exec brotli --keep --best {} \;
