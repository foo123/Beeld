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
    
    def parse(s):
        if _hasYaml_:
            return yaml.load( self.read(self.depsFile) )
        else:
            print ("PyYaml is not installed!!")
            sys.exit(1)
        return None
        
# alias
Yaml_Parser.fromString = Yaml_Parser.parse

            
# for use with 'import *'
__all__ = [ 'Yaml_Parser' ]
