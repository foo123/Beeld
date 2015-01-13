#!/usr/bin/env node
/**
*
*   Beeld
*   https://github.com/foo123/Beeld
*
*   A scriptable and configurable source code builder framework in Node/PHP/Python
*   @version: 0.5
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
        /*keysToLower = function( obj ) {
            if ( obj )
            {
                var k, tmp;
                for (k in obj)
                {
                    if ( obj[HAS](k) )
                    {
                        tmp = obj[k];
                        delete obj[k];
                        obj[k.toLowerCase()] = tmp;
                    }
                }
            }
            return obj;
        },*/
        
        // needed variables
        /*CWD = process.cwd( ),*/ DIR = realpath(__dirname), FILE = path.basename(__filename), 
        TPLS = { }, parseArgs, parseOptions, getRealPath, getTpl, 
        DynamicObject, DTO, Pipeline, Beeld
    ; 
    
    DynamicObject = function( properties ) {
        var obj = new Object();
        if ( properties )
        {
            for (var k in properties)
            {
                if ( properties[HAS](k) )
                    obj[ k ] = properties[ k ];
            }
        }
        return obj;
    };
    
    //
    // adapted from node-commander package
    // https://github.com/visionmedia/commander.js/
    parseArgs = function( args ) {
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
    };
    parseOptions = function( defaults ) {
        // parse args
        var options, parsedargs;
        
        parsedargs = parseArgs( process.argv );
        options = extend(defaults, parsedargs.options);
        
        // if help is set, or no dependencis file, echo help message and exit
        if ( parsedargs.flags['h'] || options['help'] || !options['config'] || !options['config'].length )
        {
            echo ("usage: "+FILE+" [-h] [--config FILE] [--tasks TASKS] [--compiler COMPILER] [--enc ENCODING]");
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
            echo(" ");
            
            exit(1);
        }
        return options;
    };
    getTpl = function( id, enc ) {
        var tpl, tpl_id = 'tpl_'+id;
        if ( !TPLS[HAS](tpl_id) ) TPLS[tpl_id] = read( Beeld.templatesPath + id, enc );
        tpl = TPLS[tpl_id];
        return tpl.slice( );
    };
    getRealPath = function( file, basePath ) { 
        basePath = basePath || '';
        if (
            ''!=basePath && 
            (startsWith(file, './') || startsWith(file, '../') || startsWith(file, '.\\') || startsWith(file, '..\\'))
        ) 
            return joinPath(basePath, file); 
        else return file; 
    };
    
    function create_process_loop(dto, process_list, params)
    {
        var cmd, i = 0, l = process_list.length, step = 1;
        var process_loop = function process_loop( err, data ) {
            var tmp;
            if ( err )
            {
                params.err = 'Error executing "'+cmd+'"';
                dto.abort( );
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
                    cmd = process_list[i]
                            .split( '$dir' ).join( params.basePath )
                            .split( '$cwd' ).join( params.cwd )
                            .split( '$tpls' ).join( Beeld.templatesPath )
                            .split( '$infile' ).join( params.in_tuple )
                            .split( '$outfile' ).join( params.out_tuple )
                        ;
                    tmp = params.in_tuple;
                    params.in_tuple = params.out_tuple;
                    params.out_tuple = tmp;
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
                read_async(params.in_tuple, params.encoding, process_loop);
                return;
            }
            params.srcText = data;
            dto.next( );
        };
        return process_loop;
    }
    
    DTO = function( params, next, abort ) {
        this._params = params;
        this._next = next;
        this._abort = abort;
    };
    DTO.Params = DynamicObject;
    DTO[PROTO] = {
        constructor: DTO
        ,_params: null
        ,_next: null
        ,_abort: null
        ,dispose: function( ) {
            this._params = null;
            this._next = null;
            this._abort = null;
            return this;
        }
        ,params: function( ) {
            return this._params;
        }
        ,next: function( ) {
            if ('function' === typeof this._next )
                return this._next( this._params );
            return this._params;
        }
        ,abort: function( ) {
            if ('function' === typeof this._abort )
                return this._abort( this._params );
            return this._params;
        }
    };
    Pipeline = function( ) {
        this._tasks = [ ];
        this._abort = null;
    };
    Pipeline.DTO = DTO;
    Pipeline.dummyAbort = function( params ) { return params; };
    Pipeline[PROTO] = {
        constructor: Pipeline
        ,_tasks: null
        ,_abort: null
        ,dispose: function( ) {
            this._tasks = null;
            this._abort = null;
            return this;
        }
        ,add: function( task ) {
            this._tasks.push( task );
            return this;
        }
        ,abort: function( abortFunc ) {
            this._abort = abortFunc;
            return this;
        }
        ,run: function( params ) {
            var self = this, tasks = self._tasks, task, abort;
            if ( tasks && tasks.length )
            {
                task = tasks.shift( );
                if ('function'===typeof self._abort)
                    abort = function( params ){ return self._abort( params ); };
                else
                    abort = Pipeline.dummyAbort;
                return task(new DTO(
                    params, 
                    function( params ){ return self.run( params ); },
                    abort
                ));
            }
            return params;
        }
    };
    
    Beeld = function Beeld( ) {
        var self = this;
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
        };
        self.tasks = [ ];
        self.compilers = {
        'cssmin' : {
            'name' : 'CSS Minifier',
            'compiler' : 'node __{{PATH}}__cssmin.js __{{EXTRA}}__ __{{OPTIONS}}__ --input __{{INPUT}}__  --output __{{OUTPUT}}__',
            'options' : ''
        },
        'uglifyjs' : {
            'name' : 'Node UglifyJS Compiler',
            'compiler' : 'uglifyjs __{{INPUT}}__ __{{OPTIONS}}__ -o __{{OUTPUT}}__',
            'options' : ''
        },
        'closure' : {
            'name' : 'Java Closure Compiler',
            'compiler' : 'java -jar __{{PATH}}__closure.jar __{{EXTRA}}__ __{{OPTIONS}}__ --js __{{INPUT}}__ --js_output_file __{{OUTPUT}}__',
            'options' : ''
        },
        'yui' : { 
            'name' : 'Java YUI Compressor Compiler',
            'compiler' : 'java -jar __{{PATH}}__yuicompressor.jar __{{EXTRA}}__ __{{OPTIONS}}__ --type js -o __{{OUTPUT}}__  __{{INPUT}}__',
            'options' : ''
        }
        };
    };
    Beeld.VERSION = "0.5";
    Beeld.Pipeline = Pipeline;
    Beeld[PROTO] = {
        constructor: Beeld
        
        ,actions: null
        ,tasks: null
        ,compilers: null
        
        ,dispose: function( ) {
            var self = this;
            self.compilers = null;
            self.actions = null;
            self.tasks = null;
            return self;
        }
        
        ,addAction: function( action, handler ) {
            if ( action && 'function'===typeof handler )
            {
                this.actions['action_'+action] = handler;
            }
            return this;
        }
        
        ,addTask: function( task, actions ) {
            if ( task && actions )
            {
                this.tasks.push([task, actions]);
            }
            return this;
        }
        
        // parse input arguments, options and settings in hash format
        ,parse: function( ) {
            var params, config, options,  
                configurationFile, full_path, ext;
            
            params = DynamicObject( );
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
        }

        ,build: function( params ) {
            var self = this, pipeline, 
                tasks = null, actions = self.actions, 
                next_task, log_settings, abort_process, finish_process,
                config = params.config, task_key,
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
            pipeline = new Pipeline( );
            
            abort_process = function( ){
                pipeline.dispose( );
                pipeline = null;
                cleanup([params.in_tuple, params.out_tuple]);
                if ( params.err ) echoStdErr( params.err );
                params = null;
                exit( 1 );
            };
            
            if ( config[HAS]('tasks') )
            {
                for (var t=0; t<config.tasks.length; t++)
                {
                    task_key = keys(config.tasks[t])[0];
                    self.addTask(task_key, config.tasks[t][task_key]);
                    if ( params.selectedTasks && -1 < params.selectedTasks.indexOf(task_key) )
                    {
                        tasks = tasks || [];
                        tasks.push( [task_key, config.tasks[t][task_key]] );
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
            
            log_settings = function( dto ) {
                var params = dto.params(), sepLine = new Array(65).join("=");
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
                dto.next( );
            };
            finish_process = function( dto ){ 
                pipeline.dispose( );
                pipeline = null;
                cleanup([params.in_tuple, params.out_tuple]);
                dto.dispose( );
                params = null;
            };
            next_task = function( pipeline, config, tasks, default_actions, actions ) {
                var nonlocal = {tasks: tasks, i: 0, l: tasks.length};
                var switch_task = function switch_task( dto ) {
                    if ( nonlocal.i < nonlocal.l )
                    {
                        var task = nonlocal.tasks[nonlocal.i][0], 
                            config_new = nonlocal.tasks[nonlocal.i][1], 
                            action, a;
                        nonlocal.i += 1;
                        var params = dto.params();
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
                        pipeline.add( log_settings );
                        for (a=0; a<default_actions.length; a++)
                        {
                            action = 'action_' + default_actions[a];
                            if ( actions[HAS](action) ) pipeline.add( actions[ action ] );
                        }
                        if ( nonlocal.i < nonlocal.l ) pipeline.add( switch_task );
                        else pipeline.add( finish_process );
                        return dto.next( );
                    }
                    else
                    {
                        return finish_process( dto );
                    }
                };
                return switch_task;
            };
            
            pipeline
                .abort( abort_process )
                .add( next_task( pipeline, config, tasks, default_actions, actions ) )
                .run( params )
            ;
            return self;
        }
    };
    Beeld.compilersPath = joinPath(DIR, "compilers") + '/';
    Beeld.templatesPath = joinPath(DIR, "templates") + '/';
    Beeld.parsersPath = joinPath(DIR, "parsers") + '/';
    Beeld.Parsers = {
    Path: Beeld.parsersPath,
    
    JSON: DynamicObject({
        name: 'JSON Parser',
        format: 'JSON Format',
        ext: ".json",
        path: null,
        parser: JSON,
        load: function( ) {
            return JSON;
        },
        parse: function( text ) {
            return JSON.parse( text );
        }
    }),
    YAML: DynamicObject({
        name: 'Yaml Symfony Parser',
        format: 'Yaml Format',
        ext: ".yml/.yaml",
        path: Beeld.parsersPath + 'yaml.js',
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
    CUSTOM: DynamicObject({
        name: 'Custom Parser',
        format: 'Custom Format',
        ext: ".custom/*",
        path: Beeld.parsersPath + 'custom.js',
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
    Beeld.action_initially = function( dto ) { 
        return dto.next( );
    };
    Beeld.action_src = function( dto ) {
        var params = dto.params( ), config = params.config,
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
            params.srcText = buffer.join('');
        }
        return dto.next( );
    };
    Beeld.action_header = function( dto ) {
        var params = dto.params( ), headerText = params.headerText;
        params.headerText = '';
        if ( headerText )
        {
            if ( startsWith(headerText, '/**') )
                params.headerText = headerText.substr(0, headerText.indexOf("**/")+3);
            else if ( startsWith(headerText, '/*!') )
                params.headerText = headerText.substr(0, headerText.indexOf("!*/")+3);
        }
        return dto.next( );
    };
    Beeld.action_replace = function( dto ) {
        var params = dto.params( ), config = params.config;
        if ( config[HAS]('replace') && config.replace ) 
        {
            var replace = config.replace, k, i, l = replace.length, rep,
                hasHeader = !!(params.headerText && params.headerText.length)
            ;
            // ordered map
            for (i=0; i<l; i++)
            {
                for (k in replace[i])
                {
                    if ( replace[i][HAS](k) )
                    {
                        rep = replace[i][k];
                        params.srcText = params.srcText.split(k).join(rep);
                        if ( hasHeader ) params.headerText = params.headerText.split(k).join(rep);
                    }
                }
            }
        }
        return dto.next( );
    };
    Beeld.action_preprocess = function( dto ) { 
        var params = dto.params( ), config = params.config;
        if ( config[HAS]("preprocess") && config.preprocess.length )
        {
            create_process_loop(dto, [].concat(config.preprocess), params)( null );
        }
        else
        {
            return dto.next( );
        }
    };
    Beeld.action_doc = function( dto ) {
        var params = dto.params( ), config = params.config;
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
        return dto.next( );
    };
    Beeld.action_minify = function( dto ) {
        var params = dto.params( ), config = params.config;
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
                
            cmd = selectedCompiler.compiler
                    .split('__{{PATH}}__').join(Beeld.compilersPath)
                    .split('__{{EXTRA}}__').join(extra)
                    .split('__{{OPTIONS}}__').join(selectedCompiler.options)
                    .split('__{{INPUT}}__').join(params.in_tuple)
                    .split('__{{OUTPUT}}__').join(params.out_tuple)
                ;
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
                                            dto.next( );
                                        }
                                        else
                                        {
                                            params.err = 'Error reading minified file';
                                            dto.abort( );
                                        }
                                    });
                                }, 100);
                            }
                            else
                            {
                                params.err = 'Error executing "'+cmd+'"';
                                dto.abort( );
                            }
                        });
                    }, 100);
                }
                else
                {
                    params.err = 'Error writing input file for minification';
                    dto.abort( );
                }
            });
        }
        else
        {
            return dto.next( );
        }
    };
    Beeld.action_postprocess = function( dto ) { 
        var params = dto.params( ), config = params.config;
        if ( config[HAS]("postprocess") && config.postprocess.length )
        {
            create_process_loop(dto, [].concat(config.postprocess), params)( null );
        }
        else
        {
            return dto.next( );
        }
    };
    Beeld.action_bundle = function( dto ) {
        var params = dto.params( ), config = params.config, bundleFiles, count;
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
        return dto.next( );
    };
    Beeld.action_out = function( dto ) {
        var params = dto.params( ), text;
        // write the processed file
        text = params.bundleText + params.headerText + params.srcText;
        params.bundleText=null; params.headerText=null; params.srcText=null;
        if ( params.outputToStdOut ) 
        {
            echo( text );
            return dto.next( );
        }
        else 
        {
            write_async( params.outFile, text, params.encoding, function(){
                dto.next( );
            });
        }
    };
    Beeld.action_finally = function( dto ) {
        return dto.next( );
    };
    Beeld.Main = function( ) {
        var buildLib = new Beeld( );
        // do the process
        buildLib.build( buildLib.parse( ) ); 
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