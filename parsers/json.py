##
#
#   Json Parser for Python 2.x, 3.x
#
#   @author Nikos M.  
#   https://foo123.github.com/
#   http://nikos-web-development.netai.net/
#
##
import json

class Json_Parser():
    """Json parser for Python"""
    
    def parse(s):
        return json.loads( s )
        


            
# for use with 'import *'
__all__ = [ 'Json_Parser' ]
