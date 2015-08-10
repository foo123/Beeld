import os

Beeld = None
BEELD_COMPILERS = None

def beeld_plugin_minify( beelder ):
    global Beeld
    global BEELD_COMPILERS
    Beeld = beelder.__class__ #BeeldClass
    if BEELD_COMPILERS is None:
        BEELD_COMPILERS = os.path.join(Beeld.ROOT, 'compilers') + '/'
    beelder.addAction('minify', beeld_plugin_action_minify)
    
def beeld_plugin_action_minify( evt ):
    global Beeld
    global BEELD_COMPILERS
    compilers = {
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
    params = evt.data.data
    options = params.options
    data = params.data
    current = params.current
    minify = current.action_cfg
    if minify and '' != data.src:
        
        # fix compiler selection
        selected = params.cmd_opts.compiler.lower() if hasattr(params.cmd_opts,'compiler') else None
        if selected and (selected not in compilers): selected = 'uglifyjs'
        
        if 'uglifyjs' in minify:
            opts = minify['uglifyjs']
            # convert to list/array if not so
            if not isinstance(opts, list): opts = [opts]
            compilers['uglifyjs'].option(" ".join(opts))
            if not selected: selected = 'uglifyjs'
            
        if 'closure' in minify:
            opts = minify['closure']
            # convert to list/array if not so
            if not isinstance(opts, list): opts = [opts]
            compilers['closure'].option(" ".join(opts))
            if not selected: selected = 'closure'
            
        if 'yui' in minify:
            opts = minify['yui']
            # convert to list/array if not so
            if not isinstance(opts, list): opts = [opts]
            compilers['yui'].option(" ".join(opts))
            if not selected: selected = 'yui'
        
        if 'cssmin' in minify:
            opts = minify['cssmin']
            # convert to list/array if not so
            if not isinstance(opts, list): opts = [opts]
            compilers['cssmin'].option(" ".join(opts))
            if not selected: selected = 'cssmin'
        
        Beeld.Utils.write(data.tmp_in, data.src, options.encoding)

        extra = ''
        # use the selected compiler
        compiler = compilers[selected]
        if 'cssmin'==selected and "--basepath " not in compiler.options:
            extra = "--basepath "+options.basePath
        elif selected in ['yui', 'closure']:
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
        
        if 0==err: data.src = Beeld.Utils.read(data.tmp_out, options.encoding)
        
        # some error occured
        if 0!=err: 
            data.err = 'Error executing "'+cmd+'"'
            evt.abort()
            return
        
    evt.next()

