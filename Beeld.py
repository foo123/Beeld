#!/usr/bin/env python
##
#
#   Beeld
#   https://github.com/foo123/Beeld
#
#   A scriptable and configurable source code builder framework in Node/PHP/Python
#   @version: 0.5
#
##

import os, tempfile, sys, re

try:
    import argparse
    ap = 1
except ImportError:
    import optparse
    ap = 0

compilersPath = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'compilers') + '/'
templatesPath = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates') + '/'
parsersPath = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'parsers') + '/'

def read(file, enc=None):
    buffer = ''
    if enc: f = open(file, "r", -1, enc)
    else: f = open(file, "r")
    buffer = f.read()
    f.close()
    return buffer
    
def write(file, text, enc=None):
    if enc: f = open(file, "w", -1, enc)
    else: f = open(file, "w")
    f.write(text)
    f.close()
    
def joinPath(*args): 
    argslen = len(args)
    DS = os.sep
    
    if 0==argslen: return "."
    
    path = DS.join(args)
    plen = len(path)
    
    if 0==plen: return "."
    
    isAbsolute    = path[0]
    trailingSlash = path[plen - 1]

    # http://stackoverflow.com/questions/3845423/remove-empty-strings-from-a-list-of-strings
    peices = [x for x in re.split(r'[\/\\]', path) if x]
    
    new_path = []
    up = 0
    i = len(peices)-1
    while i>=0:
        last = peices[i]
        if last == "..":
            up = up+1
        elif last != ".":
            if up>0:  up = up-1
            else:  new_path.append(peices[i])
        i = i-1
    
    path = DS.join(new_path[::-1])
    plen = len(path)
    
    if 0==plen and 0==len(isAbsolute):
        path = "."

    if 0!=plen and trailingSlash == DS:
        path += DS

    if isAbsolute == DS:
        return DS + path
    else:
        return path

# http://www.php2python.com/wiki/function.pathinfo/
def fileExt(fileName):
    extension  = os.path.splitext(fileName)[-1]
    if extension is not None:
        return extension
    return ''
    
def tmpfile():
    f = tempfile.NamedTemporaryFile(delete=False)
    f.close()
    return f.name
    
def import_path(fullpath='./', doReload=False):
    """ 
    Import a file with full path specification. Allows one to
    import from anywhere, something __import__ does not do. 
    """
    path, filename = os.path.split(os.path.abspath(fullpath))
    filename, ext = os.path.splitext(filename)
    sys.path.append(path)
    module = __import__(filename)
    if doReload: reload(module) # Might be out of date
    del sys.path[-1]
    return module
        
def cleanup(files):
    for file in files:
        if file:
            try:
                os.unlink(file)
            except: 
                pass
        
def getRealPath(file, basePath=''):
    if ''!=basePath and (file.startswith('./') or file.startswith('../') or file.startswith('.\\') or file.startswith('..\\')): 
        return joinPath(basePath, file)
    else:
        return file

TPLS = {}
def getTpl(id, enc=None):
    global TPLS
    tpl_id = 'tpl_' + id
    if tpl_id not in TPLS:
        TPLS[tpl_id] = read( templatesPath + id, enc )
    return str(TPLS[tpl_id])[:]
    

def parseOptions( defaults ):
    # parse args
    if ap:
        parser = argparse.ArgumentParser(description="Build Source Code Packages (js/css)")
        parser.add_argument('--config', help="configuration file (REQUIRED)", metavar="FILE")
        parser.add_argument('--tasks', help="specific tasks to run with commas (OPTIONAL) \nDEFAULT: all tasks defined in config file", default=defaults['tasks'])
        parser.add_argument('--compiler', help="source compiler to use (OPTIONAL) \nWhether to use uglifyjs, closure, \nyui, or cssmin compiler \nDEFAULT: uglifyjs", default=defaults['compiler'])
        parser.add_argument('--enc', help="set text encoding \nDEFAULT: utf-8", metavar="ENCODING", default=defaults['enc'])
        options = parser.parse_args()

    else:
        parser = optparse.OptionParser(description='Build Source Code Packages (js/css)')
        parser.add_option('--config', help="configuration file (REQUIRED)", metavar="FILE")
        parser.add_option('--tasks', dest='tasks', help="specific tasks to run with commas (OPTIONAL) \nDEFAULT: all tasks defined in config file", default=defaults['tasks'])
        parser.add_option('--compiler', dest='compiler', help="source compiler to use (OPTIONAL) \nWhether to use uglifyjs, closure, \nyui, or cssmin compiler \nDEFAULT: uglifyjs", default=defaults['compiler'])
        parser.add_option('--enc', dest='enc', help="set text encoding \nDEFAULT: utf-8", metavar="ENCODING", default=defaults['enc'])
        options, remainder = parser.parse_args()

    # If no arguments have been passed, show the help message and exit
    if len(sys.argv) == 1:
        parser.print_help()
        sys.exit(1)
    
    # Ensure variable is defined
    try:
        options.config
    except NameError:
        options.config = None

    # If no dependencies have been passed, show the help message and exit
    if None == options.config:
        parser.print_help()
        sys.exit(1)
    
    return options

