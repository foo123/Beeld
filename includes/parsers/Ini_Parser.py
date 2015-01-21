##
#
#   Simple .ini Parser for Python 2.x, 3.x
#
#   @author Nikos M.  
#   https://foo123.github.com/
#   http://nikos-web-development.netai.net/
#
##
import re

class Ini_Parser():
    """Simple .ini parser for Python"""
    
    NL = None
    
    ACTUAL = {
        '\\n' : "\n",
        '\\t' : "\t",
        '\\v' : "\v",
        '\\f' : "\f"
    }
    
    def parseStr(s, q):
        _self = Ini_Parser
        
        endq = s.find(q, 1)
        quoted = s[1:endq]
        rem = s[endq+1:].strip()
        for c,actual in _self.ACTUAL.items():
            quoted = ( actual ).join( quoted.split( c ) )
        quoted = ( '\\' ).join( quoted.split( '\\\\' ) )
        return quoted, rem
    
    def fromString(s, keysList=True, rootSection='_'):
        _self = Ini_Parser
        
        comments = [';', '#']
        
        if rootSection:  rootSection = str(rootSection)
        else: rootSection = '_'
        
        if not _self.NL:
            _self.NL = re.compile(r'\n\r|\r\n|\r|\n')
        
        sections = {}
        currentSection = str(rootSection)
        if keysList:
            sections[currentSection] = { '__list__' : [] }
        else:
            sections[currentSection] = {  }
        currentRoot = sections
        
        # parse the lines
        lines = re.split(_self.NL, str(s))
        
        # parse it line-by-line
        for line in lines:
            # strip the line of extra spaces
            line = line.strip()
            lenline = len(line)
            
            # comment or empty line, skip it
            if not lenline or (line[0] in comments): continue
            
            linestartswith = line[0]
            
            # section line
            if '['==linestartswith:
                
                SECTION = True
                
                # parse any sub-sections
                while '['==linestartswith:
                
                    if SECTION:
                        currentRoot = sections
                    else:
                        currentRoot = currentRoot[currentSection]
                    
                    SECTION = False
                    
                    endsection = line.find(']', 1)
                    currentSection = line[1:endsection]
                    
                    if currentSection not in currentRoot:
                    
                        if keysList:
                            currentRoot[currentSection] = { '__list__' : [] }
                        else:
                            currentRoot[currentSection] = {  }
                    
                    
                    # has sub-section ??
                    line = line[endsection+1:].strip()
                    
                    if not len(line):  break
                    
                    linestartswith = line[0]
            
            # key-value pairs
            else:
            
                # quoted string
                if '"'==linestartswith or "'"==linestartswith:
                
                    key, line = _self.parseStr(line, linestartswith)
                    
                    # key-value pair
                    if line.find('=', 0)>-1:
                        line = line.split('=')
                        line.pop(0)
                        value = "=".join(line).strip()
                        valuestartswith = value[0]
                        
                        # quoted value
                        if '"'==valuestartswith or "'"==valuestartswith:
                            value, rem = _self.parseStr(value, valuestartswith)
                        
                        currentRoot[currentSection][key] = value
                    
                    # single value
                    else:
                    
                        if keysList:
                            currentRoot[currentSection]['__list__'].append(key)
                        else:
                            currentRoot[currentSection][key] = True
                    
                
                # un-quoted string
                else:
                
                    line = line.split('=')
                    key = line.pop(0).strip()
                
                    # single value
                    if 1>len(line):
                        
                        if keysList:
                            currentRoot[currentSection]['__list__'].append(key)
                        else:
                            currentRoot[currentSection][key] = True
                    
                    # key-value pair
                    else:
                    
                        value = "=".join(line).strip()
                        valuestartswith = value[0]
                        
                        # quoted value
                        if '"'==valuestartswith or "'"==valuestartswith:
                            value, rem = _self.parseStr(value, valuestartswith)
                        
                        currentRoot[currentSection][key] = value
                    
        
        return sections

    
    def fromFile(filename, keysList=True, rootSection='_'):
        s = ''
        with open(filename, 'r') as f:  s = f.read()
        return Ini_Parser.fromString(s, keysList, rootSection)
        
    
    def walk(o, key=None, top='', q='', EOL="\n"):
        s = ''
        
        if len(o):
        
            o = dict(o)
            
            if key: keys = [key]
            else: keys = o.keys()
            
            for section in keys:
            
                keyvals = o[section]
                if not len(keyvals):  continue
                
                s += str(top) + "[" + str(section) + "]" + EOL
                
                if ('__list__' in keyvals) and len(keyvals['__list__']):
                
                    # only values as a list
                    s += q + (q+EOL+q).join(keyvals['__list__']) + q + EOL
                    del keyvals['__list__']
                
                
                if len(keyvals):
                
                    for k,v in keyvals.items():
                    
                        if not len(v): continue
                        
                        if isinstance(v, dict) or isinstance(v, list):
                        
                            # sub-section
                            s += Ini_Parser.walk(keyvals, k, top + "[" + str(section) + "]", q, EOL)
                        
                        else:
                        
                            # key-value pair
                            s += q+k+q+ '=' +q+v+q + EOL
                        
                    
                
                s += EOL
            
        return s
    
    def toString(o, rootSection='_', quote=False, EOL="\n"):
        s = ''
        
        if rootSection: root = str(rootSection)
        else: root = '_'
        
        if quote: q = '"'
        else: q = ''
        
        # dump the root section first, if exists
        if root in o:
            section = dict(o[root])
            
            llist = None
            if '__list__' in section:
                llist = section['__list__']
                
                if llist and isinstance(llist, list) and len(llist):
                
                    s += q + (q+EOL+q).join(llist) + q + EOL
                    del section['__list__']
                
            
            for k,v in section.items():
            
                if not len(v): continue
                s += q+k+q+ '=' +q+v+q + EOL
            
            
            s += EOL
            
            del o[root]
        
        
        # walk the sections and sub-sections, if any
        s += Ini_Parser.walk(o, None, '', q, EOL)
        
        return s
    
    def toFile(filename, o, rootSection='_', quote=False, EOL="\n"):
        with open(filename, 'w') as f:  
            f.write( Ini_Parser.toString(o, rootSection, quote, EOL) )


            
# for use with 'import *'
__all__ = [ 'Ini_Parser' ]
