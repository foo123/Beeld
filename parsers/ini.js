/**
*
*   Simple .ini Parser for JavaScript/Node
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


}(this, 'Ini_Parser', function( undef ) {
    
    var  fs = (require) ? require('fs') : null,
        ACTUAL = {
            '\\n' : "\n",
            '\\t' : "\t",
            '\\v' : "\v",
            '\\f' : "\f"
        },
        comments = [';', '#'], NL = /\n\r|\r\n|\r|\n/g
        //,echo = console.log
    ;
    
    var 
        isKey = Object.prototype.hasOwnProperty, 
        Keys = Object.keys, 
        Str = Object.prototype.toString,

        is_string = function(o) {
            return (o && (typeof(o)=='string' || o instanceof String));
        },
        
        is_object = function(o) {
            return (o && "[object Object]"==Str.call(o));
        },
        
        is_array = function(o) {
            return (o && "[object Array]"==Str.call(o));
        },
        /*
        clone = function(o) {
            if (is_array(o)) 
            {
                return o.slice();
            }
            else if (is_object(o))
            {
                var c = {};
                for (var k in o)
                {
                    if (isKey.call(o, k))
                    {
                        c[k] = o[k];
                    }
                }
                return c;
            }
            else
            {
                return o;
            }
        },
        
        clone2 = function(o) {
            return JSON.parse(JSON.stringify(o));
        },
        */
        empty = function(o) {
            return (!o || (typeof(o)=='object' && !Keys(o).length));
        },
        
        trim = function(s) {
            return s.replace(/^\s+/g, '').replace(/\s+$/g, '');
        },
        
        array_keys = function(o) {
            //var keys = [], k;
            
            if (!empty(o))
            {
                return Keys(o);
                /*for (k in o) 
                {
                    if (isKey.call(o, k)) 
                        keys.push(k);
                }*/
            }
            return []; //keys;
        },
        
        parseStr = function(s, q) {
            var endq = s.indexOf(q, 1);
            var quoted = s.substr(1, endq-1);
            var rem = trim( s.substr( endq ) );
            for (var c in ACTUAL)
                quoted = quoted.split( c ).join( ACTUAL[c] );
            quoted = quoted.split( '\\\\' ).join( '\\' );
            return [quoted, rem];
        },
        
        walk = function(o, key, top, q, EOL)  {
            var 
                s = '', section, keys, keyvals, k, v,
                i, l
            ;
            
            if (!empty(o))
            {
                if (key) keys = [key];
                else keys = array_keys(o);
                
                l = keys.length;
                
                for (i=0; i<l; i++)
                {
                    section = keys[i];
                    
                    if (!isKey.call(o, section)) continue;
                    
                    keyvals = o[section];
                    
                    if (empty(keyvals))  continue;
                    
                    s += top + "["+section+"]" + EOL;
                    
                    if (keyvals['__list__'] && is_array(keyvals['__list__']) && !empty(keyvals['__list__']))
                    {
                        // only values as a list
                        s += q + keyvals['__list__'].join(q+EOL+q) + q + EOL;
                        delete keyvals['__list__'];
                    }
                    
                    if (!empty(keyvals))
                    {
                        for (k in keyvals)
                        {
                            if (!isKey.call(keyvals, k)) continue;
                            
                            v = keyvals[k];
                            
                            if (!v) continue;
                            
                            if (is_object(v) || is_array(v))
                            {
                                // sub-section
                                s += walk(keyvals, k, top+"["+section+"]", q, EOL);
                            }
                            else
                            {
                                // key-value pair
                                s += q+k+q+ '=' +q+v+q + EOL;
                            }
                        }
                    }
                    s += EOL;
                }
            }
            
            return s;
        }
    ;
    
    var IniParser = self = {
        
        fromString : function(s, keysList, rootSection)  {
            
            var
                sections = {},
                lines, line, lenlines, i, currentSection, currentRoot,
                linestartswith, pair, key, value, valuestartswith,
                endsection, SECTION, res
            ;
            
            keysList = (undef===keysList) ? true : keysList;
            currentSection = (rootSection && rootSection.length) ? (''+rootSection) : '_';
            
            if (keysList)
                sections[currentSection] = { '__list__' : [] };
            else
                sections[currentSection] = {  };
            currentRoot = sections;
            
            // parse the lines
            s = ''+s;
            lines = s.split(NL);
            lenlines = lines.length
            
            // parse it line-by-line
            for (i=0; i<lenlines; ++i)
            {
                // strip the line of extra spaces
                line = trim(lines[i]);
                
                // comment or empty line, skip it
                if ( (0>=line.length) || (comments.indexOf(line[0])>-1) ) continue;
                
                linestartswith = line[0];
                
                // section(s) line
                if ('['==linestartswith)
                {
                    SECTION = true;
                    
                    // parse any sub-sections
                    while ('['==linestartswith)
                    {
                        currentRoot = (SECTION) ? sections : currentRoot[currentSection];
                        
                        SECTION = false;
                        
                        endsection = line.indexOf(']', 1);
                        currentSection = line.substr(1, endsection-1);
                        
                        if (!currentRoot[currentSection])
                        {
                            if (keysList)
                                currentRoot[currentSection] = { '__list__' : [] };
                            else
                                currentRoot[currentSection] = {  };
                        }
                        
                        // has sub-section ??
                        line = trim(line.substr(endsection+1))
                        if (!line.length)  break;
                        linestartswith = line[0];
                    }
                }
                
                // key-value pairs
                else
                {
                    // quoted string
                    if ('"'==linestartswith || "'"==linestartswith)
                    {
                        res = parseStr(line, linestartswith);
                        key = res[0];
                        line = res[1];
                        
                        // key-value pair
                        if (line.indexOf('=')>-1)
                        {
                            line = line.split('=');
                            line.shift()
                            value = trim(line.join('='));
                            valuestartswith = value[0];
                            
                            // quoted value
                            if ('"'==valuestartswith || "'"==valuestartswith)
                            {
                                res = parseStr(value, valuestartswith);
                                value = res[0];
                            }
                            
                            currentRoot[currentSection][key] = value;
                        }
                        // single value
                        else
                        {
                            if (keysList)
                                currentRoot[currentSection]['__list__'].push(key);
                            else
                                currentRoot[currentSection][key] = true;
                        }
                    }
                    // un-quoted string
                    else
                    {
                        line = line.split('=');
                        key = trim(line.shift());
                        
                        // single value
                        if (1>line.length)
                        {
                            if (keysList)
                                currentRoot[currentSection]['__list__'].push(key);
                            else
                                currentRoot[currentSection][key] = true;
                        }
                        // key-value pair
                        else
                        {
                            value = trim(line.join('='));
                            valuestartswith = value[0];
                            
                            // quoted value
                            if ('"'==valuestartswith || "'"==valuestartswith)
                            {
                                res = parseStr(value, valuestartswith);
                                value = res[0];
                            }
                            
                            currentRoot[currentSection][key] = value;
                        }
                    }
                }
            }
            return sections;
        },
        
        fromFile : function(filename, keysList, rootSection) {
            if (fs)
            {
                return self.fromString( fs.readFileSync(filename, keysList, rootSection) );
            }
            return '';
        },
        
        toString : function(o, rootSection, quote, EOL) {
            var
                s = '', 
                root = (rootSection) ? (''+rootSection) : '_',
                q = (undef===quote || !quote) ? '' : '"',
                section, list, k, v
            ;
            EOL = EOL || "\n";
            
            // clone it
            //o = clone2(o);
            
            // dump the root section first, if exists
            if (!empty(o[root]))
            {
                section = o[root];
                
                list = null;
                if (section['__list__'])
                {
                    list = section['__list__'];
                    
                    if (list && is_array(list) && !empty(list))
                    {
                        s += q + list.join(q+EOL+q) + q + EOL;
                        delete section['__list__'];
                    }
                }
                
                for (k in section)
                {
                    if (!isKey.call(section, k)) continue;
                    
                    v = section[k];
                    
                    if (empty(v)) continue;
                    
                    // key-value pair
                    s += q+k+q+ '=' +q+v+q + EOL;
                }
                
                s += EOL;
                
                delete o[root];
            }
            
            // walk the sections and sub-sections, if any
            s += walk(o, null, '', q, EOL);
            
            return s;
        },
        
        toFile : function(filename, o, rootSection, quote, EOL) {
            if (fs)
            {
                return fs.writeFileSync( filename, self.toString(o, rootSection, quote, EOL) );
            }
            return false;
        }
    };
    
    // export it
    IniParser;
});