class DynamicObject:
    def __init__(self, properties=None):
        if properties:
            for k,v in properties.items(): setattr(self, k, v)
    

class DTO:
    Params = DynamicObject
    
    def __init__(self, params=None, next=None, abort=None):
        self._params = params
        self._next = next
        self._abort = abort
        
    def dispose(self):
        self._params = None
        self._next = None
        self._abort = None
        return self
        
    def params(self):
        return self._params
        
    def next(self):
        if self._next and callable(self._next):
            return self._next( self._params )
        return self._params
    
    def abort(self):
        if self._abort and callable(self._abort):
            return self._abort( self._params )
        return self._params

class Pipeline: 
    DTO = DTO
    
    dummyAbort = lambda params: params
    
    def __init__(self):
        self._tasks = [ ]
        self._abort = None
    def dispose(self):
        self._tasks = None
        self._abort = None
        return self
        
    def add(self, task):
        self._tasks.append( task )
        return self
        
    def abort(self, abortFunc):
        self._abort = abortFunc
        return self
        
    def run(self, params):
        tasks = self._tasks
        if tasks:
            task = tasks.pop( 0 )
            next = lambda params: self.run( params )
            if self._abort and callable(self._abort):
                abort = lambda params: self._abort( params )
            else:
                abort = Pipeline.dummyAbort
            if task and callable(task): return task( DTO(params, next, abort) )
        return params
        
    
class BeeldParsers:
    
    Path = parsersPath
    JSON = None
    YAML = None
    CUSTOM = None
    
    def init():
        parsers = BeeldParsers
        
        def JSON_load():
            return import_path(BeeldParsers.JSON.path).Json_Parser
        
        def JSON_parse( text ):
            if not BeeldParsers.JSON.parser:
                BeeldParsers.JSON.parser = BeeldParsers.JSON.load( )
            return BeeldParsers.JSON.parser.parse( text )
        
        def YAML_load():
            return import_path(BeeldParsers.YAML.path).Yaml_Parser
        
        def YAML_parse( text ):
            if not BeeldParsers.YAML.parser:
                BeeldParsers.YAML.parser = BeeldParsers.YAML.load( )
            return BeeldParsers.YAML.parser.parse( text )
        
        def CUSTOM_load():
            return import_path(BeeldParsers.CUSTOM.path).Custom_Parser
        
        def CUSTOM_parse( text ):
            if not BeeldParsers.CUSTOM.parser:
                BeeldParsers.CUSTOM.parser = BeeldParsers.CUSTOM.load( )
            return BeeldParsers.CUSTOM.parser.parse( text )
        
        parsers.JSON = DynamicObject({
        'name': 'JSON Parser',
        'format': 'JSON Format',
        'ext': ".json",
        'path': parsers.Path + 'json.py',
        'parser': None,
        'load': JSON_load,
        'parse': JSON_parse
        })
        
        parsers.YAML = DynamicObject({
        'name': 'PyYaml Parser',
        'format': 'Yaml Format',
        'ext': ".yml/.yaml",
        'path': parsers.Path + 'yaml.py',
        'parser': None,
        'load': YAML_load,
        'parse': YAML_parse
        })
        
        parsers.CUSTOM = DynamicObject({
        'name': 'Custom Parser',
        'format': 'Custom Format',
        'ext': ".custom/*",
        'path': parsers.Path + 'custom.py',
        'parser': None,
        'load': CUSTOM_load,
        'parse': CUSTOM_parse
        })
    
