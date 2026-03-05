#!/bin/bash

set -e

if [ -z "$1" ]; then
  echo "No tag provided. using latest"
  publish_tag="latest"
else
  publish_tag=$1
fi

echo "Publishing with tag: $publish_tag"

version=$(cat packages/rolldown-analyzer/package.json | jq -r '.version')
if ! yarn npm info rolldown-analyzer@$version --fields version --json | jq -r '.version' | grep -q $version; then
  yarn build
  yarn workspace rolldown-analyzer pack --out package.tgz
  npm publish packages/rolldown-analyzer/package.tgz --tag $publish_tag --provenance
else
  echo "rolldown-analyzer@$version is already published"
fi
