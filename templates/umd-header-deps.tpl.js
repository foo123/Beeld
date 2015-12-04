!function( root, name, deps, factory ) {
"use strict";
var m = factory.call(root,{}); m.$dependencies = deps||[];
if ( ('object'===typeof module)&&module.exports ) /* CommonJS */
    module.exports = m;
else if ( ('undefined'!==typeof System)&&('function'===typeof System.register)&&('function'===typeof System['import']) ) /* ES6 module */
    System.register(name,[],function($__export){$__export(name, m);});
else if ( ('function'===typeof define)&&define.amd&&('function'===typeof require)&&('function'===typeof require.specified)&&require.specified(name) ) /* AMD */
    define(name,['require','exports','module'],function(){return m;});
else if ( !(name in root) ) /* Browser/WebWorker/.. */
    (root[ name ] = m)&&('function'===typeof(define))&&define.amd&&define(function(){return m;} );
}(  /* current root */          @@ROOT@@, 
    /* module name */           "@@MODULE_NAME@@",
    /* module deps */           @@MODULE_DEPS@@,
    /* module factory */        function( @@EXPORTS@@ ) {
/* main code starts here */

