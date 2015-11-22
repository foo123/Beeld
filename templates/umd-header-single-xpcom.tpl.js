!function( root, name, factory ) {
"use strict";
var isXPCOM = ("undefined" !== typeof Components) && Components.utils && ("function" === typeof Components.utils['import']),
    isCommonJS = ("object" === typeof module) && module.exports,
    isAMD = ("function" === typeof(define)) && define.amd, m;

if ( isXPCOM )
{
    root.EXPORTED_SYMBOLS = [ name ];
    root[ name ] = factory.call( root, {} );
}
else if ( isCommonJS )
{
    module.exports = (module.$deps = module.$deps || {})[ name ] = module.$deps[ name ] || (factory.call( root, {NODE:module} ) || 1);
}
else if ( isAMD && ("function" === typeof(require)) && ("function" === typeof(require.specified)) && require.specified(name) )
{
    define( name, ['require', 'exports', 'module'], function( require, exports, module ){ return factory.call( root, {AMD:module} ); } );
}
else if ( !(name in root) )
{
    (root[ name ] = (m=factory.call( root, {} ) || 1)) && isAMD && define( name, [], function( ){ return m; } );
}
}(  /* current root */          @@ROOT@@, 
    /* module name */           "@@MODULE_NAME@@",
    /* module factory */        function( @@EXPORTS@@ ) {
/* main code starts here */

