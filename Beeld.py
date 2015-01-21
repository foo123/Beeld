#!/usr/bin/env python
##
#
#   Beeld
#   https://github.com/foo123/Beeld
#
#   A scriptable and configurable source code builder framework in Node/PHP/Python
#   @version: 0.7
#
##

import os, tempfile, sys, re

try:
    import argparse
    ap = 1
except ImportError:
    import optparse
    ap = 0

BEELD_ROOT = os.path.dirname(os.path.abspath(__file__))
BEELD_INCLUDES = os.path.join(BEELD_ROOT, 'includes') + '/'
BEELD_PARSERS = os.path.join(BEELD_INCLUDES, 'parsers') + '/'
BEELD_COMPILERS = os.path.join(BEELD_ROOT, 'compilers') + '/'
BEELD_TEMPLATES = os.path.join(BEELD_ROOT, 'templates') + '/'
BEELD_PLUGINS = os.path.join(BEELD_ROOT, 'plugins') + '/'

from includes.PublishSubscribe import PublishSubscribe

#
# beeld utils
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
    
def join_path(*args): 
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
def file_ext(fileName):
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
        

def get_real_path(file, basePath=''):
    if ''!=basePath and (file.startswith('./') or file.startswith('../') or file.startswith('.\\') or file.startswith('..\\')): 
        return join_path(basePath, file)
    else:
        return file

TPLS = {}
def get_tpl(id, enc=None):
    global TPLS
    tpl_id = 'tpl_' + id
    if tpl_id not in TPLS:
        TPLS[tpl_id] = read( BEELD_TEMPLATES + id, enc )
    return str(TPLS[tpl_id])[:]
    

def multi_replace(tpl, reps):
    out = tpl
    for r in reps:
        out = out.replace(r[0], r[1])
    return out
    

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



#List = list
#Map = dict
class OrderedMap:
    
    def __init__(self, om=None):
        self.om = om
        self.index = 0
    
    def hasNext(self):
        return (self.index < len(self.om))
    
    def getNext(self, raw=False):
        if self.index < len(self.om):
        
            if True == raw:
                obj = self.om[self.index]
                self.index += 1
                return obj
            else:    
                obj = self.om[self.index]
                key = list(obj.keys())[0]
                self.index += 1
                return [key, obj[key]]
        
        return None
    
    def hasItem(self,index):
        return (index >= 0 and index < len(self.om))
    
    def hasItemByKey(self,key):
        om = self.om
        for i in range(len(om)-1):
            entry = om[i]
            if key in entry:
                return i
        return -1
    
    def getItem(self,index):
        if index >= 0 and index < len(self.om):
        
            obj = self.om[index]
            key = list(obj.keys())[0]
            return [key, obj[key]]
        
        return None
    
    def getItemByKey(self,key):
        om = self.om
        for entry in om:
            if key in entry:
                return [key, entry[key]]
        return None
    
    def rewind(self):
        self.index = 0
        return self
    

class BeeldParser:

    def __init__(self, path, class_name, name):
        self.path = path
        self.class_name = class_name
        self.name = name
        self.parser = None

    
    def dispose(self):
        self.class_name = None
        self.name = None
        self.path = None
        self.parser = None
        return self
    
    def load(self):
        #module = import_path(self.path)
        #for i in dir(module): print(i)
        #sys.exit(0)
        return getattr(import_path(self.path), self.class_name)
    
    def parse(self, text):
        if not self.parser:
            self.parser = self.load( )
        return self.parser.parse( text )
    

class BeeldCompiler:
    
    def __init__(self, name, cmd, options=''):
        #self.name = None
        #self.cmd_tpl = None
        #self.options = None
        self.name = name
        self.cmd_tpl = cmd
        self.options = options
    
    def dispose(self):
        self.name = None
        self.cmd_tpl = None
        self.options = None
        return self
    
    
    def compiler(self,args=list()):
        return multi_replace(self.cmd_tpl, args)
    
    
    def option(self,opt):
        opt = str(opt)
        p = " " if (len(self.options) and len(opt)) else ""
        self.options += p + opt
        return self
    

