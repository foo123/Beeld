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

ESC = [
['\\n', "\n"],
['\\r', "\r"],
['\\t', "\t"],
['\\v', "\v"],
['\\f', "\f"]
]

T_VAL = 1
T_MAP = 2
T_LIST = 3
T_ORDEREDMAP = 4

RE_NEWLINE = re.compile(r'\n\r|\r\n|\r|\n')
#RE_BLOCK = re.compile(r'^([a-zA-Z0-9\-_]+)\s*(=\[\{\}\]|=\[\]|=\{\}|=)?')
RE_ENDBLOCK = re.compile(r'^(@\s*)+')


def removeComment(s, comm, pos=None):
    s = s.split( comm )
    return s[0].strip()


def getStr(s, q, and_un_escape=True):
    i = 1
    l = len(s) 
    esc = False
    ch = ''
    quoted = ''
    rem = ''
    while i < l:
        ch = s[i]
        i+=1
        if q == ch and not esc: break
        esc = not esc and ('\\' == ch)
        quoted += ch
    rem = s[i:].strip()
    if False != and_un_escape:
        for unesc in ESC:
            quoted = quoted.replace( unesc[0], unesc[1] )
        quoted = quoted.replace( '\\\\', '\\' )
    return [quoted, rem]


def getVal( line ):
    linestartswith = line[0]
    
    # quoted string
    if '"'==linestartswith or "'"==linestartswith or "`"==linestartswith:
        return getStr(line, linestartswith)[0]
    
    # un-quoted string
    else:
        return removeComment(line, '#')
    


def getKeyVal( line ):
    linestartswith = line[0]
    # quoted string
    if '"' == linestartswith or "'" == linestartswith or "`" == linestartswith:
    
        key, line = getStr(line, linestartswith)
        
        # key-value pair
        eq_index = line.find('=', 0)
        comm_index = line.find('#', 0)
        
        if -1 < eq_index and (0 > comm_index or eq_index < comm_index):
            
            val = line[eq_index+1:]
            
            if val.startswith("[{}]"):
            
                return [key, [], T_ORDEREDMAP]
            
            elif val.startswith("[]"):
            
                return [key, [], T_LIST]
            
            elif val.startswith("{}"):
            
                return [key, {}, T_MAP]
            
            if val:
            
                val = val.strip()
                valstartswith = val[0]
                
                # quoted value
                if '"'==valstartswith or "'"==valstartswith or "`"==valstartswith:
                    val = getStr(val, valstartswith)[0]
                else:
                    val = removeComment(val, '#')
                    
        else:
            val = removeComment(line, '#')
    
        return [key, val, T_VAL]
        
    # un-quoted string
    else:
    
        eq_index = line.find('=', 0)
        key = line[0:eq_index].strip()
        val = line[eq_index+1:]
        
        if val.startswith("[{}]"):
        
            return [key, [], T_ORDEREDMAP]
            
        elif val.startswith("[]"):
        
            return [key, [], T_LIST]
        
        elif val.startswith("{}"):
        
            return [key, {}, T_MAP]
        
        if val:
            
            val = val.strip()
            valstartswith = val[0]
            
            # quoted value
            if '"'==valstartswith or "'"==valstartswith or "`"==valstartswith:
                val = getStr(val, valstartswith)[0]
            else:
                val = removeComment(val, '#')
                
        return [key, val, T_VAL]


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
    
    def parse( s ):
        global RE_NEWLINE
        global RE_ENDBLOCK
        
        # rootObj buffers
        rootObj = {}
        
        ctx = Context(rootObj, None, T_MAP)
        
        # parse the lines
        lines = re.split(RE_NEWLINE, str(s))
        
        # parse it line-by-line
        for line in lines:
            
            # strip the line of comments and extra spaces
            line = line.strip()
            
            # empty line or comment, skip it
            if 0==len(line) or '#'==line[0]: continue
            
            # end block/directive
            endblock = RE_ENDBLOCK.match( line )
            if endblock:
            
                numEnds = len(line.split("@"))-1
                
                for j in range(numEnds):
                    if ctx is not None: ctx = ctx.pop()
                    else: break
                
                if ctx is None: ctx = Context(rootObj, None, T_MAP)
                
                continue
            
            
            # if any settings need to be stored, store them in the appropriate buffer
            if ctx.buffer is not None: 
            
                # main block/directive
                if ctx.block is None:
                    
                    keyval = getKeyVal( line )
                    currentBlock = keyval[ 0 ]
                    currentBuffer = ctx.buffer
                    if currentBlock not in currentBuffer:
                        currentBuffer[ currentBlock ] = keyval[ 1 ]
                    ctx = ctx.push(currentBuffer, currentBlock, keyval[ 2 ])
                
                else: 
                    
                    if T_ORDEREDMAP == ctx.type:
                    
                        keyval = getKeyVal( line )
                        kvmap = {}
                        kvmap[ keyval[0] ] = keyval[1]
                        ctx.buffer[ ctx.block ].append( kvmap )
                        pos = len(ctx.buffer[ ctx.block ])-1
                        
                        if T_LIST == keyval[2] or T_MAP == keyval[2] or T_ORDEREDMAP == keyval[2]:
                            
                            ctx = ctx.push(ctx.buffer[ ctx.block ][ pos ], keyval[0], keyval[2])
                        
                    
                    elif T_MAP == ctx.type:
                    
                        keyval = getKeyVal( line )
                        ctx.buffer[ ctx.block ][ keyval[0] ] = keyval[1]
                        
                        if T_LIST == keyval[2] or T_MAP == keyval[2] or T_ORDEREDMAP == keyval[2]:
                            
                            ctx = ctx.push(ctx.buffer[ ctx.block ], keyval[0], keyval[2])
                        
                    
                    elif T_LIST == ctx.type:
                    
                        ctx.buffer[ ctx.block ].append( getVal( line ) )
                    
                    else: # elif T_VAL == isType:
                    
                        ctx.buffer[ ctx.block ] = getVal( line )
                        ctx = ctx.pop()
                        if ctx is None: ctx = Context(rootObj, None, T_MAP)
                
        
        return rootObj

        

# alias
Custom_Parser.fromString = Custom_Parser.parse
            
# for use with 'import *'
__all__ = [ 'Custom_Parser' ]
