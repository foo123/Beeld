Beeld
=====

**A scriptable and configurable source code builder framework in Node/Python/PHP**

**version 0.5** (*PHP implementation in progress*)


This is a new framework/tool for building (source) projects, which is based on (and extends) the [older buildtools here](https://github.com/foo123/scripts)


###Usage

* Modify the *sample-config.custom* or *sample-config.json* or *sample-config.yaml* <del>or sample-config.ini</del> file(s) to include the input/output filenames and compiler parameters
* Configuration file can be in custom format (default), JSON format (.json) or YAML format (.yaml, .yml) <del>or INI format (.ini)</del>
* Run the .bat or .sh scripts to build the package

###How to Use

Each tool/compiler, if run with no parameters in the command-line, will print a help screen explaining usage options.
Also the sample-dependencies files and build.bat, build.sh files, demonstrate how the build tools are used


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


*URL* [Nikos Web Development](http://nikos-web-development.netai.net/ "Nikos Web Development")  
*URL* [WorkingClassCode](http://workingclasscode.uphero.com/ "Working Class Code")  