#
# Beeld default actions
class BeeldActions:
    
    def abort(evt, params=None):
        if evt and None==params: params = evt.data.data
        config = params.config
        options = params.options
        data = params.data
        current = params.current
        cleanup([data.tmp_in, data.tmp_out])
        if data.err: print( data.err )
        options.dispose()
        data.dispose()
        current.dispose()
        params.compilers = None
        params.config = None
        params.options = None
        params.data = None
        params.current = None
        if evt: evt.dispose()
        sys.exit(1)
        
    def log(evt):
        params = evt.data.data
        options = params.options
        data = params.data
        current = params.current
        sepLine = "=" * 65
        # output the build settings
        if not options.outputToStdOut:
            print (sepLine)
            print (" Build Package ")
            print (sepLine)
            print (" ")
            print ("Input    : " + options.inputType);
            print ("Encoding : " + options.encoding)
            print ("Task     : " + current.task)
            if options.minify:
                print ("Minify   : ON")
                print ("Compiler : " + params.compilers[options.compiler].name)
            else:
                print ("Minify   : OFF")
            print ("Output   : " + options.out)
            print (" ")
        evt.next( )

    def finish(evt):
        params = evt.data.data
        #config = params.config
        options = params.options
        data = params.data
        current = params.current
        cleanup([data.tmp_in, data.tmp_out])
        options.dispose()
        data.dispose()
        current.dispose()
        params.compilers = None
        params.config = None
        params.options = None
        params.data = None
        params.current = None
        evt.dispose()

    def next_action(evt):
        params = evt.data.data
        current = params.current
        task_actions = current.task_actions
        if task_actions and task_actions.hasNext():
            a = task_actions.getNext() 
            action = 'action_' + a[0]
            if action in current.actions:
                current.action = a[0]
                current.action_cfg = a[1]
                current.actions[ action ]( evt )
            
            else:
                evt.next()
                    
        else:
            evt.next();
        
            
    def next_task(evt):
        params = evt.data.data
        options = params.options
        data = params.data
        current = params.current
        current_tasks = current.tasks
        pipeline = params.pipeline
        
        if current_tasks and current_tasks.hasNext():
            task = current_tasks.getNext()
            
            current.task = task[0]
            current.task_actions = Beeld.OrderedMap(task[1])
            current.action = ''
            current.action_cfg = None
            
            data.bundle = ''
            data.header = ''
            data.src = ''
            data.err = False
            
            out = current.task_actions.getItemByKey('out')
            if out:
            
                options.out = get_real_path(out[1], options.basePath)
                options.outputToStdOut = False
            
            else:
            
                options.out = None
                options.outputToStdOut = True
            
            if -1 < current.task_actions.hasItemByKey('minify'):
                options.minify = True
            else:
                options.minify = False
            
            # default header action
            # is first file of src if exists
            src_action = current.task_actions.hasItemByKey('src')
            if (not current.task_actions.getItemByKey('header')) and (-1 < src_action):
                src_cfg = current.task_actions.getItemByKey('src')
                current.task_actions.om.insert(src_action+1,{'header':src_cfg[1][0]})
            
            pipeline.on('#actions', Beeld.Actions.log)
            
            while current.task_actions.hasNext():
                current.task_actions.getNext()
                pipeline.on('#actions', Beeld.Actions.next_action)
            current.task_actions.rewind( )
            
            if current_tasks.hasNext():
                pipeline.on('#actions', Beeld.Actions.next_task)
            else: 
                pipeline.on('#actions', Beeld.Actions.finish)
            
            evt.next( )
        else:
            Beeld.Actions.finish( evt )
                
    #def action_initially(evt):
    #    evt.next()

    def action_src(evt):
        params = evt.data.data
        options = params.options
        data = params.data
        current = params.current
        
        data.src = ''
        
        if current.action_cfg:
            srcFiles = current.action_cfg
            # convert to list/array if not so
            if not isinstance(srcFiles, list): srcFiles = [srcFiles]
        else: 
            srcFiles = None
        
        if srcFiles and len(srcFiles)>0:
            tplid = '!tpl:'
            tplidlen = len(tplid)
            buffer = []

            for filename in srcFiles:
                if not len(filename): continue
                
                if filename.startswith(tplid):
                    # template file
                    buffer.append( get_tpl( filename[tplidlen:], options.encoding ) )
                else:
                    # src file
                    buffer.append( read( get_real_path( filename, options.basePath ), options.encoding ) )
            data.src = "".join(buffer)
        
        evt.next()

    def action_header(evt):
        params = evt.data.data
        options = params.options
        data = params.data
        current = params.current
        
        headerFile = current.action_cfg
        headerText = None
        data.header = ''
        
        if headerFile:
            headerText = read( get_real_path( headerFile, options.basePath ), options.encoding )
            
        if headerText and len(headerText):
            if headerText.startswith('/**'):
                position = headerText.find("**/", 0)
                data.header = headerText[0:position+3]
            elif headerText.startswith('/*!'):
                position = headerText.find("!*/", 0)
                data.header = headerText[0:position+3]
        
        evt.next()

    def action_replace(evt):
        params = evt.data.data
        options = params.options
        data = params.data
        current = params.current
        if current.action_cfg:
            
            reple = Beeld.OrderedMap(current.action_cfg)
            if data.header and len(data.header)>0:
                hasHeader = True
            else:
                hasHeader = False
                
            # ordered map
            while reple.hasNext():
                rep = reple.getNext()
                data.src = data.src.replace(rep[0], rep[1])
                if hasHeader:
                    data.header = data.header.replace(rep[0], rep[1])
        
        evt.next()
        
    def action_shellprocess(evt):
        params = evt.data.data
        options = params.options
        data = params.data
        current = params.current
        process_list = current.action_cfg
        
        if process_list and len(process_list):
            
            params.process_list = process_list
            params.process_list_index = 0
            params.process_list_count = len(params.process_list)
            write( data.tmp_in, data.src, options.encoding )
            
            def process_loop(evt):
                params = evt.data.data
                options = params.options
                data = params.data
                current = params.current
                if params.process_list_index < params.process_list_count:
                    cmd = multi_replace(params.process_list[params.process_list_index], [
                     ['${DIR}',          options.basePath]
                    ,['${CWD}',          options.cwd]
                    ,['${COMPILERS}',    BEELD_COMPILERS]
                    ,['${TPLS}',         BEELD_TEMPLATES]
                    ,['${IN}',           data.tmp_in]
                    ,['${OUT}',          data.tmp_out]
                    ])

                    params.process_list_index += 1
                    err = os.system(cmd)
                    # on *nix systems this is a tuple, similar to the os.wait return result
                    # on windows it is an integer
                    # http://docs.python.org/2/library/os.html#process-management
                    # http://docs.python.org/2/library/os.html#os.wait
                    # high-byte is the exit status
                    if not (type(err) is int): err = 255 & (err[1]>>8)
                    # some error occured
                    if 0!=err: 
                        data.err = 'Error executing "'+cmd+'"'
                        params.process_list = None
                        evt.abort()
                        return
                    else: process_loop(evt)
                else:
                    data.src = read(data.tmp_out, options.encoding)
                    params.process_list = None
                    evt.next( )
            
            process_loop(evt)
        
        else:
            evt.next( )
        
    def action_minify(evt):
        params = evt.data.data
        options = params.options
        data = params.data
        current = params.current
        minify = current.action_cfg
        if minify and '' != data.src:
            
            if 'uglifyjs' in minify:
                opts = minify['uglifyjs']
                # convert to list/array if not so
                if not isinstance(opts, list): opts = [opts]
                params.compilers['uglifyjs'].option(" ".join(opts))
                
            if 'closure' in minify:
                opts = minify['closure']
                # convert to list/array if not so
                if not isinstance(opts, list): opts = [opts]
                params.compilers['closure'].option(" ".join(opts))
                
            if 'yui' in minify:
                opts = minify['yui']
                # convert to list/array if not so
                if not isinstance(opts, list): opts = [opts]
                params.compilers['yui'].option(" ".join(opts))
            
            if 'cssmin' in minify:
                opts = minify['cssmin']
                # convert to list/array if not so
                if not isinstance(opts, list): opts = [opts]
                params.compilers['cssmin'].option(" ".join(opts))
            
            write(data.tmp_in, data.src, options.encoding)

            extra = ''
            # use the selected compiler
            compiler = params.compilers[options.compiler]
            if 'cssmin'==options.compiler and "--basepath " not in compiler.options:
                extra = "--basepath "+options.basePath
            elif options.compiler in ['yui', 'closure']:
                extra = "--charset "+options.encoding
                    
            cmd = compiler.compiler([
             ['${COMPILERS}',    BEELD_COMPILERS]
            ,['${EXTRA}',        extra]
            ,['${OPTIONS}',      compiler.options]
            ,['${IN}',           data.tmp_in]
            ,['${OUT}',          data.tmp_out]
            ])
            err = os.system(cmd)
            # on *nix systems this is a tuple, similar to the os.wait return result
            # on windows it is an integer
            # http://docs.python.org/2/library/os.html#process-management
            # http://docs.python.org/2/library/os.html#os.wait
            # high-byte is the exit status
            if not (type(err) is int): err = 255 & (err[1]>>8)
            
            if 0==err: data.src = read(data.tmp_out, options.encoding)
            
            # some error occured
            if 0!=err: 
                data.err = 'Error executing "'+cmd+'"'
                evt.abort()
                return
            
        evt.next()

    def action_bundle(evt):
        params = evt.data.data
        options = params.options
        data = params.data
        current = params.current
        
        data.bundle = ''
        
        if current.action_cfg:
            bundleFiles = current.action_cfg
            # convert to list/array if not so
            if not isinstance(bundleFiles, list): bundleFiles = [bundleFiles]
        else: 
            bundleFiles = None
        
        if bundleFiles and len(bundleFiles)>0:
            buffer = []

            for filename in bundleFiles:
                if not len(filename): continue
                buffer.append( read( get_real_path( filename, options.basePath ), options.encoding ) )

            data.bundle = "\n".join(buffer) + "\n"
        
        evt.next()

    def action_out(evt):
        params = evt.data.data
        options = params.options
        data = params.data
        #current = params.current
        # write the processed file
        text = data.bundle+data.header+data.src
        data.bundle = '' 
        data.src = '' 
        data.header = ''
        if options.outputToStdOut: print (text)
        else: write(options.out, text, options.encoding)
        evt.next( )
    
    #def action_finally(evt):
    #    evt.next()

