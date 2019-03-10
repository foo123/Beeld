@echo off

rem ###################################################
rem #
rem #   The buildtools repository is at:
rem #   https://github.com/foo123/Beeld
rem #
rem ###################################################

rem uglifyjs is default compiler if no compiler specified and minify directive is ON

rem to use the python build tool do:
rem python Beeld.py --config "beeld-sample.json" --compiler yui

rem to use the php build tool do:
rem php -f Beeld.php -- --config="beeld-sample.yml" --compiler=closure

rem to use the node build tool do:
node Beeld.js --config "beeld-sample.config" --compiler uglifyjs
