!function ( root, name, deps, factory ) {
"use strict";

//
// export the module umd-style (with deps bundled-in or external)

// Get current filename/path
function getPath( isNode, isWebWorker, isAMD, isBrowser, amdMod ) 
{
    var f;
    if (isNode) return {file:__filename, path:__dirname};
    else if (isWebWorker) return {file:(f=self.location.href), path:f.split('/').slice(0, -1).join('/')};
    else if (isAMD&&amdMod&&amdMod.uri)  return {file:(f=amdMod.uri), path:f.split('/').slice(0, -1).join('/')};
    else if (isBrowser&&(f=document.getElementsByTagName('script'))&&f.length) return {file:(f=f[f.length - 1].src), path:f.split('/').slice(0, -1).join('/')};
    return {file:null,  path:null};
}
function getDeps( names, paths, deps, depsType, require/*offset*/ )
{
    //offset = offset || 0;
    var i, dl = names.length, mods = new Array( dl );
    for (i=0; i<dl; i++) 
        mods[ i ] = (1 === depsType)
                ? /* node */ (deps[ names[ i ] ] || require( paths[ i ] )) 
                : (2 === depsType ? /* amd args */ /*(deps[ i + offset ])*/ (require( names[ i ] )) : /* globals */ (deps[ names[ i ] ]))
            ;
    return mods;
}
// load javascript(s) (a)sync using <script> tags if browser, or importScripts if worker
function loadScripts( scope, base, names, paths, callback, imported )
{
    var dl = names.length, i, rel, t, load, next, head, link;
    if ( imported )
    {
        for (i=0; i<dl; i++) if ( !(names[ i ] in scope) ) importScripts( base + paths[ i ] );
        return callback( );
    }
    head = document.getElementsByTagName("head")[ 0 ]; link = document.createElement( 'a' );
    rel = /^\./; t = 0; i = 0;
    load = function( url, cb ) {
        var done = 0, script = document.createElement('script');
        script.type = 'text/javascript'; script.language = 'javascript';
        script.onload = script.onreadystatechange = function( ) {
            if (!done && (!script.readyState || script.readyState == 'loaded' || script.readyState == 'complete'))
            {
                done = 1; script.onload = script.onreadystatechange = null;
                cb( );
                head.removeChild( script ); script = null;
            }
        }
        if ( rel.test( url ) ) 
        {
            // http://stackoverflow.com/a/14781678/3591273
            // let the browser generate abs path
            link.href = base + url;
            url = link.protocol + "//" + link.host + link.pathname + link.search + link.hash;
        }
        // load it
        script.src = url; head.appendChild( script );
    };
    next = function( ) {
        if ( names[ i ] in scope )
        {
            if ( ++i >= dl ) callback( );
            else if ( names[ i ] in scope ) next( ); 
            else load( paths[ i ], next );
        }
        else if ( ++t < 30 ) { setTimeout( next, 30 ); }
        else { t = 0; i++; next( ); }
    };
    while ( i < dl && (names[ i ] in scope) ) i++;
    if ( i < dl ) load( paths[ i ], next );
    else callback( );
}

deps = deps || [[],[]];

var isNode = ("undefined" !== typeof global) && ("[object global]" === {}.toString.call(global)),
    isBrowser = !isNode && ("undefined" !== typeof navigator), 
    isWebWorker = !isNode && ("function" === typeof importScripts) && (navigator instanceof WorkerNavigator),
    isAMD = ("function" === typeof define) && define.amd,
    isCommonJS = isNode && ("object" === typeof module) && module.exports,
    currentGlobal = isWebWorker ? self : root, currentPath = getPath( isNode, isWebWorker, isAMD, isBrowser ), m,
    names = [].concat(deps[0]), paths = [].concat(deps[1]), dl = names.length, i, requireJSPath, ext_js = /\.js$/i
;

// commonjs, node, etc..
if ( isCommonJS ) 
{
    module.$deps = module.$deps || {};
    module.exports = module.$deps[ name ] = factory.apply( root, [{NODE:module}].concat(getDeps( names, paths, module.$deps, 1, require )) ) || 1;
}

// amd, requirejs, etc..
else if ( isAMD && ("function" === typeof require) && ("function" === typeof require.specified) &&
    require.specified(name) ) 
{
    if ( !require.defined(name) )
    {
        requireJSPath = { };
        for (i=0; i<dl; i++) 
            require.specified( names[ i ] ) || (requireJSPath[ names[ i ] ] = paths[ i ].replace(ext_js, ''));
        //requireJSPath[ name ] = currentPath.file.replace(ext_js, '');
        require.config({ paths: requireJSPath });
        // named modules, require the module by name given
        define( name, ["require", "exports", "module"].concat( names ), function( require, exports, module ) {
            return factory.apply( root, [{AMD:module}].concat(getDeps( names, paths, arguments, 2, require )) );
        });
    }
}

// browser, web worker, other loaders, etc.. + AMD optional
else if ( !(name in currentGlobal) )
{
    loadScripts( currentGlobal, currentPath.path + '/', names, paths, function( ){ 
        m = factory.apply( root, [{}].concat(getDeps( names, paths, currentGlobal )) ); 
        isAMD && define( name, ["require"], function( ){ return m; } );
    }, isWebWorker);
}

}(  /* current root */          @@ROOT@@, 
    /* module name */           "@@MODULE_NAME@@",
    /* module dependencies */   @@MODULE_DEPENDENCIES@@, 
    /* module factory */        function( @@EXPORTS@@, @@MODULE_ARGUMENTS@@ ) {

/* main code starts here */

