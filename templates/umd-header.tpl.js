!function( root, name, factory ) {
"use strict";
var m;
if ( ('object'===typeof module)&&module.exports ) /* CommonJS */
    module.exports = factory.call( root, {} );
else if ( ('undefined'!==typeof System)&&('function'===typeof System.register)&&('function'===typeof System['import']) ) /* ES6 module */
    System.register(name,[],function($__export){$__export(name, factory.call(root,{}));});
else if ( ('function'===typeof define)&&define.amd&&('function'===typeof require)&&('function'===typeof require.specified)&&require.specified(name) ) /* AMD */
    define(name,['require','exports','module'],function(){return factory.call(root,{});});
else if ( !(name in root) ) /* Browser/WebWorker/.. */
    (root[ name ] = (m=factory.call(root,{})))&&('function'===typeof(define))&&define.amd&&define(function(){return m;} );
}(  /* current root */          @@ROOT@@, 
    /* module name */           "@@MODULE_NAME@@",
    /* module factory */        function( @@EXPORTS@@ ) {
/* main code starts here */

