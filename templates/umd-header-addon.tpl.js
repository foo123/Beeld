!function ( root, name, main, factory ) {
"use strict";

var isNode = ("undefined" !== typeof global) && ("[object global]" === {}.toString.call(global)),
    isBrowser = !isNode && ("undefined" !== typeof navigator), 
    isWebWorker = !isNode && ("function" === typeof importScripts) && (navigator instanceof WorkerNavigator),
    isAMD = ("function" === typeof define) && define.amd,
    isCommonJS = isNode && ("object" === typeof module) && module.exports,
    currentGlobal = isWebWorker ? self : root, m
;

// commonjs, node, etc..
if ( isCommonJS ) 
{
    module.$deps = module.$deps || {};
    module.exports = module.$deps[ name ] = factory.call( root,  module.$deps[main] || require(main) ) || 1;
}

// amd, requirejs, etc..
else if ( isAMD && ("function" === typeof require) && ("function" === typeof require.specified) &&
    require.specified(name) ) 
{
    if ( !require.defined(name) )
    {
        define( [main], function( main_module ) {
            return factory.call( root, main_module );
        });
    }
}

// browser, web worker, other loaders, etc.. + AMD optional
else
{
    m = factory.call( root, currentGlobal[main] );
    isAMD && define( [main], function( ){ return m; } );
}

}(  /* current root */          @@ROOT@@, 
    /* module name */           "@@MODULE_NAME@@",
    /* module main */           @@MODULE_MAIN@@, 
    /* module factory */        function( @@MAIN@@ ) {

/* main code starts here */

