#!/usr/bin/env node
/**
*
*   Beeld
*   https://github.com/foo123/Beeld
*
*   A scriptable and configurable source code builder framework in Node/PHP/Python
*   @version: 0.6
*
**/
!function (root, moduleName, moduleDefinition) {
    // node, CommonJS, etc..
    if ( 'object' == typeof(module) && module.exports ) module.exports = moduleDefinition();
}(this, 'Beeld', function( undef ) {
    "use strict";
    var PROTO = 'prototype', HAS = 'hasOwnProperty',
        // basic modules
        fs = require('fs'), path = require('path'), 
        exec_async = require('child_process').exec,
        realpath = fs.realpathSync, dirname = path.dirname, joinPath = path.join,
        exit = process.exit, echo = console.log, echo_stderr = console.error,
        // extra modules needed, node-temp
        temp = require('temp'),
        
        // auxilliary methods
        startsWith = String[PROTO].startsWith 
                ? function( s, pre, pos ){return s.startsWith(pre, pos||0);} 
                : function( s, pre, pos ){pos=pos||0; return pre === s.substr(pos, pre.length+pos);},
        
        keys = Object.keys,
        extend = function( o1, o2 ) { 
            o1 = o1 || {}; 
            for (var p in o1)
            { 
                if ( o2[HAS](p) && o1[HAS](p) && undef !== o2[p] ) 
                    o1[p] = o2[p]; 
            } 
            return o1; 
        },
        
        tmpfile = function( ) {
            return temp.path( {suffix: '.tmpnode'} );
        },
        
        read = function( file, enc ) {
            var buf = "";
            if ( file && fs.existsSync( file ) )
            {
                try { buf = fs.readFileSync(file, {encoding: enc||'utf8'}).toString( );  }
                catch (e) { buf = ""; }
            }
            return buf;
        },
        
        read_async = function( file, enc, cb ) {
            fs.exists(file, function(yes){
                if ( yes )
                {
                    fs.readFile(file, {encoding: enc||'utf8'}, function(err,data){
                        if ( cb ) cb( err, data.toString() );
                    });
                }
                else if ( cb )
                {
                    cb( '' );
                }
            });
        },
        
        write = function( file, text, enc ) {
            var res = null;
            try { res = fs.writeFileSync(file, text.toString(), {encoding: enc||'utf8'});  }
            catch (e) { }
            return res;
        },
        
        write_async = function( file, text, enc, cb ) {
            fs.writeFile(file, text.toString(), {encoding: enc||'utf8'}, function(err){
                if ( cb ) cb( err );
            });
        },
        
        unlink_async = function( file ) {
            if ( file )
            {
                fs.exists(file, function(yes){ if ( yes ) fs.unlink(file, function(err){ }); });
            }
        },
        
        cleanup = function( files ) {
            var i, l = files.length;
            for (i=0; i<l; i++) unlink_async( files[i] );
        },
        
        fileExt = function( fileName ) { return path.extname(fileName).toString( ); },
        
        // needed variables
        BEELD_FILE, BEELD_ROOT, BEELD_INCLUDES, BEELD_COMPILERS, BEELD_TEMPLATES, BEELD_PARSERS,
        TPLS = { }, PublishSubscribe, /*List, Map,*/ OrderedMap, Beeld
    ; 
    
    PublishSubscribe = require('./includes/PublishSubscribe');
    
    BEELD_FILE = path.basename(__filename);
    BEELD_ROOT = realpath(__dirname);
    BEELD_INCLUDES = joinPath(BEELD_ROOT, "includes") + '/';
    BEELD_COMPILERS = joinPath(BEELD_ROOT, "compilers") + '/';
    BEELD_TEMPLATES = joinPath(BEELD_ROOT, "templates") + '/';
    BEELD_PARSERS = joinPath(BEELD_ROOT, "parsers") + '/';

    //List = Array;
    //Map = Object;
    OrderedMap = function( om ) {
        this.om = om;
        this.index = 0;
    };
    OrderedMap[PROTO] = {
        constructor: OrderedMap,
        om: null,
        index: 0,
        
        hasNext: function( ) {
            return this.index < this.om.length;
        },
        getNext: function( ) {
            if (this.index < this.om.length)
            {
                var obj = this.om[this.index++], key = keys(obj)[0];
                return {key: key, val: obj[key]};
            }
            return null;
        },
        getItem: function( index ) {
            if (index >= 0 && index < this.om.length)
            {
                var obj = this.om[index], key = keys(obj)[0];
                return {key: key, val: obj[key]};
            }
            return null;
        },
        rewind: function( ) {
            this.index = 0;
            return this;
        }
    };
    
    function multi_replace( tpl, reps )
    {
        var out = tpl, i=0, l=reps.length;
        for (i=0; i<l; i++)
        {
            out = out.split(reps[i][0]).join(reps[i][1]);
        }
        return out;
    }
    
    //
    // adapted from node-commander package
    // https://github.com/visionmedia/commander.js/
    function parseArgs( args ) 
    {
        var 
            Flags = {}, Options = {},  Params = [],
            optionname = '',  argumentforoption = false,
            arg,   index,  i, len
        ;
        
        args = args || process.argv;
        // remove firt 2 args ('node' and 'this filename')
        args = args.slice(2);
        
        for (i = 0, len = args.length; i < len; ++i) 
        {
            arg = args[i];
            if (arg.length > 1 && '-' == arg[0] && '-' != arg[1]) 
            {
                arg.slice(1).split('').forEach(function(c){
                    Flags[c] = true;
                });
                argumentforoption = false;
            }
            /*/^--/.test(arg)*/
            else if (startsWith(arg, '--'))
            {
                index = arg.indexOf('=');
                if (~index)
                {
                    optionname = arg.slice(2, index);
                    Options[optionname] = arg.slice(index + 1);
                    argumentforoption = false;
                }
                else
                {
                    optionname = arg.slice(2);
                    Options[optionname] = true;
                    argumentforoption = true;
                }
            } 
            else 
            {
                if (argumentforoption)
                {
                    Options[optionname] = arg;
                }
                else
                {
                    Params.push(arg);
                }
                argumentforoption = false;
            }
        }
        
        return {flags: Flags, options: Options, params: Params};
    }
    
    function parseOptions( defaults ) 
    {
        // parse args
        var options, parsedargs;
        
        parsedargs = parseArgs( process.argv );
        options = extend(defaults, parsedargs.options);
        
        // if help is set, or no dependencis file, echo help message and exit
        if ( parsedargs.flags['h'] || options['help'] || !options['config'] || !options['config'].length )
        {
            echo ("usage: "+BEELD_FILE+" [-h] [--config FILE] [--tasks TASKS] [--compiler COMPILER] [--enc ENCODING]");
            echo (" ");
            echo ("Build Source Code Packages (js/css)");
            echo (" ");
            echo ("optional arguments:");
            echo ("  -h, --help              show this help message and exit");
            echo ("  --config   FILE         configuration file (REQUIRED)");
            echo ("  --tasks    TASKS        specific tasks to run with commas (OPTIONAL)");
            echo ("                          DEFAULT: all tasks defined in config file");
            echo ("  --compiler COMPILER     source compiler to use (OPTIONAL)");
            echo ("                          Whether to use uglifyjs, closure,");
            echo ("                          yui, or cssmin compiler");
            echo ("                          DEFAULT: uglifyjs");
            echo ("  --enc      ENCODING     set text encoding");
            echo ("                          DEFAULT: utf8");
            echo (" ");
            
            exit(1);
        }
        return options;
    }
    
    function getTpl( id, enc ) 
    {
        var tpl, tpl_id = 'tpl_'+id;
        if ( !TPLS[HAS](tpl_id) ) TPLS[tpl_id] = read( BEELD_TEMPLATES + id, enc );
        tpl = TPLS[tpl_id];
        return tpl.slice( );
    }
    
    function getRealPath( file, basePath ) 
    { 
        basePath = basePath || '';
        if (
            ''!=basePath && 
            (startsWith(file, './') || startsWith(file, '../') || startsWith(file, '.\\') || startsWith(file, '..\\'))
        ) 
            return joinPath(basePath, file); 
        else return file; 
    }
    
    function run_process_loop( evt, params, process_list )
    {
        var cmd, i = 0, l = process_list.length, step = 1;
        var process_loop = function process_loop( err, data ) {
            if ( err )
            {
                params.err = 'Error executing "'+cmd+'"';
                evt.abort( );
                return;
            }
            if ( 1 === step )
            {
                step = 2; i = 0;
                cmd = 'write input file for process_loop';
                write_async(params.in_tuple, params.srcText, params.encoding, process_loop);
                return;
            }
            if ( 2 === step )
            {
                if ( i < l )
                {
                    cmd = multi_replace(process_list[i], [
                     ['${DIR}',          params.basePath]
                    ,['${CWD}',          params.cwd]
                    ,['${COMPILERS}',    BEELD_COMPILERS]
                    ,['${TPLS}',         BEELD_TEMPLATES]
                    ,['${IN}',           params.in_tuple]
                    ,['${OUT}',          params.out_tuple]
                    ]);
                    i+=1;
                    exec_async(cmd, null, process_loop);
                    return;
                }
                else
                {
                    step = 3;
                }
            }
            if ( 3 === step )
            {
                step = 4;
                cmd = 'read output file for process_loop';
                read_async(params.out_tuple, params.encoding, process_loop);
                return;
            }
            params.srcText = data;
            evt.next( );
        };
        process_loop( null );
    }
    
    Beeld = function Beeld( ) {
        var self = this;
        
        self.initPubSub( );
        
        self.actions = {
         'action_initially': Beeld.Actions.action_initially
        ,'action_src': Beeld.Actions.action_src
        ,'action_header': Beeld.Actions.action_header
        ,'action_replace': Beeld.Actions.action_replace
        ,'action_preprocess': Beeld.Actions.action_preprocess
        ,'action_doc': Beeld.Actions.action_doc
        ,'action_minify': Beeld.Actions.action_minify
        ,'action_postprocess': Beeld.Actions.action_postprocess
        ,'action_bundle': Beeld.Actions.action_bundle
        ,'action_out': Beeld.Actions.action_out
        ,'action_finally': Beeld.Actions.action_finally
        };
        
        self.tasks = [ ];
        
        self.compilers = {
        'cssmin' : {
            'name' : 'CSS Minifier',
            'compiler' : 'node ${COMPILERS}cssmin.js ${EXTRA} ${OPTIONS} --input ${IN}  --output ${OUT}',
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
        };
    };
    Beeld.VERSION = "0.6";
    
    Beeld.OrderedMap = function( om ){
        return new OrderedMap(om);
    };
    
    //
    // Beeld default parsers
    Beeld.Parsers = {
    Path: BEELD_PARSERS,
    
    JSON: PublishSubscribe.Data({
        name: 'JSON Parser',
        format: 'JSON Format',
        ext: ".json",
        path: BEELD_PARSERS + 'json.js',
        parser: JSON,
        load: function( ) {
            return require( Beeld.Parsers.JSON.path );
        },
        parse: function( text ) {
            if ( !Beeld.Parsers.JSON.parser ) 
                Beeld.Parsers.JSON.parser = Beeld.Parsers.JSON.load( );
            return Beeld.Parsers.JSON.parser.parse( text );
        }
    }),
    YAML: PublishSubscribe.Data({
        name: 'Yaml Symfony Parser',
        format: 'Yaml Format',
        ext: ".yml/.yaml",
        path: BEELD_PARSERS + 'yaml.js',
        parser: null,
        load: function( ) {
            return require( Beeld.Parsers.YAML.path );
        },
        parse: function( text ) {
            if ( !Beeld.Parsers.YAML.parser ) 
                Beeld.Parsers.YAML.parser = Beeld.Parsers.YAML.load( );
            return Beeld.Parsers.YAML.parser.parse( text );
        }
    }),
    CUSTOM: PublishSubscribe.Data({
        name: 'Custom Parser',
        format: 'Custom Format',
        ext: ".custom/*",
        path: BEELD_PARSERS + 'custom.js',
        parser: null,
        load: function( ) {
            return require( Beeld.Parsers.CUSTOM.path );
        },
        parse: function( text ) {
            if ( !Beeld.Parsers.CUSTOM.parser ) 
                Beeld.Parsers.CUSTOM.parser = Beeld.Parsers.CUSTOM.load( );
            return Beeld.Parsers.CUSTOM.parser.parse( text );
        }
    })
    };
    
    //
    // Beeld default actions
    Beeld.Actions = {
     action_initially: function( evt ) { 
        evt.next( );
    }
    ,action_src: function( evt ) {
        var params = evt.data.data, config = params.config,
            srcFiles, count, buffer, i, filename, headerFile,
            tplid = '!tpl:', tplidlen = tplid.length, doneheader = false;
            
        params.srcText = '';
        params.headerText = null;
        
        if ( config[HAS]('src') )
        {
            // make it array
            srcFiles = [].concat( config['src']||[] );
            count = srcFiles.length;
        }
        else
        {
            srcFiles = null;
            count = 0;
        }
        
        if ( config[HAS]('header') )
        {
            headerFile = config.header;
        }
        else
        {
            headerFile = null;
        }
        
        if (srcFiles && count)
        {
            buffer = [];
            for (i=0; i<count; i++)
            {
                filename = srcFiles[i];
                if ( !filename.length ) continue;
                
                if ( startsWith(filename, tplid) )
                    // template file
                    buffer.push( getTpl( filename.substr(tplidlen), params.encoding ) );
                else
                    // src file
                    buffer.push( read( getRealPath( filename, params.basePath ), params.encoding ) );
                
                if ( !doneheader )
                {
                    if ( headerFile && filename == headerFile )
                    {
                        params.headerText = buffer[buffer.length-1];
                        doneheader = true;
                    }
                    else if ( !headerFile )
                    {
                        params.headerText = buffer[buffer.length-1];
                        doneheader = true;
                    }
                }
            }
            // header file is NOT one of the source files
            if ( headerFile && null === params.headerText )
                params.headerText = read( getRealPath( headerFile, params.basePath ) );
            params.srcText = buffer.join('');
        }
        evt.next( );
    }
    ,action_header: function( evt ) {
        var params = evt.data.data, headerText = params.headerText;
        params.headerText = '';
        if ( headerText )
        {
            if ( startsWith(headerText, '/**') )
                params.headerText = headerText.substr(0, headerText.indexOf("**/")+3);
            else if ( startsWith(headerText, '/*!') )
                params.headerText = headerText.substr(0, headerText.indexOf("!*/")+3);
        }
        evt.next( );
    }
    ,action_replace: function( evt ) {
        var params = evt.data.data, config = params.config;
        if ( config[HAS]('replace') && config.replace ) 
        {
            var replace = Beeld.OrderedMap(config.replace), rep,
                hasHeader = !!(params.headerText && params.headerText.length)
            ;
            // ordered map
            while ( replace.hasNext( ) )
            {
                rep = replace.getNext();
                params.srcText = params.srcText.split(rep.key).join(rep.val);
                if ( hasHeader ) params.headerText = params.headerText.split(rep.key).join(rep.val);
            }
        }
        evt.next( );
    }
    ,action_preprocess: function( evt ) { 
        var params = evt.data.data, config = params.config;
        if ( config[HAS]("preprocess") && config.preprocess.length )
        {
            run_process_loop(evt, params, [].concat(config.preprocess));
        }
        else
        {
            evt.next( );
        }
    }
    ,action_doc: function( evt ) {
        var params = evt.data.data, config = params.config;
        if ( config[HAS]('doc') && config['doc'][HAS]('output') )
        {
            var doc = config.doc, 
                docFile = getRealPath(doc['output'], params.basePath),
                docs = [], startDoc = doc['startdoc'], endDoc = doc['enddoc'], 
                isRegex = 0, _trim = null, _trimlen = 0,
                blocks, i, l, tmp, j, l2, sep
            ;
            
            sep = doc[HAS]('separator') ? doc['separator'] : "\n\n";
            
            if ( doc[HAS]('trimx') )
            {
                isRegex = 1;
                _trim = new RegExp('^'+doc['trimx']);
            }
            else if ( doc[HAS]('trim') )
            {
                isRegex = 0;
                _trim = doc['trim'];
                _trimlen = _trim.length;
            }
            
            // extract doc blocks
            blocks = params.srcText.split( startDoc );
            l = blocks.length;
            for (i=0; i<l; i++)
            {
                tmp = blocks[i].split( endDoc );
                if ( tmp.length > 1 ) docs.push( tmp[0] );
            }
            blocks = null;
            
            // trim start of each doc block line
            if (_trim)
            {
                l = docs.length;
                for (i=0; i<l; i++)
                {
                    tmp = docs[i].split( "\n" );
                    l2 = tmp.length;
                    for (j=0; j<l2; j++)
                    {
                        if (tmp[j].length)
                        {
                            if (isRegex)
                            {
                                tmp[j] = tmp[j].replace(_trim, '');
                            }
                            else if ( _trim == tmp[j].substr(0, _trimlen) )
                            {
                                tmp[j] = tmp[j].substr(_trimlen);
                            }
                        }
                    }
                    docs[i] = tmp.join( "\n" );
                }
            }
            write_async(docFile, docs.join( sep ), params.encoding);
        }
        evt.next( );
    }
    ,action_minify: function( evt ) {
        var params = evt.data.data, config = params.config;
        if ( config[HAS]('minify') && !!params.srcText )
        {
            var minsets = config.minify;
            
            if ( minsets[HAS]('uglifyjs') )
            {
                // make it array
                params.compilers.uglifyjs.options = [].concat( minsets['uglifyjs'] ).join(" ");
            }
            if ( minsets[HAS]('closure') )
            {
                // make it array
                params.compilers.closure.options = [].concat( minsets['closure'] ).join(" ");
            }
            if ( minsets[HAS]('yui') )
            {
                // make it array
                params.compilers.yui.options = [].concat( minsets['yui'] ).join(" ");
            }
            if ( minsets[HAS]('cssmin') )
            {
                // make it array
                params.compilers.cssmin.options = [].concat( minsets['cssmin'] ).join(" ");
            }
            
            var cmd, extra = '', selected = params.selectedCompiler,
                selectedCompiler = params.compilers[selected];
            // use the selected compiler
            if ('cssmin'===selected && 0 > selectedCompiler.options.indexOf("--basepath "))
            {
                extra = "--basepath "+params.basePath;
            }
            else if ('yui'===selected || 'closure'===selected)
            {
                extra = "--charset "+params.encoding;
            }
                
            cmd = multi_replace(selectedCompiler.compiler, [
             ['${COMPILERS}',    BEELD_COMPILERS]
            ,['${EXTRA}',        extra]
            ,['${OPTIONS}',      selectedCompiler.options]
            ,['${IN}',           params.in_tuple]
            ,['${OUT}',          params.out_tuple]
            ]);
            write_async( params.in_tuple, params.srcText, params.encoding, function( err ){
                if ( !err )
                {
                    // add some delay here
                    setTimeout(function(){
                        exec_async(cmd, null, function(err, stdout, stderr) {
                            if ( stderr ) echo_stderr(stderr);
                            if ( !err )
                            {
                                // add some delay here
                                setTimeout(function(){
                                    read_async( params.out_tuple, params.encoding, function(err, data){
                                        if ( !err )
                                        {
                                            params.srcText = data;
                                            evt.next( );
                                        }
                                        else
                                        {
                                            params.err = 'Error reading minified file';
                                            evt.abort( );
                                        }
                                    });
                                }, 100);
                            }
                            else
                            {
                                params.err = 'Error executing "'+cmd+'"';
                                evt.abort( );
                            }
                        });
                    }, 100);
                }
                else
                {
                    params.err = 'Error writing input file for minification';
                    evt.abort( );
                }
            });
        }
        else
        {
            evt.next( );
        }
    }
    ,action_postprocess: function( evt ) { 
        var params = evt.data.data, config = params.config;
        if ( config[HAS]("postprocess") && config.postprocess.length )
        {
            run_process_loop(evt, params, [].concat(config.postprocess));
        }
        else
        {
            evt.next( );
        }
    }
    ,action_bundle: function( evt ) {
        var params = evt.data.data, config = params.config, bundleFiles, count;
        params.bundleText = '';
        if ( config[HAS]('bundle') )
        {
            // make it array
            bundleFiles = [].concat( config.bundle||[] );
            count = bundleFiles.length;
        }
        else
        {
            bundleFiles = null;
            count = 0;
        }
        if (bundleFiles && count)
        {
            var buffer = [ ], i, filename;
            for (i=0; i<count; i++)
            {
                filename = bundleFiles[i];
                if (!filename.length) continue;
                buffer.push( read( getRealPath( filename, params.basePath ), params.encoding ) );
            }
            params.bundleText = buffer.join("\n") + "\n";
        }
        evt.next( );
    }
    ,action_out: function( evt ) {
        var params = evt.data.data, text;
        // write the processed file
        text = params.bundleText + params.headerText + params.srcText;
        params.bundleText=null; params.headerText=null; params.srcText=null;
        if ( params.outputToStdOut ) 
        {
            echo( text );
            evt.next( );
        }
        else 
        {
            write_async( params.outFile, text, params.encoding, function(){
                evt.next( );
            });
        }
    }
    ,action_finally: function( evt ) {
        evt.next( );
    }
    };
    
    
    // extends/implements PublishSubscribe
    Beeld[PROTO] = Object.create( PublishSubscribe[PROTO] );
    
    Beeld[PROTO].constructor = Beeld;
        
    Beeld[PROTO].actions = null;
    Beeld[PROTO].tasks = null;
    Beeld[PROTO].compilers = null;
        
    Beeld[PROTO].dispose = function( ) {
        var self = this;
        self.disposePubSub( );
        self.compilers = null;
        self.actions = null;
        self.tasks = null;
        return self;
    };
    
    Beeld[PROTO].addAction = function( action, handler ) {
        if ( action && 'function'===typeof handler )
        {
            this.actions['action_'+action] = handler;
        }
        return this;
    };
    
    Beeld[PROTO].addTask = function( task, actions ) {
        if ( task && actions )
        {
            this.tasks.push([task, actions]);
        }
        return this;
    };
    
    // parse input arguments, options and settings in hash format
    Beeld[PROTO].parse = function( ) {
        var params, config, options,  
            configurationFile, full_path, ext;
        
        params = PublishSubscribe.Data( );
        options = parseOptions({
            'help' : false,
            'config' : false,
            'tasks' : false,
            'compiler' : 'uglifyjs',
            'enc' : 'utf8'
        });
        
        params.compilers = this.compilers;
        // fix compiler selection
        options.compiler = options.compiler.toLowerCase();
        if ( !params.compilers[HAS](options.compiler) ) options.compiler = 'uglifyjs';
        
        // if options are correct continue
        // get real-dir of deps file
        full_path = params.configFile = realpath(options.config);
        params.basePath = dirname(full_path);
        params.cwd = process.cwd( );
        params.encoding = options.enc.toLowerCase();
        params.selectedCompiler = options.compiler;
        params.selectedTasks = options.tasks ? options.tasks.split(',') : false;
        
        // parse config settings
        ext = fileExt(full_path).toLowerCase();
        if ( !ext.length ) ext = ".custom";
        
        configurationFile = read(params.configFile, params.encoding);
        // parse dependencies file in JSON format
        if ( ".json" == ext ) 
        {
            params.inputType = Beeld.Parsers.JSON.format + ' (' + Beeld.Parsers.JSON.ext + ')';
            config = Beeld.Parsers.JSON.parse( configurationFile );
        }
        // parse dependencies file in YAML format
        else if ( ".yml" == ext || ".yaml" == ext )
        {
            params.inputType = Beeld.Parsers.YAML.format + ' (' + Beeld.Parsers.YAML.ext + ')';
            config = Beeld.Parsers.YAML.parse( configurationFile );
        }
        // parse dependencies file in custom format
        else
        {
            params.inputType = Beeld.Parsers.CUSTOM.format + ' (' + Beeld.Parsers.CUSTOM.ext + ')';
            config = Beeld.Parsers.CUSTOM.parse( configurationFile );
        }
        config = config||{};
        params.config = config;
        //echo(JSON.stringify(params.config, null, 4));
        //exit(0);
        return params;
    };

    Beeld[PROTO].build = function( params ) {
        var self = this, 
            tasks = null, actions = self.actions, 
            next_task, log_settings, abort_process, finish_process,
            config = params.config, task,
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
        ;
        
        params.in_tuple = null; 
        params.out_tuple = null;
        
        abort_process = function( evt ){
            if ( evt )
            {
                var params = evt.data.data;
                cleanup([params.in_tuple, params.out_tuple]);
                if ( params.err ) echoStdErr( params.err );
                evt.dispose( );
                params = null;
            }
            exit( 1 );
        };
        
        if ( config[HAS]('tasks') )
        {
            config.tasks = Beeld.OrderedMap(config.tasks);
            while (config.tasks.hasNext())
            {
                task = config.tasks.getNext();
                self.addTask(task.key, task.val);
                if ( params.selectedTasks && -1 < params.selectedTasks.indexOf(task.key) )
                {
                    tasks = tasks || [];
                    tasks.push( [task.key, task.val] );
                }
            }
        }
        if ( !tasks )
        {
            if ( false === params.selectedTasks )
            {
                if ( self.tasks.length )
                    tasks = self.tasks;
                else if ( config )
                    tasks = [['default', config]];
            }
        }
        if ( !tasks )
        {
            params.err = 'Task is not defined';
            abort_process( params );
        }
        params.config = {};
        
        params.in_tuple = tmpfile( ); 
        params.out_tuple = tmpfile( );
        params.currentTask = '';
        params.pipeline = self;
        
        log_settings = function( evt ) {
            var params = evt.data.data, sepLine = new Array(66).join("=");
            // output the build settings
            if ( !params.outputToStdOut )
            {
                echo (sepLine);
                echo (" Build Package ");
                echo (sepLine);
                echo (" ");
                echo ("Input    : " + params.inputType);
                echo ("Encoding : " + params.encoding);
                echo ("Task     : " + params.currentTask);
                if (params.doMinify)
                {
                    echo ("Minify   : ON");
                    echo ("Compiler : " + params.compilers[params.selectedCompiler]['name']);
                }
                else
                {
                    echo ("Minify   : OFF");
                }
                echo ("Output   : " + params.outFile);
                echo (" ");
            }
            evt.next( );
        };
        finish_process = function( evt ){ 
            var params = evt.data.data;
            cleanup([params.in_tuple, params.out_tuple]);
            evt.dispose( );
            params = null;
        };
        next_task = function( config, tasks, default_actions, actions ) {
            var nonlocal = {tasks: tasks, i: 0, l: tasks.length};
            var switch_task = function switch_task( evt ) {
                if ( nonlocal.i < nonlocal.l )
                {
                    var task = nonlocal.tasks[nonlocal.i][0], 
                        config_new = nonlocal.tasks[nonlocal.i][1], 
                        action, a;
                    nonlocal.i += 1;
                    var params = evt.data.data, pipeline = params.pipeline;
                    params.config = config_new;
                    params.currentTask = task;
                    params.bundleText = null; 
                    params.headerText = null; 
                    params.srcText = null;
                    params.err = false;
                    if ( config_new[HAS]('out') )
                    {
                        params.outFile = getRealPath(config_new.out, params.basePath);
                        params.outputToStdOut = false;
                    }
                    else
                    {
                        params.outFile = null;
                        params.outputToStdOut = true;
                    }
                    if ( config_new[HAS]('minify') )
                    {
                        params.doMinify = true;
                    }
                    else
                    {
                        params.doMinify = false;
                    }
                    pipeline.on('#actions', log_settings);
                    for (a=0; a<default_actions.length; a++)
                    {
                        action = 'action_' + default_actions[a];
                        if ( actions[HAS](action) ) pipeline.on('#actions', actions[ action ]);
                    }
                    if ( nonlocal.i < nonlocal.l ) pipeline.on('#actions', switch_task);
                    else pipeline.on('#actions', finish_process);
                    evt.next( );
                }
                else
                {
                    finish_process( evt );
                }
            };
            return switch_task;
        };
        
        self
            .on('#actions', next_task( config, tasks, default_actions, actions ))
            .pipeline('#actions', params, abort_process)
        ;
        return self;
    };
    
    Beeld.Main = function( ) {
        var builder = new Beeld( );
        // do the process
        builder.build( builder.parse() ); 
    };

    // if called from command-line
    if ( require && require.main === module ) 
    {
        // do the process
        Beeld.Main( );
    }
    
    // export it
    return Beeld;
});