BeeldParsers.init()

def run_process_loop( dto, p, process_list ):
    p.process_list = process_list
    p.process_list_count = len(p.process_list)
    p.process_list_index = 0
    write( p.in_tuple, p.srcText, p.encoding )
    def process_loop( ):
        if p.process_list_index < p.process_list_count:
            cmd = p.process_list[p.process_list_index].replace('${DIR}', p.basePath).replace('${CWD}', p.cwd).replace('${COMPILERS}', compilersPath).replace('${TPLS}', templatesPath).replace('${IN}', p.in_tuple).replace('${OUT}', p.out_tuple)

            p.process_list_index += 1
            err = os.system(cmd)
            # on *nix systems this is a tuple, similar to the os.wait return result
            # on windows it is an integer
            # http://docs.python.org/2/library/os.html#process-management
            # http://docs.python.org/2/library/os.html#os.wait
            # high-byte is the exit status
            if not (type(err) is int): err = 255 & (err[1]>>8)
            # some error occured
            if 0!=err: 
                p.err = 'Error executing "'+cmd+'"'
                dto.abort()
            else: process_loop( )
        else:
            p.srcText = read(p.out_tuple, p.encoding)
            dto.next( )
    return process_loop( )

def create_abort_process( pipeline ):
    def abort_process( params ):
        pipeline.dispose( )
        cleanup([params.in_tuple, params.out_tuple])
        if params.err: print( params.err )
        sys.exit(1)
    return abort_process
    
def create_tasks( pipeline, config, tasks, default_actions, actions ):
    def log_settings( dto ):
        sepLine = "=" * 65
        params = dto.params()
        # output the build settings
        if not params.outputToStdOut:
            print (sepLine)
            print (" Build Package ")
            print (sepLine)
            print (" ")
            print ("Input    : " + params.inputType);
            print ("Encoding : " + params.encoding)
            print ("Task     : " + params.currentTask)
            if params.doMinify:
                print ("Minify   : ON")
                print ("Compiler : " + params.compilers[params.selectedCompiler]['name'])
            else:
                print ("Minify   : OFF")
            print ("Output   : " + params.outFile)
            print (" ")
        dto.next( )
    
    def finish_process( dto ):
        params = dto.params()
        pipeline.dispose( )
        cleanup([params.in_tuple, params.out_tuple])
        dto.dispose( )
        return None
    
    non_local = {'tasks': tasks, 'i': 0, 'l': len(tasks)}
    def switch_task( dto ):
        if non_local['i'] < non_local['l']:
        
            task = non_local['tasks'][non_local['i']][0]
            config_new = non_local['tasks'][non_local['i']][1]
            non_local['i'] += 1
            params = dto.params( )
            params.config = config_new
            params.currentTask = task
            params.bundleText = None 
            params.headerText = None 
            params.srcText = None
            params.err = False
            if 'out' in  config_new:
            
                params.outFile = getRealPath(config_new['out'], params.basePath)
                params.outputToStdOut = False
            
            else:
            
                params.outFile = None
                params.outputToStdOut = True
            
            if 'minify' in config_new:
            
                params.doMinify = True
            
            else:
            
                params.doMinify = False
            
            pipeline.add( log_settings )
            for action in default_actions:
            
                action = 'action_' + action
                if action in actions: pipeline.add( actions[ action ] )
            
            if non_local['i'] < non_local['l']: pipeline.add( switch_task )
            else: pipeline.add( finish_process )
            return dto.next( )
        
        else:
            return finish_process( dto )
            
    return switch_task,finish_process,log_settings

