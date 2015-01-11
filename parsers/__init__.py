##
#
#   Simple .INI Parser for Python
#   @Nikos M.
#
##
import re

class IniParser():
    """Simple .ini parser for Python"""
    
    def __init__(self, keysList=True, rootSection='_'):
        self.input = ''
        self.comments = [';', '#']
        self.NLRX = re.compile(r'\n\r|\r\n|\r|\n')
        self.keysList = keysList
        self.root = rootSection
        
    def fromFile(self, filename):
        input = ''
        with open(filename, 'r') as f:
            input = f.read()
        self.input = input
        return self
        
    def fromString(self, input):
        self.input = input
        return self
        
    def parse(self):
        sections = {}
        comments = self.comments
        keysList = self.keysList
        
        currentSection = self.root
        if keysList:
            sections[currentSection] = { '__list__' : [] }
        else:
            sections[currentSection] = {  }
        
        # read the dependencies file
        lines = re.split(self.NLRX, self.input)
        
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
                
                currentSection = line[1:-1]
                
                if currentSection not in sections:
                    if keysList:
                        sections[currentSection] = { '__list__' : [] }
                    else:
                        sections[currentSection] = {  }
                continue
            
            # quoted strings as key-value pairs line
            elif '"'==linestartswith or "'"==linestartswith:
                
                endquote = line.find(linestartswith, 1)
                key = line[1:endquote]
                line = line[endquote+1:].strip()
                
                if line.find('=', 0)>-1:
                    value = line.split('=', 2)[1].strip()
                    valuestartswith = value[0]
                    
                    if '"'==valuestartswith or "'"==valuestartswith:
                        
                        endquote = value.find(valuestartswith, 1)
                        value = value[1:endquote]
                    
                    sections[currentSection][key] = value
                
                else:
                    if keysList:
                        sections[currentSection]['__list__'].append(key)
                    else:
                        sections[currentSection][key] = True
                continue
            
            # key-value pairs line
            else:
                pair = line.split('=', 2)
                
                if len(pair)<2:
                    key = pair[0].strip()
                    if keysList:
                        sections[currentSection]['__list__'].append(key)
                    else:
                        sections[currentSection][key] = True
                
                else:
                    key = pair[0].strip()
                    value = pair[1].strip()
                    sections[currentSection][key] = value
                continue
        
        
        return sections

        
# test
#input ="""
## Lines starting with # are comments and are NOT processed
## Lines starting with @ are directives and describe how the build is going to be processed
#
## The input files
#[@DEPENDENCIES]
#../src/file1.js
#../src/file2.js
#
## TODO, allow some pre-process to take place
##[@PREPROCESS]
#
## Minify the Package
#[@MINIFY]
#
## Options for Node UglifyJS Compiler (if used, default), (mangle and compress)
#[@UGLIFY]
#"-m -c"
#
## Options for Java Closure Compiler (if used)
#[@CLOSURE]
#"--language_in=ECMASCRIPT5_STRICT"
#"foo=123"="foo123"
#"foo=1234"=foo123
#
## Options for Java YUI Compressor Compiler (if used)
#[@YUI]
#"--preserve-semi"
#
## Options for CSS Minifier, if the files are .css
#[@CSSMIN]
#"--embed-images"
##"--embed-fonts"
#
## TODO, allow some post-process to take place
##[@POSTPROCESS]
#
## The final output file
#[@OUT]
#../build/package_output.min.js
#"""
#
#parser = IniParser()
#print(parser.fromString(input).parse())
