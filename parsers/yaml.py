##
#
#   Yaml Parser for Python 2.x, 3.x
#
#   @author Nikos M.  
#   https://foo123.github.com/
#   http://nikos-web-development.netai.net/
#
##
#import pprint
try:
    import yaml
    _hasYaml_ = 1
except ImportError:
    _hasYaml_ = 0

class Yaml_Parser():
    """Yaml parser for Python"""
    
    def fromString(s):
        if _hasYaml_:
            return yaml.load( self.read(self.depsFile) )
        else:
            print ("PyYaml is not installed!!")
            sys.exit(1)
        return None
    
    def fromFile(filename):
        s = ''
        with open(filename, 'r') as f:  s = f.read()
        return Yaml_Parser.fromString(s)
        


            
# for use with 'import *'
__all__ = [ 'Yaml_Parser' ]
