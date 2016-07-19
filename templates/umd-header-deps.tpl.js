!function( root, name, factory ){
"use strict";
function extract(obj,keys,index,load){return obj ? keys.map(function(k, i){return (index ? obj[i] : obj[k]) || (load?load(k):null); }) : [];}
if ( ('object'===typeof module) && module.exports ) /* CommonJS */
    (module.$deps = module.$deps||{}) && (module.exports = module.$deps[name] = factory.apply(root, extract(module.$deps,[@@DEPNAMES@@],false,function(k){return require("./"+k.toLowerCase());})));
else if ( ('function'===typeof define)&&define.amd&&('function'===typeof require)&&('function'===typeof require.specified)&&require.specified(name) /*&& !require.defined(name)*/ ) /* AMD */
    define(name,['module'].concat([@@DEPNAMES@@]),function(module){factory.moduleUri = module.uri; return factory.apply(root, extract(Array.prototype.slice.call(arguments,1),[@@DEPNAMES@@],true));});
else if ( !(name in root) ) /* Browser/WebWorker/.. */
    (root[name]=factory.apply(root, extract(root,[@@DEPNAMES@@])))&&('function'===typeof(define))&&define.amd&&define(function(){return root[name];} );
}(  /* current root */          @@ROOT@@, 
    /* module name */           "@@MODULE@@",
    /* module factory */        function ModuleFactory__@@MODULE@@( @@DEPS@@ ){
/* main code starts here */

