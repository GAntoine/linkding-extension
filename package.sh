#!/usr/bin/env bash

# Update dependencies
npm install

# Run rollup build
npm run build

## FIREFOX

# Copy files to artifacts folder
mkdir -p artifacts/firefox

# Build manifest file for Firefox
npm run merge firefox

# Lint extension
npx web-ext lint --source-dir build/firefox

# Build extension
npx web-ext build --overwrite-dest --source-dir build/firefox --artifacts-dir artifacts/firefox

## CHROME

# Copy files to artifacts folder
mkdir -p artifacts/chrome

# Build manifest file
npm run merge chrome

# Build extension
npx web-ext build --overwrite-dest --source-dir build/chrome --artifacts-dir artifacts/chrome

echo "✅ Done"
