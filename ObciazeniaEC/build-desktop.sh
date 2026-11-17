#!/usr/bin/env bash
# Buduje dist/ObciazeniaEC.html oraz dist/ObciazeniaEC.exe (Windows x64, WebView2).
# Wymaga: Node.js (budowanie HTML) i Go ≥ 1.21 (kompilacja krzyżowa działa także z Linuksa/macOS).
set -euo pipefail
cd "$(dirname "$0")"
node build.js
cp dist/ObciazeniaEC.html desktop/app.html
cd desktop
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-H windowsgui -s -w" -o ../dist/ObciazeniaEC.exe .
rm -f app.html
echo "zapisano dist/ObciazeniaEC.exe"
