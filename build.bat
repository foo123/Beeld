@echo off

REM to use the python build tool do (the config file is passed as argument):
REM ugliifyjs is default compiler if no compiler specified and minify directive is ON
REM python Beeld.py --config "config.custom" --compiler uglifyjs
REM if packaging css files
REM python Beeld.py --config "%1" --compiler cssmin

REM to use the php build tool do (the config file is passed as argument):
REM php -f Beeld.php -- --config="config.custom" --compiler=closure

REM to use the node build tool do (the config file is passed as argument):
node Beeld.js --config "config.custom" --compiler yui
