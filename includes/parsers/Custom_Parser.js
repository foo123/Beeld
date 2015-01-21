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
        T_KEYVAL = 2,
        T_MAP = 4,
        T_LIST = 8,
        T_ORDEREDMAP = 16,
        T_STRUCTURED = 28 //T_LIST | T_MAP | T_ORDEREDMAP
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
            rem = s.slice( i );
            if ( false !== and_un_escape )
            {
                for (i=0; i<ESC.length; i++)
                    quoted = quoted.split( ESC[i][0] ).join( ESC[i][1] );
                quoted = quoted.split( '\\\\' ).join( '\\' );
            }
            return [quoted, trim(rem)];
        },
        
        /*getVal = function( line ) {
            var linestartswith = line[CHAR](0);
            // quoted string
            if ( '"'==linestartswith || "'"==linestartswith || "`"==linestartswith )
                return getStr( line, linestartswith )[0];
            // un-quoted string
            else
                return removeComment( line, '#' );
        },*/
        
        getKeyVal = function( line ) {
            var linestartswith = line[CHAR](0), res, key, val,
                eq_index, comm_index, valstartswith;
            
            // quoted string
            if ( '"'==linestartswith || "'"==linestartswith || "`"==linestartswith )
            {
                res = getStr(line, linestartswith);
                key = res[0]; line = res[1];
                
                eq_index = line.indexOf('=');
                if ( line.length && 0 === eq_index )
                {
                    // key-value pair
                    comm_index = line.indexOf('#');
                    if ( 0 > comm_index || eq_index < comm_index )
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
                                val = removeComment(val, '#');
                            }
                        }
                    }
                    else
                    {
                        val = removeComment(line, '#', comm_index);
                    }
                    return [key, val, T_KEYVAL];
                }
                else
                {
                    // just value, no key-val pair
                    return [null, key, T_VAL];
                }
            }
            // un-quoted string
            else
            {
                eq_index = line.indexOf('=');
                if ( -1 < eq_index )
                {
                    key = trim(line.slice(0, eq_index));
                    val = line.slice(eq_index+1);
                    
                    if ( !key.length ) key = null;
                    
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
                    
                    return [key, val, T_KEYVAL];
                }
                else
                {
                    // just value, no key-val pair
                    return [null, removeComment(line, '#'), T_VAL];
                }
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
            var i, line, lines, lenlines, block, endblock, j, jlen, numEnds, 
                entry, keyval_pair, index, entry_key, entry_val, entry_type;

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
                    entry = getKeyVal( line );
                    entry_key = entry[0]; entry_val = entry[1]; entry_type = entry[2];
                    
                    // main block/directive
                    if ( null === ctx.block )
                    {
                        currentBlock = entry_key; currentBuffer = ctx.buffer;
                        if ( !currentBuffer[HAS]( currentBlock ) )
                            currentBuffer[ currentBlock ] = entry_val;
                        ctx = ctx.push(currentBuffer, currentBlock, entry_type);
                    }
                    else
                    {
                        if ( T_ORDEREDMAP === ctx.type )
                        {
                            index = ctx.buffer[ ctx.block ].length;
                            keyval_pair = {}; keyval_pair[ entry_key ] = entry_val;
                            ctx.buffer[ ctx.block ].push( keyval_pair );
                            
                            if ( T_STRUCTURED & entry_type )
                            {
                                ctx = ctx.push(ctx.buffer[ ctx.block ][ index ], entry_key, entry_type);
                            }
                        }
                        else if ( T_MAP === ctx.type )
                        {
                            //if ( T_KEYVAL === entry_type )
                            ctx.buffer[ ctx.block ][ entry_key ] = entry_val;
                            
                            if ( T_STRUCTURED & entry_type )
                            {
                                ctx = ctx.push(ctx.buffer[ ctx.block ], entry_key, entry_type);
                            }
                        }
                        else if ( T_LIST === ctx.type )
                        {
                            if ( T_STRUCTURED & entry_type )
                            {
                                index = ctx.buffer[ ctx.block ].length;
                                ctx.buffer[ ctx.block ].push( entry_val );
                                ctx = ctx.push(ctx.buffer[ ctx.block ], index, entry_type);
                            }
                            else
                            {
                                ctx.buffer[ ctx.block ].push( entry_val );
                            }
                        }
                        else //if ( T_VAL === ctx.type )
                        {
                            ctx.buffer[ ctx.block ] = entry_val;
                            ctx = ctx.pop();
                            if ( !ctx ) ctx = new Context(rootObj, null, T_MAP);
                        }
                    }
                }
            }
            return rootObj;
        }
    };
    
    // export it
    return Custom_Parser;
});