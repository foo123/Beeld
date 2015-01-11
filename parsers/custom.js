/**
*
*   Custom Parser for JavaScript/Node
*
*   @author Nikos M.  
*   https://foo123.github.com/
*   http://nikos-web-development.netai.net/
*
**/
!function (root, moduleName, moduleDefinition) {

    //
    // export the module
    
    // node, CommonJS, etc..
    if ( 'object' == typeof(module) && module.exports ) module.exports = moduleDefinition();
    
    // AMD, etc..
    else if ( 'function' == typeof(define) && define.amd ) define( moduleDefinition );
    
    // browser, etc..
    else root[ moduleName ] = moduleDefinition();


}(this, 'Custom_Parser', function( undef ) {
    
    var  fs = (require) ? require('fs') : null,
        ACTUAL = {
            '\\n' : "\n",
            '\\t' : "\t",
            '\\v' : "\v",
            '\\f' : "\f"
        },
        NL = /\n\r|\r\n|\r|\n/g, 
        BLOCK = /^([a-zA-Z0-9\-_]+)\s*(=\[\{\}\]|=\[\]|=\{\}|=$)?/,
        ENDBLOCK = /^(@\s*)+/,
        MAP = 1, LIST = 2, ORDEREDMAP = 3, VAL = 0
    ;
    
    var 
        trim = function(s) {
            return (s) ? s.replace(/^\s+/g, '').replace(/\s+$/g, '') : s;
        },
        
        removeComment = function(s, comm) {
            s = s.split( comm );
            return trim( s[0] );
        },
        
        startsWith = function(s, prefix) { return (s && (prefix == s.substr(0, prefix.length))); },
        
        parseStr = function(s, q) {
            var endq = s.indexOf(q, 1);
            var quoted = s.substr(1, endq-1);
            var rem = trim( s.substr( endq ) );
            for (var c in ACTUAL)
                quoted = quoted.split( c ).join( ACTUAL[c] );
            quoted = quoted.split( '\\\\' ).join( '\\' );
            return [quoted, rem];
        },
        
        getQuotedValue = function( line ) {
            var linestartswith = line[0];
            
            // quoted string
            if ( '"'==linestartswith || "'"==linestartswith || "`"==linestartswith )
            {
                var res = parseStr( line, linestartswith );
                return res[0];
            }
            // un-quoted string
            else
            {
                return removeComment( line, '#' );
            }
        },
        
        getKeyValuePair = function( line ) {
            var linestartswith = line[0];
            
            // quoted string
            if ( '"'==linestartswith || "'"==linestartswith || "`"==linestartswith )
            {
                var res = parseStr(line, linestartswith);
                var key = res[0];
                line = res[1];
                
                // key-value pair
                var eq_index = line.indexOf('=');
                var comm_index = line.indexOf('#');
                
                if ( eq_index>-1 && (comm_index<0 || eq_index<comm_index) )
                {
                    line = line.split('=');
                    line.shift()
                    var value = line.join('=');
                    
                    if ( startsWith(value, "[{}]"))
                    {
                        return [key, [], ORDEREDMAP];
                    }
                    else if ( startsWith(value, "[]"))
                    {
                        return [key, [], LIST];
                    }
                    else if ( startsWith(value, "{}"))
                    {
                        return [key, {}, MAP];
                    }
                    
                    if ( value )
                    {
                        value = trim(value);
                        var valuestartswith = value[0];
                        
                        // quoted value
                        if ( '"'==valuestartswith || "'"==valuestartswith || "`"==valuestartswith )
                        {
                            res = parseStr(value, valuestartswith);
                            value = res[0];
                        }
                        else
                        {
                            value = removeComment(value, '#');
                        }
                    }
                }
                else
                {
                    line = line.split('=');
                    line.shift()
                    var value = removeComment(line.join('='), '#');
                }
                return [key, value, VAL];
            }
            // un-quoted string
            else
            {
                line = line.split('=');
                
                var key = trim(line.shift());
                var value = line.join('=');
                
                if ( startsWith(value, "[{}]"))
                {
                    return [key, [], ORDEREDMAP];
                }
                else if ( startsWith(value, "[]"))
                {
                    return [key, [], LIST];
                }
                else if ( startsWith(value, "{}"))
                {
                    return [key, {}, MAP];
                }
                
                if ( value )
                {
                    value = trim(value);
                    var valuestartswith = value[0];
                    
                    // quoted value
                    if ( '"'==valuestartswith || "'"==valuestartswith || "`"==valuestartswith )
                    {
                        var res = parseStr(value, valuestartswith);
                        value = res[0];
                    }
                    else
                    {
                        value = removeComment(value, '#');
                    }
                }
                
                return [key, value, VAL];
            }
        }
    ;
    
    var Context = function(buffer, block, type, prev) {
        this.buffer = buffer;
        this.block = block;
        this.type = type;
        this.prev = prev || null;
        this.next = null;
    };
    Context.prototype = {
        
        constructor: Context,
        
        prev: null,
        next: null,
        buffer: null,
        block: null,
        type: null,
        
        push: function( buffer, block, type ) {
            var ctx = new Context(buffer, block, type, this);
            this.next = ctx;
            return ctx;
        },
        
        pop: function() {
            return this.prev || null;
        }
    };
    
    var CustomParser = self = {
        
        fromString : function(s)  {
            
            // settings buffer
            var settings = {};
            
            // current context
            var ctx = new Context(settings, null, MAP), currentBlock, currentBuffer, isType;

            // parse the lines
            var i, line, lines, lenlines, block, endblock, j, jlen, numEnds, keyval, kvmap;

            s = ''+s;
            lines = s.split( NL );
            lenlines = lines.length;
            
            // parse it line-by-line
            for (i=0; i<lenlines; i++)
            {
                // strip the line of comments and extra spaces
                line = trim( lines[i] );

                // comment or empty line, skip it
                if ( !line.length || '#'==line[0] ) continue;

                // block/directive line, parse it
                if ( !ctx.block && (block = BLOCK.exec( line )) )
                {
                    currentBlock = block[1];
                    if ( !block[2] || '='==block[2] ) isType = VAL;
                    else if ( '=[{}]'==block[2] ) isType = ORDEREDMAP;
                    else if ( '=[]'==block[2] ) isType = LIST;
                    else if ( '={}'==block[2] ) isType = MAP;
                    
                    currentBuffer = ctx.buffer;
                    if ( undef === currentBuffer[ currentBlock ] )
                    {
                        if (LIST === isType)
                            currentBuffer[ currentBlock ] = [];
                        else if (ORDEREDMAP === isType)
                            currentBuffer[ currentBlock ] = [];
                        else if (MAP === isType)
                            currentBuffer[ currentBlock ] = {};
                        else
                            currentBuffer[ currentBlock ] = '';
                    }
                    ctx = ctx.push(currentBuffer, currentBlock, isType);
                    continue;
                }
                
                if ( endblock = ENDBLOCK.exec( line ) )
                {
                    numEnds = line.split("@").length-1;
                    //if ( VAL === ctx.type ) numEnds+=1;
                    for (j=0; j<numEnds && ctx; j++)
                        ctx = ctx.pop();
                    
                    ctx = ctx || new Context(settings, null, MAP);
                    continue;
                }
                
                // if any settings need to be stored, store them in the appropriate buffer
                if ( ctx.block && ctx.buffer )  
                {
                    if ( ORDEREDMAP === ctx.type )
                    {
                        keyval = getKeyValuePair( line );
                        kvmap = {}; kvmap[ keyval[0] ] = keyval[1];
                        ctx.buffer[ ctx.block ].push( kvmap );
                        var pos = ctx.buffer[ ctx.block ].length-1;
                        
                        if ( LIST === keyval[2] || MAP === keyval[2] || ORDEREDMAP === keyval[2] )
                        {
                            ctx = ctx.push(ctx.buffer[ ctx.block ][ pos ], keyval[0], keyval[2]);
                        }
                    }
                    else if ( MAP === ctx.type )
                    {
                        keyval = getKeyValuePair( line );
                        ctx.buffer[ ctx.block ][ keyval[0] ] = keyval[1];
                        
                        if ( LIST === keyval[2] || MAP === keyval[2] || ORDEREDMAP === keyval[2] )
                        {
                            ctx = ctx.push(ctx.buffer[ ctx.block ], keyval[0], keyval[2]);
                        }
                    }
                    else if ( LIST === ctx.type )
                    {
                        ctx.buffer[ ctx.block ].push( getQuotedValue( line ) );
                    }
                    else //if ( VAL === isType )
                    {
                        ctx.buffer[ ctx.block ] = getQuotedValue( line );
                        ctx = ctx.pop();
                        ctx = ctx || new Context(settings, null, MAP);
                    }
                }
            }
            
            return settings;
        },
        
        fromFile : function(filename, keysList, rootSection) {
            if (fs)
            {
                return self.fromString( fs.readFileSync(filename) );
            }
            return '';
        }
    };
    
    // export it
    return CustomParser;
});