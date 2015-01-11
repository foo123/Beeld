##
#
#   Custom Parser for Python 2.x, 3.x
#
#   @author Nikos M.  
#   https://foo123.github.com/
#   http://nikos-web-development.netai.net/
#
##
#import pprint
import re

class Context():
    
    def __init__(self, buffer=None, block=None, type=None, prev=None):
        self.buffer = buffer
        self.block = block
        self.type = type
        self.prev = prev;
        self.next = None
        
    def push(self, buffer=None, block=None, type=None):
        ctx = Context(buffer, block, type, self)
        self.next = ctx
        return ctx

    def pop(self):
        return self.prev;

        
class Custom_Parser():
    """Custom parser for Python"""
    
    MAP = 1
    LIST = 2
    ORDEREDMAP = 3
    VAL = 0
    
    NL = None
    BLOCK = None
    ENDBLOCK = None
    
    ACTUAL = {
        '\\n' : "\n",
        '\\t' : "\t",
        '\\v' : "\v",
        '\\f' : "\f"
    }
    
    def removeComment(s, comm):
        s = s.split( comm )
        return s[0].strip()
    
    
    def parseStr(s, q):
        _self =Custom_Parser
        
        endq = s.find(q, 1)
        quoted = s[1:endq]
        rem = s[endq+1:].strip()
        for c,actual in _self.ACTUAL.items():
            quoted = ( actual ).join( quoted.split( c ) )
        quoted = ( '\\' ).join( quoted.split( '\\\\' ) )
        return quoted, rem
    
    def getQuotedValue( line ):
        _self = Custom_Parser
        
        linestartswith = line[0]
        
        # quoted string
        if '"'==linestartswith or "'"==linestartswith or "`"==linestartswith:
        
            key, line = _self.parseStr(line, linestartswith)
            return key
        
        # un-quoted string
        else:
            return _self.removeComment(line, '#')
        
    
    
    def getKeyValuePair(line):
        _self = Custom_Parser
        
        linestartswith = line[0]
        # quoted string
        if '"' == linestartswith or "'" == linestartswith or "`" == linestartswith:
        
            key, line = _self.parseStr(line, linestartswith)
            
            # key-value pair
            eq_index = line.find('=', 0)
            comm_index = line.find('#', 0)
            if eq_index>-1 and (comm_index<0 or eq_index<comm_index):
                
                line = line.split('=')
                line.pop(0)
                value = "=".join(line)
                
                if value.startswith("[{}]"):
                
                    return [key, [], _self.ORDEREDMAP]
                
                elif value.startswith("[]"):
                
                    return [key, [], _self.LIST]
                
                elif value.startswith("{}"):
                
                    return [key, {}, _self.MAP]
                
                if value:
                
                    value = value.strip()
                    valuestartswith = value[0]
                    
                    # quoted value
                    if '"'==valuestartswith or "'"==valuestartswith or "`"==valuestartswith:
                        value, rem = _self.parseStr(value, valuestartswith)
                    else:
                        value = _self.removeComment(value, '#')\
                        
            else:
                line = line.split('=')
                line.pop(0)
                value = _self.removeComment("=".join(line), '#')
        
            return [key, value, _self.VAL]
            
        # un-quoted string
        else:
        
            line = line.split('=')
            key = line.pop(0).strip()
            value = "=".join(line)
            
            if value.startswith("[{}]"):
            
                return [key, [], _self.ORDEREDMAP]
                
            elif value.startswith("[]"):
            
                return [key, [], _self.LIST]
            
            elif value.startswith("{}"):
            
                return [key, {}, _self.MAP]
            
            if value:
                
                value = value.strip()
                valuestartswith = value[0]
                
                # quoted value
                if '"'==valuestartswith or "'"==valuestartswith or "`"==valuestartswith:
                    value, rem = _self.parseStr(value, valuestartswith)
                else:
                    value = _self.removeComment(value, '#')
                    
            return [key, value, _self.VAL]
    
    
    def fromString(s):
        _self = Custom_Parser
        
        if not _self.NL:
            _self.NL = re.compile(r'\n\r|\r\n|\r|\n')
        
        if not _self.BLOCK:
            _self.BLOCK = re.compile(r'^([a-zA-Z0-9\-_]+)\s*(=\[\{\}\]|=\[\]|=\{\}|=$)?')
        
        if not _self.ENDBLOCK:
            _self.ENDBLOCK = re.compile(r'^(@\s*)+')
            
        # settings buffers
        settings = {}
        
        ctx = Context(settings, None, _self.MAP)
        
        # parse the lines
        lines = re.split(_self.NL, str(s))
        
        # parse it line-by-line
        for line in lines:
            
            # strip the line of comments and extra spaces
            line = line.strip()
            
            # comment or empty line, skip it
            if 0==len(line) or '#'==line[0]: continue
            
            # block/directive line, parse it
            block = _self.BLOCK.match( line )
            if (ctx.block is None) and block:
                
                
                currentBlock = block.group(1)
                block3 = block.group(2)
                if  (block3 is None) or ('='==block3): isType = _self.VAL
                elif '=[{}]'==block3: isType = _self.ORDEREDMAP
                elif '=[]'==block3: isType = _self.LIST
                elif '={}'==block3: isType = _self.MAP
                
                currentBuffer = ctx.buffer
                
                if currentBlock not in currentBuffer:
                
                    if _self.LIST == isType:
                        currentBuffer[ currentBlock ] = []
                    elif _self.ORDEREDMAP == isType:
                        currentBuffer[ currentBlock ] = []
                    elif _self.MAP == isType:
                        currentBuffer[ currentBlock ] = {}
                    else:
                        currentBuffer[ currentBlock ] = ''
                
                ctx = ctx.push(currentBuffer, currentBlock, isType)
                    
                continue
                
            endblock = _self.ENDBLOCK.match( line )
            if endblock:
            
                numEnds = len(line.split("@"))-1
                
                for j in range(numEnds):
                    if ctx is not None: ctx = ctx.pop()
                    else: break
                
                if ctx is None: ctx = Context(settings, None, _self.MAP)
                
                continue
            
            # if any settings need to be stored, store them in the appropriate buffer
            if (ctx.block is not None) and (ctx.buffer is not None): 
                
                if _self.ORDEREDMAP == ctx.type:
                
                    keyval = _self.getKeyValuePair( line )
                    kvmap = {}
                    kvmap[ keyval[0] ] = keyval[1]
                    ctx.buffer[ ctx.block ].append( kvmap )
                    pos = len(ctx.buffer[ ctx.block ])-1
                    
                    if _self.LIST == keyval[2] or _self.MAP == keyval[2] or _self.ORDEREDMAP == keyval[2]:
                        
                        ctx = ctx.push(ctx.buffer[ ctx.block ][ pos ], keyval[0], keyval[2])
                    
                
                elif _self.MAP == ctx.type:
                
                    keyval = _self.getKeyValuePair( line )
                    ctx.buffer[ ctx.block ][ keyval[0] ] = keyval[1]
                    
                    if _self.LIST == keyval[2] or _self.MAP == keyval[2] or _self.ORDEREDMAP == keyval[2]:
                        
                        ctx = ctx.push(ctx.buffer[ ctx.block ], keyval[0], keyval[2])
                    
                
                elif _self.LIST == ctx.type:
                
                    ctx.buffer[ ctx.block ].append( _self.getQuotedValue( line ) )
                
                else: # elif _self.VAL == isType:
                
                    ctx.buffer[ ctx.block ] = _self.getQuotedValue( line )
                    ctx = ctx.pop()
                    if ctx is None: ctx = Context(settings, None, _self.MAP)
                
        
        return settings

    
    def fromFile(filename):
        s = ''
        with open(filename, 'r') as f:  s = f.read()
        return Custom_Parser.fromString(s)
        


            
# for use with 'import *'
__all__ = [ 'Custom_Parser' ]