class Beeld:
    VERSION = "0.5"
    
    Pipeline = Pipeline
    Parsers = BeeldParsers
    
    def __init__(self):
        self.actions = {
         'action_initially': Beeld.action_initially
        ,'action_src': Beeld.action_src
        ,'action_header': Beeld.action_header
        ,'action_replace': Beeld.action_replace
        ,'action_preprocess': Beeld.action_preprocess
        ,'action_doc': Beeld.action_doc
        ,'action_minify': Beeld.action_minify
        ,'action_postprocess': Beeld.action_postprocess
        ,'action_bundle': Beeld.action_bundle
        ,'action_out': Beeld.action_out
        ,'action_finally': Beeld.action_finally
        }
        self.tasks = [ ]
        self.compilers = {
        'cssmin' : {
            'name' : 'CSS Minifier',
            'compiler' : 'python ${COMPILERS}cssmin.py ${EXTRA} ${OPTIONS} --input ${IN}  --output ${OUT}',
            'options' : ''
        },
        'uglifyjs' : {
            'name' : 'Node UglifyJS Compiler',
            'compiler' : 'uglifyjs ${IN} ${OPTIONS} -o ${OUT}',
            'options' : ''
        },
        'closure' : {
            'name' : 'Java Closure Compiler',
            'compiler' : 'java -jar ${COMPILERS}closure.jar ${EXTRA} ${OPTIONS} --js ${IN} --js_output_file ${OUT}',
            'options' : ''
        },
        'yui' : {
            'name' : 'Java YUI Compressor Compiler',
            'compiler' : 'java -jar ${COMPILERS}yuicompressor.jar ${EXTRA} ${OPTIONS} --type js -o ${OUT}  ${IN}',
            'options' : ''
        }
        }
        
    def dispose( self ):
        self.compilers = None
        self.actions = None
        self.tasks = None
        return self
        
    def addAction( self, action, handler ):
        if action and callable(handler):
            self.actions['action_'+action] = handler
        return self
    
    def addTask( self, task, actions ):
        if task and actions:
            self.tasks.append([task, actions])
        return self
        
    def parse(self):
        
        params = DynamicObject()
        
        options = parseOptions({
            'help' : False,
            'config' : False,
            'tasks' : False,
            'compiler' : 'uglifyjs',
            'enc' : 'utf-8'
        })
        
        # fix compiler selection
        options.compiler = options.compiler.lower()
        if not ( options.compiler in self.compilers): options.compiler = 'uglifyjs'
        
        # if args are correct continue
        # get real-dir of config file
        full_path = params.configFile = os.path.realpath(options.config)
        params.basePath = os.path.dirname(full_path)
        params.cwd = os.getcwd();
        params.encoding = options.enc.lower()
        params.selectedCompiler = options.compiler
        params.selectedTasks = options.tasks.split(',') if options.tasks else False
        params.compilers = self.compilers
        configurationFile = read(params.configFile, params.encoding)
        
        # parse settings
        ext = fileExt(full_path).lower()
        if not len(ext): ext=".custom"
        
        # parse dependencies file in JSON format
        if ".json" == ext: 
            params.inputType = Beeld.Parsers.JSON.format + ' (' + Beeld.parsers.JSON.ext + ')'
            config = Beeld.Parsers.JSON.parse( configurationFile )
        # parse dependencies file in YAML format
        elif ".yml" == ext or ".yaml" == ext: 
            params.inputType = Beeld.Parsers.YAML.format + ' (' + Beeld.Parsers.YAML.ext + ')'
            config = Beeld.Parsers.YAML.parse( configurationFile )
        # parse dependencies file in custom format
        else: 
            params.inputType = Beeld.Parsers.CUSTOM.format + ' (' + Beeld.Parsers.CUSTOM.ext + ')'
            config = Beeld.Parsers.CUSTOM.parse( configurationFile )
            
        if not config: config = {}
        params.config = config
        #import pprint
        #pprint.pprint(params.config)
        #sys.exit(0)
        return params
    
    def build(self, params):
        tasks = None
        actions = self.actions
        config = params.config
        default_actions = [
         'src'
        ,'header'
        ,'replace'
        ,'preprocess'
        ,'doc'
        ,'minify'
        ,'postprocess'
        ,'bundle'
        ,'out'
        ]
        
        params.in_tuple = None
        params.out_tuple = None
        pipeline = Pipeline( )
        
        abort_process = create_abort_process( pipeline )
        
        if 'tasks' in config:
        
            for task_tuple in config['tasks']:
                task_key = list(task_tuple.keys())[0]
                self.addTask(task_key, task_tuple[task_key])
                if params.selectedTasks and task_key in params.selectedTasks:
                    if not tasks: tasks = []
                    tasks.append( [task_key, task_tuple[task_key]] )
        
        if not tasks:
            if False == params.selectedTasks:
                if len(self.tasks):
                    tasks = self.tasks
                elif config:
                    tasks = [['default', config]]
            
        
        if not tasks:
            params.err = 'Task is not defined'
            abort_process( params )
        
        params.config = {}
        
        params.in_tuple = tmpfile( )
        params.out_tuple = tmpfile( )
        params.currentTask = ''
        
        switch_task,finish_process,log_settings = create_tasks( pipeline, config, tasks, default_actions, actions )
        
        pipeline.abort( abort_process ).add( switch_task ).run( params )
        
        return self
        
    def action_initially(dto):
        return dto.next()

    def action_src(dto):
        params = dto.params()
        config = params.config
        params.srcText = ''
        params.headerText = None
        
        if 'src' in config:
            srcFiles = config['src']
            # convert to list/array if not so
            if not isinstance(srcFiles, list): srcFiles = [srcFiles]
        else: 
            srcFiles = None
        
        if 'header' in config:
            headerFile = config['header']
        else: 
            headerFile = None
            
        if srcFiles and len(srcFiles)>0:
            tplid = '!tpl:'
            tplidlen = len(tplid)
            doneheader = False
            buffer = []

            for filename in srcFiles:
                if not len(filename): continue
                
                if filename.startswith(tplid):
                    # template file
                    buffer.append( getTpl( filename[tplidlen:], params.encoding ) )
                else:
                    # src file
                    buffer.append( read( getRealPath( filename, params.basePath ), params.encoding ) )

                if not doneheader:
                    if headerFile and filename == headerFile:
                        params.headerText = buffer[len(buffer)-1]
                        doneheader = True
                    elif not headerFile:
                        params.headerText = buffer[len(buffer)-1]
                        doneheader = True
                
            # header file is NOT one of the source files
            if headerFile and None == params.headerText:
                params.headerText = read( getRealPath( headerFile, params.basePath ) )
            params.srcText = "".join(buffer)
        
        return dto.next()

    def action_header(dto):
        params = dto.params()
        headerText = params.headerText
        params.headerText = ''
        if headerText:
            if headerText.startswith('/**'):
                position = headerText.find("**/", 0)
                params.headerText = headerText[0:position+3]
            elif headerText.startswith('/*!'):
                position = headerText.find("!*/", 0)
                params.headerText = headerText[0:position+3]
        
        return dto.next()

    def action_replace(dto):
        params = dto.params()
        config = params.config
        if 'replace' in config and config['replace']:
            replace = config['replace']
            if params.headerText and len(params.headerText)>0:
                hasHeader = True
            else:
                hasHeader = False
                
            # ordered map
            for rep in replace:
                for k in rep:
                    params.srcText = params.srcText.replace(k, rep[k])
                    if hasHeader:
                        params.headerText = params.headerText.replace(k, rep[k])
        
        return dto.next()
        
    def action_preprocess(dto):
        params = dto.params( ) 
        config = params.config
        if "preprocess" in config and config['preprocess']:
            return run_process_loop(dto, params, list(config['preprocess']))
        else:
            return dto.next( )
        
    def action_doc(dto):
        params = dto.params()
        config = params.config
        if ('doc' in config) and config['doc'] and ('output' in config['doc']):
            
            doc = config['doc']
            docFile = getRealPath(doc['output'], params.basePath)
            startDoc = doc['startdoc']
            endDoc = doc['enddoc']
            
            _trim = None
            _trimlen = 0
            isRegex = 0
            
            sep = doc['separator'] if 'separator' in doc else "\n\n"
                
            if 'trimx' in doc: 
                isRegex = 1
                _trim = re.compile('^' + doc['trimx'])
            elif 'trim' in doc: 
                isRegex = 0
                _trim = doc['trim']
                _trimlen = len(_trim)
                
            
            docs = []
            
            # extract doc blocks
            blocks = params.srcText.split( startDoc )
            for b in blocks:
                tmp = b.split( endDoc )
                if len(tmp)>1: docs.append( tmp[0] )
            blocks = None
            
            # trim start of each doc block line
            if _trim:
                for i in range(len(docs)-1):
                    tmp = docs[i].split( "\n" )
                    
                    for j in range(len(tmp)-1):
                        if len(tmp[j])>0:
                            if isRegex:
                                tmp[j] = re.sub(_trim, '', tmp[j])
                            elif tmp[j].startswith(_trim):
                                tmp[j] = tmp[j][_trimlen:]
                    
                    docs[i] = "\n".join( tmp )
            write(docFile, sep.join( docs ), params.encoding)
        
        return dto.next()

    def action_minify(dto):
        params = dto.params()
        config = params.config
        if 'minify' in config and '' != params.srcText:
            minsets = config['minify']
            
            if 'uglifyjs' in minsets:
                opts = minsets['uglifyjs']
                # convert to list/array if not so
                if not isinstance(opts, list): opts = [opts]
                params.compilers['uglifyjs']['options'] = " ".join(opts)
                
            if 'closure' in minsets:
                opts = minsets['closure']
                # convert to list/array if not so
                if not isinstance(opts, list): opts = [opts]
                params.compilers['closure']['options'] = " ".join(opts)
                
            if 'yui' in minsets:
                opts = minsets['yui']
                # convert to list/array if not so
                if not isinstance(opts, list): opts = [opts]
                params.compilers['yui']['options'] = " ".join(opts)
            
            if 'cssmin' in minsets:
                opts = minsets['cssmin']
                # convert to list/array if not so
                if not isinstance(opts, list): opts = [opts]
                params.compilers['cssmin']['options'] = " ".join(opts)
            
            write(params.in_tuple, params.srcText, params.encoding)

            extra = ''
            # use the selected compiler
            compiler = params.compilers[params.selectedCompiler]
            if 'cssmin'==params.selectedCompiler and "--basepath " not in compiler['options']:
                extra = "--basepath "+params.basePath
            elif 'yui'==params.selectedCompiler or 'closure'==params.selectedCompiler:
                extra = "--charset "+params.encoding
                    
            cmd = compiler['compiler'].replace('${COMPILERS}', compilersPath).replace('${EXTRA}', extra).replace('${OPTIONS}', compiler['options']).replace('${IN}', params.in_tuple).replace('${OUT}', params.out_tuple)
            err = os.system(cmd)
            # on *nix systems this is a tuple, similar to the os.wait return result
            # on windows it is an integer
            # http://docs.python.org/2/library/os.html#process-management
            # http://docs.python.org/2/library/os.html#os.wait
            # high-byte is the exit status
            if not (type(err) is int): err = 255 & (err[1]>>8)
            
            if 0==err: params.srcText = read(params.out_tuple, params.encoding)
            
            # some error occured
            if 0!=err: 
                params.err = 'Error executing "'+cmd+'"'
                return dto.abort()
            
        return dto.next()

    def action_postprocess(dto):
        params = dto.params( ) 
        config = params.config
        if "postprocess" in config and config['postprocess']:
            return run_process_loop(dto, params, list(config['postprocess']))
        else:
            return dto.next( )

    def action_bundle(dto):
        params = dto.params()
        config = params.config
        params.bundleText = ''
        
        if 'bundle' in config:
            bundleFiles = config['bundle']
            # convert to list/array if not so
            if not isinstance(bundleFiles, list): bundleFiles = [bundleFiles]
        else: 
            bundleFiles = None
        
        if bundleFiles and len(bundleFiles)>0:
            buffer = []

            for filename in bundleFiles:
                if not len(filename): continue
                buffer.append( read( getRealPath( filename, params.basePath ), params.encoding ) )

            params.bundleText = "\n".join(buffer) + "\n"
        
        return dto.next()

    def action_out(dto):
        params = dto.params()
        # write the processed file
        text = params.bundleText+params.headerText+params.srcText
        params.bundleText = None 
        params.srcText = None 
        params.headerText = None
        if params.outputToStdOut: print (text)
        else: write(params.outFile, text, params.encoding)
        return dto.next( )
    
    def action_finally(self, dto):
        return dto.next()

    def Main():
        # do the process
        buildLib = Beeld()
        buildLib.build( buildLib.parse() )

# if used with 'import *'
__all__ = ['Beeld']

# if called directly from command-line
# do the process
if __name__ == "__main__":  
    Beeld.Main()
