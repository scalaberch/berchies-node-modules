#!/bin/bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR
cd ../..

# check if "modules" is in gitignore.
if [ -f ".gitignore" ]; then
  pattern="(^[\.]*[\/]*)(modules)([\/]*$)"
  if ! grep -E $pattern ".gitignore" > /dev/null 2>&1; then
    echo -e "\nmodules/" >> .gitignore
  fi
fi

# then add to git hooks if it is 
