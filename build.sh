#!/usr/bin/env sh

###################################################
#
#   The buildtools repository is at:
#   https://github.com/foo123/Beeld
#
###################################################

# ugliifyjs is default compiler if no compiler specified and minify directive is ON

# to use the python build tool do:
# python Beeld.py --config "beeld-sample.json" --compiler yui

# to use the php build tool do:
# php -f Beeld.php -- --config="beeld-sample.yml" --compiler=closure

# to use the node build tool do:
node Beeld.js --config "beeld-sample.config" --compiler unglifyjs
