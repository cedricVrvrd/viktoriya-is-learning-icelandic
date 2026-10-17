#!/usr/bin/env bash
# Récupère la voix Steinn de Grammatek et le dictionnaire de prononciation d'ice-g2p,
# à des versions figées et vérifiées par empreinte. Usage : scripts/preparer-grammatek.sh .grammatek
set -euo pipefail
DEST="${1:-.grammatek}"
VOIX_COMMIT=505ea2474af38cdfd7b6725c45580a6a71910289          # grammatek/simaromur_voices, 9 févr. 2024
VOIX_MD5=1c32a01f901e9bc3eb944a7713b5571d                      # is-steinn-xs-ipa.onnx (voice-info.json)
G2P_SHA256=c0bdf36c72987dc3f6ee5c20766af862d59f5e339ac8b1f0fdea4bb073641231  # ice_g2p-1.2.0 (PyPI)

mkdir -p "$DEST"
if [ ! -f "$DEST/voix/is-steinn-xs-ipa.onnx" ]; then
  rm -rf "$DEST/voix"
  git init -q "$DEST/voix"
  git -C "$DEST/voix" fetch -q --depth 1 https://github.com/grammatek/simaromur_voices "$VOIX_COMMIT"
  git -C "$DEST/voix" checkout -q FETCH_HEAD
fi
echo "$VOIX_MD5  $DEST/voix/is-steinn-xs-ipa.onnx" | md5sum -c --quiet

if [ ! -d "$DEST/g2p/ice_g2p" ]; then
  rm -rf "$DEST/g2p" "$DEST/whl" && mkdir -p "$DEST/whl"
  python3 -m pip download --quiet --no-deps --dest "$DEST/whl" ice-g2p==1.2.0
  echo "$G2P_SHA256  $DEST/whl/ice_g2p-1.2.0-py3-none-any.whl" | sha256sum -c --quiet
  python3 -m zipfile -e "$DEST/whl/ice_g2p-1.2.0-py3-none-any.whl" "$DEST/g2p"
fi
echo "Grammatek : voix et dictionnaire prêts dans $DEST"
