/**
*
*   Json Parser for JavaScript/Node
*
*   @author Nikos M.  
*   https://foo123.github.com/
*   http://nikos-web-development.netai.net/
*
**/
!function (root, moduleName, moduleDefinition) {
    // export the module
    var m;
    // node, CommonJS, etc..
    if ( 'object' === typeof(module) && module.exports ) module.exports = moduleDefinition();
    // browser and AMD, etc..
    else (root[ moduleName ] = m = moduleDefinition()) && ('function' === typeof(define) && define.amd && define(moduleName,[],function(){return m;}));

}(this, 'Json_Parser', function( undef ) {
    
    var Json_Parser = {
        
        parse: function( s )  {
            return JSON.parse( s );
        }
    };
    
    // export it
    return Json_Parser;
});