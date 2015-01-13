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
    // export the module
    var m;
    // node, CommonJS, etc..
    if ( 'object' === typeof(module) && module.exports ) module.exports = moduleDefinition();
    // browser and AMD, etc..
    else (root[ moduleName ] = m = moduleDefinition()) && ('function' === typeof(define) && define.amd && define(moduleName,[],function(){return m;}));

}(this, 'Custom_Parser', function( undef ) {
    "use strict";
    var PROTO = 'prototype', HAS = 'hasOwnProperty', CHAR = 'charAt',
        ESC = [
        ['\\n', "\n"],
        ['\\r', "\r"],
        ['\\t', "\t"],
        ['\\v', "\v"],
        ['\\f', "\f"]
        ],
        RE_NEWLINE = /\n\r|\r\n|\r|\n/g, 
        //RE_BLOCK = /^([a-zA-Z0-9\-_]+)\s*(=\[\{\}\]|=\[\]|=\{\}|=)?/,
        RE_ENDBLOCK = /^(@\s*)+/,
        T_VAL = 1,
        T_MAP = 2,
        T_LIST = 3,
        T_ORDEREDMAP = 4
    ;
    
    var 
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/Trim
        trim = String[PROTO].trim 
                ? function( s ){ return s.trim( ); } 
                : function( s ){ return s.replace(/^\s+|\s+$/g, ''); }, 
        
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith
        startsWith = String[PROTO].startsWith 
                ? function( str, pre, pos ){ return str.startsWith(pre, pos||0); } 
                : function( str, pre, pos ){ return pre === str.slice(pos||0, pre.length); },
        
        removeComment = function( s, comm, pos ) {
            var p = arguments.length > 2 ? pos : s.indexOf( comm );
            return trim( -1 < p ? s.slice(0, p) : s );
        },
        
        getStr = function( s, q, and_un_escape ) {
            var i = 1, l = s.length, esc = false, 
                ch = '', quoted = '', rem = '';
            while ( i < l )
            {
                ch = s[CHAR]( i++ );
                if ( q === ch && !esc ) break;
                esc = !esc && ('\\' === ch);
                quoted += ch;
            }
            rem = trim( s.slice( i ) );
            if ( false !== and_un_escape )
            {
                for (i=0; i<ESC.length; i++)
                    quoted = quoted.split( ESC[i][0] ).join( ESC[i][1] );
                quoted = quoted.split( '\\\\' ).join( '\\' );
            }
            return [quoted, rem];
        },
        
        getVal = function( line ) {
            var linestartswith = line[CHAR](0);
            // quoted string
            if ( '"'==linestartswith || "'"==linestartswith || "`"==linestartswith )
                return getStr( line, linestartswith )[0];
            // un-quoted string
            else
                return removeComment( line, '#' );
        },
        
        getKeyVal = function( line ) {
            var linestartswith = line[CHAR](0), res, key, val,
                eq_index, comm_index, valstartswith;
            
            // quoted string
            if ( '"'==linestartswith || "'"==linestartswith || "`"==linestartswith )
            {
                res = getStr(line, linestartswith);
                key = res[0]; line = res[1];
                
                // key-value pair
                eq_index = line.indexOf('=');
                comm_index = line.indexOf('#');
                
                if ( -1 < eq_index && (0 > comm_index || eq_index < comm_index) )
                {
                    val = line.slice(eq_index+1);
                    
                    if ( startsWith(val, "[{}]"))
                    {
                        return [key, [], T_ORDEREDMAP];
                    }
                    else if ( startsWith(val, "[]"))
                    {
                        return [key, [], T_LIST];
                    }
                    else if ( startsWith(val, "{}"))
                    {
                        return [key, {}, T_MAP];
                    }
                    
                    if ( val )
                    {
                        val = trim( val );
                        valstartswith = val[CHAR](0);
                        
                        // quoted value
                        if ( '"'==valstartswith || "'"==valstartswith || "`"==valstartswith )
                        {
                            val = getStr(val, valstartswith)[0];
                        }
                        else
                        {
                            val = removeComment(val, '#', comm_index);
                        }
                    }
                }
                else
                {
                    val = removeComment(line, '#', comm_index);
                }
                return [key, val, T_VAL];
            }
            // un-quoted string
            else
            {
                eq_index = line.indexOf('=');
                key = trim(line.slice(0, eq_index));
                val = line.slice(eq_index+1);
                
                if ( startsWith(val, "[{}]"))
                {
                    return [key, [], T_ORDEREDMAP];
                }
                else if ( startsWith(val, "[]"))
                {
                    return [key, [], T_LIST];
                }
                else if ( startsWith(val, "{}"))
                {
                    return [key, {}, T_MAP];
                }
                
                if ( val )
                {
                    val = trim(val);
                    valstartswith = val[CHAR](0);
                    
                    // quoted value
                    if ( '"'==valstartswith || "'"==valstartswith || "`"==valstartswith )
                    {
                        val = getStr(val, valuestartswith)[0];
                    }
                    else
                    {
                        val = removeComment(val, '#');
                    }
                }
                
                return [key, val, T_VAL];
            }
        }
    ;
    
    var Context = function(buffer, block, type, prev) {
        var self = this;
        self.buffer = buffer;
        self.block = block;
        self.type = type;
        self.prev = prev || null;
        self.next = null;
    };
    Context[PROTO] = {
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
    
    var Custom_Parser = {
        parse: function( s ) {
            
            // rootObj buffer
            var rootObj = {};
            
            // current context
            var ctx = new Context(rootObj, null, T_MAP), currentBlock, currentBuffer;

            // parse the lines
            var i, line, lines, lenlines, block, endblock, j, jlen, numEnds, keyval, kvmap;

            s = ''+s;
            lines = s.split( RE_NEWLINE );
            lenlines = lines.length;
            
            // parse it line-by-line
            for (i=0; i<lenlines; i++)
            {
                // strip the line of comments and extra spaces
                line = trim( lines[i] );

                // empty line or comment, skip it
                if ( !line.length || '#'==line[CHAR](0) ) continue;

                // end of block/directive
                if ( endblock = RE_ENDBLOCK.exec( line ) )
                {
                    numEnds = line.split("@").length-1;
                    for (j=0; j<numEnds && ctx; j++) ctx = ctx.pop();
                    if ( !ctx ) ctx = new Context(rootObj, null, T_MAP);
                    continue;
                }
                
                // if any settings need to be stored, store them in the appropriate buffer
                if ( ctx.buffer )  
                {
                    // main block/directive
                    if ( !ctx.block /*&& (block = RE_BLOCK.exec( line ))*/ )
                    {
                        keyval = getKeyVal( line );
                        currentBlock = keyval[ 0 ];
                        currentBuffer = ctx.buffer;
                        if ( !currentBuffer[HAS]( currentBlock ) )
                            currentBuffer[ currentBlock ] = keyval[ 1 ];
                        ctx = ctx.push(currentBuffer, currentBlock, keyval[ 2 ]);
                    }
                    else
                    {
                        if ( T_ORDEREDMAP === ctx.type )
                        {
                            keyval = getKeyVal( line );
                            kvmap = {}; kvmap[ keyval[0] ] = keyval[1];
                            ctx.buffer[ ctx.block ].push( kvmap );
                            var pos = ctx.buffer[ ctx.block ].length-1;
                            
                            if ( T_LIST === keyval[2] || T_MAP === keyval[2] || T_ORDEREDMAP === keyval[2] )
                            {
                                ctx = ctx.push(ctx.buffer[ ctx.block ][ pos ], keyval[0], keyval[2]);
                            }
                        }
                        else if ( T_MAP === ctx.type )
                        {
                            keyval = getKeyVal( line );
                            ctx.buffer[ ctx.block ][ keyval[0] ] = keyval[1];
                            
                            if ( T_LIST === keyval[2] || T_MAP === keyval[2] || T_ORDEREDMAP === keyval[2] )
                            {
                                ctx = ctx.push(ctx.buffer[ ctx.block ], keyval[0], keyval[2]);
                            }
                        }
                        else if ( T_LIST === ctx.type )
                        {
                            ctx.buffer[ ctx.block ].push( getVal( line ) );
                        }
                        else //if ( T_VAL === ctx.type )
                        {
                            ctx.buffer[ ctx.block ] = getVal( line );
                            ctx = ctx.pop();
                            if ( !ctx ) ctx = new Context(rootObj, null, T_MAP);
                        }
                    }
                }
            }
            return rootObj;
        }
    };
    // alias
    Custom_Parser.fromString = Custom_Parser.parse;
    
    // export it
    return Custom_Parser;
});