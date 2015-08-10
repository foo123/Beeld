Beeld
=====

**A scriptable, extendable and configurable source code builder framework and tool in Node/Python/PHP**

**version 0.8**

![beeld is a bee that builds flowers](/beeld.jpg)

This is a new framework and tool for building projects from sources, which is based on (and extends) the [previous buildtools used here](https://github.com/foo123/scripts)


###Usage

* Modify the *beeld-sample.config* or *beeld-sample.json* or *beeld-sample.yaml* <del>or beeld-sample.ini</del> file(s) to include the configuration settings and parameters
* Configuration file can be in custom config format (default), JSON format (.json) or YAML format (.yaml, .yml) <del>or INI format (.ini)</del>
* Run the .bat or .sh scripts to build the package

Each tool/compiler, if run with no parameters in the command-line, will print a help screen explaining usage options.
Also the sample-config files and build.bat, build.sh files, demonstrate how the build tools are used


###Plugins, Extensions, Scripting, Custom Dynamic Expressions

The framework can be extended by plugins. The plugin code can be in the Beeld/plugins folder or even in current working directory. Each plugin can define a new action to be used on the source data through a pipeline.

The plugin and the new action are both defined in each config file (see sample config files).

Furthermore the framework has a built-in "replace" action to replace text in sources and a "process-shell" action which allows to manipulate the source data through direct shell scripting (for example for some fast shell text manipulation)

**NEW in version 0.8+**

The framework allows custom powerful dynamic expressions (and regular expressions) to be part of config data and parameters, via the [Xpresion framework](https://github.com/foo123/Xpresion). The beeld.config file can include a `settings` part which defines the prefixes for Xpresion dynamic expressions and Regular Expressions (if any) used in the config file. The parsing and evaluation will be automatic (see sample config files for examples). An common example of the use of custom expressions is the use of current date to be displayed in the final built file (one can use a custom expression for that which uses the `date` function as part of `replace` data to be replaced in the file where needed). Another one, is to replace data in the files not simply by another string but by the contents of a whole file (one would use an expression with the `file` function to load the contents of a file dynamicaly)



###UMD Templates

Some UMD templates from the [UMD github repo](https://github.com/umdjs/umd) have been included as templates in the buildtools.
A generic UMD module pattern wrapper that supports module dependencies and bundled module dependencies in same file and works transparently inside Node/CommonJS, requireJS/AMD, WebWorker/Browser, is in this [gist](https://gist.github.com/foo123/20e0ca043cdc50ecb004#)
and in [this gist](https://gist.github.com/foo123/8b0c069445bee29b0e93) for single module wrapper (no dependencies)


###Dependencies

* UglifyJS (default), Java Closure Compiler (included), Java YUI Compressor (included), [CSS Minifier](http://foo123.github.io/examples/css-minifier) (included) can be used

__For Python__
* Python (2 or 3)
* PyYaml module installed (for Yaml parsing)

__For PHP__
* PHP 5.2+
* Modified standalone version of Symfony Yaml parser by (c) Fabien Potencier <fabien@symfony.com> (included)

__For Node__
* Node 0.8+
* Modified standalone version of yaml.js (Symfony Yaml parser) by (c) Fabien Potencier, Jeremy Faivre (included)
* node-temp package (global install preferrably)

__Common Dependencies__
* UglifyJS2 package (global install)
* Closure compiler (included)
* YUI Compressor compiler (included)
* Java 6 (needed by YUI, Closure compilers)
* CSS Minifier (python) (included)
* CSS Minifier (php) (included)
* CSS Minifier (node) (included)
* Xpresion (python) (included)
* Xpresion (php) (included)
* Xpresion (node) (included)


*URL* [Nikos Web Development](http://nikos-web-development.netai.net/ "Nikos Web Development")  
*URL* [WorkingClassCode](http://workingclasscode.uphero.com/ "Working Class Code")  