class BeeldUtils:
    multi_replace = multi_replace
    read = read
    write = write
    join_path = join_path
    tmpfile = tmpfile
    get_real_path = get_real_path

#
# Beeld default parsers
BeeldParsers = {
    '.json': BeeldParser(
        BEELD_PARSERS + 'Json_Parser.py',
        'Json_Parser',
        'JSON Parser'
    ),
    '.yml': BeeldParser(
        BEELD_PARSERS + 'Yaml_Parser.py',
        'Yaml_Parser',
        'PyYaml Parser'
    ),

    '.custom': BeeldParser(
        BEELD_PARSERS + 'Custom_Parser.py',
        'Custom_Parser',
        'Custom Parser'
    )
}
# aliases
BeeldParsers['.yaml'] = BeeldParsers['.yml']
BeeldParsers['*'] = BeeldParsers['.custom']

# extends/implements PublishSubscribe
class Beeld(PublishSubscribe):
    
    VERSION = "0.7"
    
    def OrderedMap(om):
        return OrderedMap(om)
        
    def Parser(path, class_name, name):
        return BeeldParser(path, class_name, name)
        
    def Compiler(name, cmd, options=''):
        return BeeldCompiler(name, cmd, options)
        
    def Obj(props=None):
        return PublishSubscribe.Data(props)
        
    Parsers = BeeldParsers
    Actions = BeeldActions
    Utils = BeeldUtils
    
    def __init__(self):
        
        self.initPubSub( )
        
        self.actions = {
         'action_src': Beeld.Actions.action_src
        ,'action_header': Beeld.Actions.action_header
        ,'action_replace': Beeld.Actions.action_replace
        ,'action_process-shell': Beeld.Actions.action_shellprocess
        ,'action_minify': Beeld.Actions.action_minify
        ,'action_bundle': Beeld.Actions.action_bundle
        ,'action_out': Beeld.Actions.action_out
        }
        
    def dispose(self):
        self.disposePubSub( )
        self.actions = None
        return self
        
    def addAction(self, action, handler):
        if action and callable(handler):
            self.actions['action_'+action] = handler
        return self
    
    def loadPlugins(self, plugins, basePath):
        if plugins and len(plugins):
            plugins = Beeld.OrderedMap(plugins)
            plgid = '!plg:'
            plgidlen = len(plgid)
            while plugins.hasNext():
                plg = plugins.getNext()
                filename = plg[1] + '.py'
                if filename.startswith(plgid):
                    filename  = BEELD_PLUGINS + filename[plgidlen:]
                else:
                    filename = get_real_path( filename, basePath )
                loader = getattr(import_path(filename), plg[0])
                loader( self, Beeld )
        
        return self
    
    # parse input arguments, options and configuration settings
    def parse(self):
        
        params = Beeld.Obj()
        
        options = parseOptions({
            'help' : False,
            'config' : False,
            'tasks' : False,
            'compiler' : 'uglifyjs',
            'enc' : 'utf-8'
        })
        
        params.compilers = {
        'cssmin': Beeld.Compiler(
            'CSS Minifier',
            'python ${COMPILERS}cssmin.py ${EXTRA} ${OPTIONS} --input ${IN}  --output ${OUT}'
        ),
        'uglifyjs': Beeld.Compiler(
            'Node UglifyJS Compiler',
            'uglifyjs ${IN} ${OPTIONS} -o ${OUT}'
        ),
        'closure': Beeld.Compiler(
            'Java Closure Compiler',
            'java -jar ${COMPILERS}closure.jar ${EXTRA} ${OPTIONS} --js ${IN} --js_output_file ${OUT}'
        ),
        'yui': Beeld.Compiler(
            'Java YUI Compressor Compiler',
            'java -jar ${COMPILERS}yuicompressor.jar ${EXTRA} ${OPTIONS} --type js -o ${OUT}  ${IN}'
        )
        }
        # fix compiler selection
        options.compiler = options.compiler.lower()
        if options.compiler not in params.compilers: options.compiler = 'uglifyjs'
        configFile = os.path.realpath(options.config)
        encoding = options.enc.lower()        
        ext = file_ext(configFile).lower()
        if (not len(ext)) or (ext not in Beeld.Parsers): ext="*"
        # parse settings
        parser = Beeld.Parsers[ext]
        configurationFile = read(configFile, encoding)
        config = parser.parse(configurationFile)
        if not config: config = {}
        #import pprint
        #pprint.pprint(config)
        #sys.exit(0)
        params.options = Beeld.Obj({
        'configFile': configFile,
        'inputType': parser.name + ' (' + ext + ')',
        'basePath': os.path.dirname(configFile),
        'cwd': os.getcwd(),
        'encoding': options.enc.lower(),
        'compiler': options.compiler,
        'tasks': options.tasks.split(',') if options.tasks else False
        })
        params.data = Beeld.Obj()
        params.current = Beeld.Obj()
        params.config = config
        
        if 'plugins' in config:
            self.loadPlugins(config['plugins'], params.options.basePath)
        
        return params
    
    def build(self, params):
        tasks = []
        selected_tasks = None
        
        params.data.tmp_in = None
        params.data.tmp_out = None
        
        if 'tasks' in params.config:
        
            params.config['tasks'] = Beeld.OrderedMap(params.config['tasks'])
            while params.config['tasks'].hasNext():
                task = params.config['tasks'].getNext(True)
                task_name = list(task.keys())[0]
                tasks.append( task )
                if params.options.tasks and task_name in params.options.tasks:
                    if not selected_tasks: selected_tasks = []
                    selected_tasks.append( task )
        
        if not selected_tasks:
            if False == params.options.tasks:
                if len(tasks): selected_tasks = tasks
                #elif config: selected_tasks = [['default', config]]            
        
        
        if not selected_tasks:
            params.data.err = 'Task is not defined'
            Beeld.Actions.abort( None, params )
        
        params.pipeline = self
        params.current.tasks = Beeld.OrderedMap(selected_tasks)
        params.current.actions = self.actions
        params.current.task_actions = None
        params.current.task = ''
        params.current.action = ''
        params.current.data = None
        params.data.src = ''
        params.data.header = ''
        params.data.bundle = ''
        params.data.err = False
        params.data.tmp_in = tmpfile( )
        params.data.tmp_out = tmpfile( )
        
        self.on('#actions', Beeld.Actions.next_task).pipeline('#actions', params, Beeld.Actions.abort)
        
        return self
        
    def Main():
        # do the process
        builder = Beeld()
        builder.build( builder.parse() )

# if used with 'import *'
__all__ = ['Beeld']

# if called directly from command-line
# do the process
if __name__ == "__main__":  
    Beeld.Main()
