!function( root, factory ){
"use strict";
if ( ('object'===typeof module) && module.exports ) /* CommonJS */
    module.exports = factory.call(root,(module.$deps && module.$deps["@@MODULE@@"]) || require("./@@MODULE@@".toLowerCase()));
else if ( ("function"===typeof define) && define.amd && ("function"===typeof require) && ("function"===typeof require.specified) && require.specified("@@PLUGIN@@") /*&& !require.defined("@@PLUGIN@@")*/ ) 
    define("@@PLUGIN@@",['module',"@@MODULE@@"],function(mod,module){factory.moduleUri = mod.uri; factory.call(root,module); return module;});
else /* Browser/WebWorker/.. */
    (factory.call(root,root["@@MODULE@@"])||1)&&('function'===typeof define)&&define.amd&&define(function(){return root["@@MODULE@@"];} );
}(  /* current root */          @@ROOT@@, 
    /* module factory */        function ModuleFactory__@@PLUGIN@@( @@MODULE@@ ){
/* main code starts here */

