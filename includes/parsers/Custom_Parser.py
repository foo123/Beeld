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
T_KEYVAL = 2
T_MAP = 4
T_LIST = 8
T_ORDEREDMAP = 16
T_STRUCTURED = 28 #T_LIST | T_MAP | T_ORDEREDMAP

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
    rem = s[i:]
    if False != and_un_escape:
        for unesc in ESC:
            quoted = quoted.replace( unesc[0], unesc[1] )
        quoted = quoted.replace( '\\\\', '\\' )
    return [quoted, rem.strip()]


#def getVal( line ):
#    linestartswith = line[0]
#    
#    # quoted string
#    if '"'==linestartswith or "'"==linestartswith or "`"==linestartswith:
#        return getStr(line, linestartswith)[0]
#    
#    # un-quoted string
#    else:
#        return removeComment(line, '#')
    

def getKeyVal( line ):
    linestartswith = line[0]
    # quoted string
    if '"' == linestartswith or "'" == linestartswith or "`" == linestartswith:
    
        key, line = getStr(line, linestartswith)
        
        # key-value pair
        eq_index = line.find('=', 0)
        
        if len(line) and 0 == eq_index:
            comm_index = line.find('#', 0)
            if 0 > comm_index or eq_index < comm_index:
                
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
        
            return [key, val, T_KEYVAL]
        
        else:
            # just value, no key-val pair
            return [None, key, T_VAL]
            
    # un-quoted string
    else:
        eq_index = line.find('=', 0)
        if -1 < eq_index:
            key = line[0:eq_index].strip()
            val = line[eq_index+1:]
            
            if not len(key): key = None
            
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
                    
            return [key, val, T_KEYVAL]
        else:
            # just value, no key-val pair
            return [None, removeComment(line, '#'), T_VAL]


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
            
                entry_key,entry_val,entry_type = getKeyVal( line )
                
                # main block/directive
                if ctx.block is None:
                    
                    currentBlock = entry_key
                    currentBuffer = ctx.buffer
                    if currentBlock not in currentBuffer:
                        currentBuffer[ currentBlock ] = entry_val
                    ctx = ctx.push(currentBuffer, currentBlock, entry_type)
                
                else: 
                    
                    if T_ORDEREDMAP == ctx.type:
                    
                        keyval_pair = {}
                        keyval_pair[ entry_key ] = entry_val
                        index = len(ctx.buffer[ ctx.block ])
                        ctx.buffer[ ctx.block ].append( keyval_pair )
                        
                        if T_STRUCTURED & entry_type:
                            ctx = ctx.push(ctx.buffer[ ctx.block ][ index ], entry_key, entry_type)
                        
                    
                    elif T_MAP == ctx.type:
                    
                        ctx.buffer[ ctx.block ][ entry_key ] = entry_val
                        
                        if T_STRUCTURED & entry_type:
                            ctx = ctx.push(ctx.buffer[ ctx.block ], entry_key, entry_type)
                        
                    
                    elif T_LIST == ctx.type:
                    
                        if T_STRUCTURED & entry_type:
                            index = len(ctx.buffer[ ctx.block ])
                            ctx.buffer[ ctx.block ].append( entry_val )
                            ctx = ctx.push(ctx.buffer[ ctx.block ], index, entry_type)
                        else:
                            ctx.buffer[ ctx.block ].append( entry_val )
                        
                    
                    else: # elif T_VAL == isType:
                    
                        ctx.buffer[ ctx.block ] = entry_val
                        ctx = ctx.pop()
                        if ctx is None: ctx = Context(rootObj, None, T_MAP)
                
        
        return rootObj

            
# for use with 'import *'
__all__ = [ 'Custom_Parser' ]
