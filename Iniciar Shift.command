#!/bin/zsh
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if [ ! -d node_modules ]; then
  npm install || exit 1
fi
printf '\nAbre http://127.0.0.1:5173 cuando aparezca el aviso de inicio.\n\n'
npm run dev
