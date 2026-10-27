#!/usr/bin/env bash
# COMPATIBILITY BRIDGE: This script handles the build process if Render is still pointing to build.sh
# It simply calls our main npm build script.

echo "Running compatibility build bridge..."
npm run render-build
