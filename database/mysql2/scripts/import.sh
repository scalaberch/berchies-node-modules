#!/bin/bash

# move to directory
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR/../../../..

# load environment file
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# clear directory?
rm -R ./src/models/mysql/*.ts

# # execute sequelize auto
# npx sequelize-auto -o "./src/models/mysql" -d $MYSQL_DATABASE -h $MYSQL_HOST -u $MYSQL_USER -x $MYSQL_PASS -e mysql -l ts --caseModel p --caseProp c --caseFile p --singularize --noIndexes --noInitModels
# npx sequelize-auto -o "./src/models/mysql" -d $MYSQL_DATABASE -h $MYSQL_HOST -u $MYSQL_USER -x $MYSQL_PASS -e mysql -l ts --useDefine --noIndexes
npx sequelize-auto -o "./src/models/mysql" -d $MYSQL_DATABASE -h $MYSQL_HOST -u $MYSQL_USER -x $MYSQL_PASS -c "./modules/database/mysql2/scripts/sequelize-auto-config.json"

# reset permissions
chmod u+w ./src/models/mysql/*.ts

# update them files
node modules/database/mysql2/scripts/import-correction.js


# ./modules/database/mysql2/scripts/import.sh