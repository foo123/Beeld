#!/usr/bin/env sh

# to use the python build tool do (the config file is passed as argument):
# ugliifyjs is default compiler if no compiler specified and minify directive is ON
python Beeld.py --config "$1" --compiler uglifyjs
# if packaging css files
# python Beeld.py --config "%1" --compiler cssmin

# to use the php build tool do (the config file is passed as argument):
# php -f Beeld.php -- --config="$1" --compiler=closure

# to use the node build tool do (the config file is passed as argument):
# node Beeld.js --config "$1" --compiler yui
