#!/usr/bin/env node
/**
*
*   Beeld
*   https://github.com/foo123/Beeld
*
*   A scriptable and configurable source code builder framework in Node/PHP/Python
*   @version: 0.7
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
        realpath = fs.realpathSync, dirname = path.dirname, join_path = path.join,
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
        
        file_ext = function( fileName ) { return path.extname(fileName).toString( ); },
        
        // needed variables
        BEELD_FILE, BEELD_ROOT, BEELD_INCLUDES, BEELD_PARSERS, BEELD_COMPILERS, BEELD_TEMPLATES, BEELD_PLUGINS,
        TPLS = { }, PublishSubscribe, /*List, Map,*/ OrderedMap, 
        BeeldParser, BeeldCompiler, Beeld
    ; 
    
    BEELD_FILE = path.basename(__filename);
    BEELD_ROOT = realpath(__dirname);
    BEELD_INCLUDES = join_path(BEELD_ROOT, "includes") + '/';
    BEELD_PARSERS = join_path(BEELD_INCLUDES, "parsers") + '/';
    BEELD_COMPILERS = join_path(BEELD_ROOT, "compilers") + '/';
    BEELD_TEMPLATES = join_path(BEELD_ROOT, "templates") + '/';
    BEELD_PLUGINS = join_path(BEELD_ROOT, "plugins") + '/';

    PublishSubscribe = require(BEELD_INCLUDES + 'PublishSubscribe.js');
    
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
        getNext: function( raw ) {
            if (this.index < this.om.length)
            {
                if ( true === raw )
                {
                    return this.om[this.index++];
                }
                else
                {
                    var obj = this.om[this.index++], key = keys(obj)[0];
                    return [key, obj[key]];
                }
            }
            return null;
        },
        hasItem: function( index ) {
            return (index >= 0 && index < this.om.length);
        },
        hasItemByKey: function( key ) {
            var om = this.om, i, l = om.length;
            for (i=0; i<l; i++)
            {
                if (om[i] && om[i][HAS](key)) 
                    return i;
            }
            return -1;
        },
        getItem: function( index ) {
            if (index >= 0 && index < this.om.length)
            {
                var obj = this.om[index], key = keys(obj)[0];
                return [key, obj[key]];
            }
            return null;
        },
        getItemByKey: function( key ) {
            var om = this.om, i, l = om.length;
            for (i=0; i<l; i++)
            {
                if (om[i] && om[i][HAS](key)) 
                    return [key, om[i][key]];
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
    
    function showHelpMsg( )
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
    }
    
    function parseOptions( defaults, required, show_help_msg ) 
    {
        // parse args
        var options, parsedargs, is_valid, i, opt;
        
        parsedargs = parseArgs( process.argv );
        options = extend(defaults, parsedargs.options);
        
        is_valid = true;
        
        // if help is set, or no dependencis file, echo help message and exit
        if ( parsedargs.flags['h'] || options['help'] )
        {
            is_valid = false;
        }
        else
        {
            for(i=0; i<required.length; i++)
            {
                opt = required[i];
                if ( !options[HAS](opt) || !options[opt] || !options[opt].length )
                {
                    is_valid = false;
                    break;
                }
            }
        }
        
        if ( !is_valid )
        {
            show_help_msg();
            exit(1);
        }
        return options;
    }
    
    function get_tpl( id, enc ) 
    {
        var tpl, tpl_id = 'tpl_'+id;
        if ( !TPLS[HAS](tpl_id) ) TPLS[tpl_id] = read( BEELD_TEMPLATES + id, enc );
        tpl = TPLS[tpl_id];
        return tpl.slice( );
    }
    
    function get_real_path( file, basePath ) 
    { 
        basePath = basePath || '';
        if (
            ''!=basePath && 
            (startsWith(file, './') || startsWith(file, '../') || startsWith(file, '.\\') || startsWith(file, '..\\'))
        ) 
            return join_path(basePath, file); 
        else return file; 
    }
    
    BeeldParser = function(path, class_name, name) {
        var self = this;
        self.path = path;
        self.class_name = class_name;
        self.name = name;
        //self.format = format;
        //self.ext = ext;
        self.parser = null;
        //self.parse_method = parse_method || null;
    };
    BeeldParser[PROTO] = {
        constructor: BeeldParser,
        class_name: null,
        name: null,
        //format: null,
        //ext: null,
        path: null,
        parser: null,
        //parse_method: null,
        
        dispose: function( ) {
            var self = this;
            self.class_name = null;
            self.name = null;
            //self.format = null;
            //self.ext = null;
            self.path = null;
            self.parser = null;
            //self.parse_method = null;
            return self;
        },
        
        load: function( ) {
            return require( this.path );
        },
        
        parse: function( text ) {
            if ( !this.parser ) 
                this.parser = this.load( );
            return this.parser.parse( text );
        }
    };
    
    BeeldCompiler = function( name, cmd, options ) {
        this.name = name;
        this.cmd_tpl = cmd;
        this.options = options || '';
    };
    BeeldCompiler[PROTO] = {
        constructor: BeeldCompiler,
        name: null,
        cmd_tpl: null,
        options: null,
        
        dispose: function( ) {
            this.name = null;
            this.cmd_tpl = null;
            this.options = null;
            return this;
        },
        
        compiler: function( args ) {
            return multi_replace(this.cmd_tpl, args||[]);
        },
        
        option: function( opt ) {
            opt = String(opt);
            var p = (this.options.length && opt.length) ? " " : "";
            this.options += p + opt;
            return this;
        }
    };
    
    Beeld = function Beeld( ) {
        var self = this;
        
        self.initPubSub( );
        
        self.actions = {
         'action_src': Beeld.Actions.action_src
        ,'action_header': Beeld.Actions.action_header
        ,'action_replace': Beeld.Actions.action_replace
        ,'action_process-shell': Beeld.Actions.action_shellprocess
        ,'action_minify': Beeld.Actions.action_minify
        ,'action_bundle': Beeld.Actions.action_bundle
        ,'action_out': Beeld.Actions.action_out
        };
    };
    Beeld.VERSION = "0.7";
    
    Beeld.OrderedMap = function( om ){
        return new OrderedMap(om);
    };
    
    Beeld.Parser = function( path, class_name, name ){
        return new BeeldParser(path, class_name, name);
    };
    
    Beeld.Compiler = function( name, cmd, options ){
        return new BeeldCompiler(name, cmd, options);
    };
    
    Beeld.Obj = PublishSubscribe.Data;
    
    Beeld.Utils = {
        startsWith: startsWith,
        multi_replace: multi_replace,
        read: read,
        write: write,
        read_async: read_async,
        write_async: write_async,
        join_path: join_path,
        tmpfile: tmpfile,
        get_real_path: get_real_path,
        extend: extend
    };
    
    //
    // Beeld default parsers
    Beeld.Parsers = {
    ".json": Beeld.Parser(
        BEELD_PARSERS + 'Json_Parser.js',
        'Json_Parser',
        'JSON Parser'
    ),
    ".yml": Beeld.Parser(
        BEELD_PARSERS + 'Yaml_Parser.js',
        'YAML',
        'Yaml Symfony Parser'
    ),
    ".custom": Beeld.Parser(
        BEELD_PARSERS + 'Custom_Parser.js',
        'Custom_Parser',
        'Custom Parser'
    )
    };
    // aliases
    Beeld.Parsers[".yaml"] = Beeld.Parsers[".yml"];
    Beeld.Parsers["*"] = Beeld.Parsers[".custom"];
    
    //
    // Beeld default actions
    Beeld.Actions = {
     
     abort: function( evt, params ) {
        if ( evt && !params) params = evt.data.data;
        var config = params.config, 
            options = params.options, 
            data = params.data, 
            current = params.current;
        cleanup([data.tmp_in, data.tmp_out]);
        if ( data.err ) echoStdErr( data.err );
        current.dispose();
        data.dispose();
        options.dispose();
        params.compilers = null;
        params.current = null;
        params.data = null;
        params.config = null;
        params.options = null;
        if ( evt ) evt.dispose();
        exit( 1 );
    }
    ,log: function( evt ) {
        var params = evt.data.data,
            options = params.options, 
            data = params.data, 
            current = params.current,
            sepLine = new Array(66).join("=");
        // output the build settings
        if ( !options.outputToStdOut )
        {
            echo (sepLine);
            echo (" Build Package ");
            echo (sepLine);
            echo (" ");
            echo ("Input    : " + options.inputType);
            echo ("Encoding : " + options.encoding);
            echo ("Task     : " + current.task);
            if (options.minify)
            {
                echo ("Minify   : ON");
                echo ("Compiler : " + params.compilers[options.compiler].name);
            }
            else
            {
                echo ("Minify   : OFF");
            }
            echo ("Output   : " + options.out);
            echo (" ");
        }
        evt.next( );
    }
    ,finish: function( evt ) { 
        var params = evt.data.data,
            options = params.options, 
            data = params.data, 
            current = params.current;
        cleanup([data.tmp_in, data.tmp_out]);
        current.dispose();
        data.dispose();
        options.dispose();
        params.compilers = null;
        params.current = null;
        params.data = null;
        params.config = null;
        params.options = null;
        evt.dispose();
    }
    ,next_action: function( evt ) {
        var params = evt.data.data,
            current = params.current,
            task_actions = current.task_actions;
        if ( task_actions && task_actions.hasNext() )
        {
            var a = task_actions.getNext(), 
                action = 'action_' + a[0];
            if ( current.actions[HAS](action) )
            {
                current.action = a[0];
                current.action_cfg = a[1];
                current.actions[ action ]( evt );
            }
            else
            {
                evt.next();
            }
        }
        else
        {
            evt.next();
        }
    }
    ,next_task: function next_task( evt ) {
        var params = evt.data.data,
            options = params.options, 
            data = params.data, 
            current = params.current,
            current_tasks = current.tasks,
            pipeline = params.pipeline
            ;
        if ( current_tasks && current_tasks.hasNext() )
        {
            var task = current_tasks.getNext();
            
            current.task = task[0];
            current.task_actions = Beeld.OrderedMap(task[1]);
            current.action = '';
            current.action_cfg = null;
            
            data.bundle = ''; 
            data.header = ''; 
            data.src = '';
            data.err = false;
            
            var out = current.task_actions.getItemByKey('out');
            if ( out )
            {
                options.out = get_real_path(out[1], options.basePath);
                options.outputToStdOut = false;
            }
            else
            {
                options.out = null;
                options.outputToStdOut = true;
            }
            if ( -1 < current.task_actions.hasItemByKey('minify') )
            {
                options.minify = true;
            }
            else
            {
                options.minify = false;
            }
            
            // default header action
            // is first file of src if exists
            var src_action = current.task_actions.hasItemByKey('src');
            if ( !current.task_actions.getItemByKey('header') && (-1 < src_action) )
            {
                var src_cfg = current.task_actions.getItemByKey('src');
                current.task_actions.om.splice(src_action, 0, {'header':src_cfg[1][0]});
            }
            
            pipeline.on('#actions', Beeld.Actions.log);
            
            while (current.task_actions.hasNext())
            {
                current.task_actions.getNext();
                pipeline.on('#actions', Beeld.Actions.next_action);
            }
            current.task_actions.rewind( );
            
            if ( current_tasks.hasNext() ) 
            {
                pipeline.on('#actions', next_task);
            }
            else 
            {
                pipeline.on('#actions', Beeld.Actions.finish);
            }
            
            evt.next( );
        }
        else
        {
            Beeld.Actions.finish( evt );
        }
    }
    
    /* action_initially: function( evt ) { 
        evt.next( );
    }*/
    
    ,action_src: function( evt ) {
        var params = evt.data.data, 
            options = params.options, 
            data = params.data, 
            current = params.current,
            srcFiles, count, buffer, i, filename,
            tplid = '!tpl:', tplidlen = tplid.length;
            
        data.src = '';
        
        if ( current.action_cfg )
        {
            // make it array
            srcFiles = [].concat( current.action_cfg||[] );
            count = srcFiles.length;
        }
        else
        {
            srcFiles = null;
            count = 0;
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
                    buffer.push( get_tpl( filename.substr(tplidlen), options.encoding ) );
                else
                    // src file
                    buffer.push( read( get_real_path( filename, options.basePath ), options.encoding ) );
            }
            data.src = buffer.join('');
        }
        evt.next( );
    }
    ,action_header: function( evt ) {
        var params = evt.data.data, 
            options = params.options, 
            data = params.data, 
            current = params.current,
            headerFile = current.action_cfg,
            headerText = null;
        
        data.header = '';
        
        if ( headerFile && headerFile.length )
        {
            headerText = read( get_real_path( headerFile, options.basePath ), options.encoding );
        }
        if ( headerText && headerText.length )
        {
            if ( startsWith(headerText, '/**') )
                data.header = headerText.substr(0, headerText.indexOf("**/")+3);
            else if ( startsWith(headerText, '/*!') )
                data.header = headerText.substr(0, headerText.indexOf("!*/")+3);
        }
        evt.next( );
    }
    ,action_replace: function( evt ) {
        var params = evt.data.data, 
            //options = params.options, 
            data = params.data, 
            current = params.current;
        if ( current.action_cfg ) 
        {
            var replace = Beeld.OrderedMap(current.action_cfg), rep,
                hasHeader = !!(data.header && data.header.length)
            ;
            // ordered map
            while ( replace.hasNext( ) )
            {
                rep = replace.getNext();
                data.src = data.src.split(rep[0]).join(rep[1]);
                if ( hasHeader ) data.header = data.header.split(rep[0]).join(rep[1]);
            }
        }
        evt.next( );
    }
    ,action_shellprocess: function( evt ) { 
        var params = evt.data.data, 
            options = params.options, 
            data = params.data, 
            current = params.current,
            process_list = current.action_cfg
            ;
        
        var cmd, i, l, step, process_loop;
        
        if ( process_list && process_list.length )
        {
            process_list = [].concat(process_list);
            i = 0; l = process_list.length; 
            step = 1;
            
            process_loop = function process_loop( err, file_data ) {
                if ( err )
                {
                    data.err = 'Error executing "'+cmd+'"';
                    evt.abort( );
                    return;
                }
                if ( 1 === step )
                {
                    step = 2; i = 0;
                    cmd = 'write input file for process_loop';
                    write_async(data.tmp_in, data.src, options.encoding, process_loop);
                    return;
                }
                if ( 2 === step )
                {
                    if ( i < l )
                    {
                        cmd = multi_replace(process_list[i], [
                         ['${DIR}',          options.basePath]
                        ,['${CWD}',          options.cwd]
                        ,['${COMPILERS}',    BEELD_COMPILERS]
                        ,['${TPLS}',         BEELD_TEMPLATES]
                        ,['${IN}',           data.tmp_in]
                        ,['${OUT}',          data.tmp_out]
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
                    read_async(data.tmp_out, options.encoding, process_loop);
                    return;
                }
                data.src = file_data;
                evt.next( );
            };
            process_loop( null );
        }
        else
        {
            evt.next( );
        }
    }
    ,action_minify: function( evt ) {
        var params = evt.data.data, 
            options = params.options, 
            data = params.data, 
            current = params.current,
            minify = current.action_cfg;
        if ( minify && !!data.src )
        {
            if ( minify[HAS]('uglifyjs') )
            {
                // make it array
                params.compilers.uglifyjs.option([].concat( minify['uglifyjs'] ).join(" "));
            }
            if ( minify[HAS]('closure') )
            {
                // make it array
                params.compilers.closure.option([].concat( minify['closure'] ).join(" "));
            }
            if ( minify[HAS]('yui') )
            {
                // make it array
                params.compilers.yui.option([].concat( minify['yui'] ).join(" "));
            }
            if ( minify[HAS]('cssmin') )
            {
                // make it array
                params.compilers.cssmin.option([].concat( minify['cssmin'] ).join(" "));
            }
            
            var cmd, extra = '', selected = options.compiler,
                selectedCompiler = params.compilers[selected];
            // use the selected compiler
            if ('cssmin'===selected && 0 > selectedCompiler.options.indexOf("--basepath "))
            {
                extra = "--basepath "+options.basePath;
            }
            else if ('yui'===selected || 'closure'===selected)
            {
                extra = "--charset "+options.encoding;
            }
                
            cmd = selectedCompiler.compiler([
             ['${COMPILERS}',    BEELD_COMPILERS]
            ,['${EXTRA}',        extra]
            ,['${OPTIONS}',      selectedCompiler.options]
            ,['${IN}',           data.tmp_in]
            ,['${OUT}',          data.tmp_out]
            ]);
            write_async( data.tmp_in, data.src, options.encoding, function( err ){
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
                                    read_async( data.tmp_out, options.encoding, function(err, file_data){
                                        if ( !err )
                                        {
                                            data.src = file_data;
                                            evt.next( );
                                        }
                                        else
                                        {
                                            data.err = 'Error reading minified file';
                                            evt.abort( );
                                        }
                                    });
                                }, 100);
                            }
                            else
                            {
                                data.err = 'Error executing "'+cmd+'"';
                                evt.abort( );
                            }
                        });
                    }, 100);
                }
                else
                {
                    data.err = 'Error writing input file for minification';
                    evt.abort( );
                }
            });
        }
        else
        {
            evt.next( );
        }
    }
    ,action_bundle: function( evt ) {
        var params = evt.data.data, 
            options = params.options, 
            data = params.data, 
            current = params.current,
            bundleFiles, count;
        
        data.bundle = '';
        
        if ( current.action_cfg )
        {
            // make it array
            bundleFiles = [].concat( current.action_cfg||[] );
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
                buffer.push( read( get_real_path( filename, options.basePath ), options.encoding ) );
            }
            data.bundle = buffer.join("\n") + "\n";
        }
        evt.next( );
    }
    ,action_out: function( evt ) {
        var params = evt.data.data, 
            options = params.options, 
            data = params.data, 
            //current = params.current,
            text;
        // write the processed file
        text = data.bundle + data.header + data.src;
        data.bundle=''; data.header=''; data.src='';
        if ( options.outputToStdOut ) 
        {
            echo( text );
            evt.next( );
        }
        else 
        {
            write_async( options.out, text, options.encoding, function(){
                evt.next( );
            });
        }
    }
    /*,action_finally: function( evt ) {
        evt.next( );
    }*/
    };
    
    
    // extends/implements PublishSubscribe
    Beeld[PROTO] = Object.create( PublishSubscribe[PROTO] );
    
    Beeld[PROTO].constructor = Beeld;
        
    Beeld[PROTO].actions = null;
        
    Beeld[PROTO].dispose = function( ) {
        var self = this;
        self.disposePubSub( );
        self.actions = null;
        return self;
    };
    
    Beeld[PROTO].addAction = function( action, handler ) {
        if ( action && 'function'===typeof handler )
        {
            this.actions['action_'+action] = handler;
        }
        return this;
    };
    
    Beeld[PROTO].loadPlugins = function( plugins, basePath ) {
        if ( plugins && plugins.length )
        {
            var plg, plugin, filename, loader,
                plgid = '!plg:', plgidlen = plgid.length;
            plugins = Beeld.OrderedMap(plugins);
            while ( plugins.hasNext() )
            {
                plg = plugins.getNext();
                filename = plg[1] + '.js';
                // plugins folder file
                if ( startsWith(filename, plgid) )
                    filename = BEELD_PLUGINS + filename.substr(plgidlen);
                else
                    filename = get_real_path(filename, basePath);
                plugin = require( filename );
                loader = plugin[ plg[0] ];
                loader( this, Beeld );
            }
        }
        return this;
    };
    
    // parse input arguments, options and configuration settings
    Beeld[PROTO].parse = function( ) {
        var params, config, options,  
            configurationFile, configFile, encoding,
            ext, parser;
        
        params = Beeld.Obj();
        options = parseOptions({
            'help' : false,
            'config' : false,
            'tasks' : false,
            'compiler' : 'uglifyjs',
            'enc' : 'utf8'
        }, ['config'], showHelpMsg);
        
        params.compilers = {
        'cssmin': Beeld.Compiler(
            'CSS Minifier',
            'node ${COMPILERS}cssmin.js ${EXTRA} ${OPTIONS} --input ${IN}  --output ${OUT}'
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
        };
        // fix compiler selection
        options.compiler = options.compiler.toLowerCase();
        if ( !params.compilers[HAS](options.compiler) ) options.compiler = 'uglifyjs';
        configFile = realpath(options.config);
        encoding = options.enc.toLowerCase();
        // parse config settings
        ext = file_ext(configFile).toLowerCase();
        if ( !ext.length || !Beeld.Parsers[HAS](ext) ) ext = "*";
        parser = Beeld.Parsers[ext];
        configurationFile = read(configFile, encoding);
        config = parser.parse( configurationFile );
        config = config||{};
        //echo(JSON.stringify(config, null, 4));
        //exit(0);
        params.options = Beeld.Obj({
        'configFile': configFile,
        'inputType': parser.name + ' (' + ext + ')',
        'basePath': dirname(configFile),
        'cwd': process.cwd( ),
        'encoding': encoding,
        'compiler': options.compiler,
        'tasks': options.tasks ? options.tasks.split(',') : false
        });
        params.data = Beeld.Obj();
        params.current = Beeld.Obj();
        params.config = config;
        if ( config[HAS]('plugins') )
        {
            this.loadPlugins(config.plugins, params.options.basePath);
        }
        return params;
    };

    Beeld[PROTO].build = function( params ) {
        var self = this, 
            tasks = [], 
            selected_tasks = null, 
            task, task_name;
        
        params.data.tmp_in = null; 
        params.data.tmp_out = null;
        
        if ( params.config[HAS]('tasks') )
        {
            params.config.tasks = Beeld.OrderedMap(params.config.tasks);
            while (params.config.tasks.hasNext())
            {
                task = params.config.tasks.getNext(true); task_name = keys(task)[0];
                tasks.push( task );
                if ( params.options.tasks && -1 < params.options.tasks.indexOf(task_name) )
                {
                    selected_tasks = selected_tasks || [];
                    selected_tasks.push( task );
                }
            }
        }
        if ( !selected_tasks )
        {
            if ( false === params.options.tasks )
            {
                if ( tasks.length )
                    selected_tasks = tasks;
                /*else if ( params.config )
                    selected_tasks = [['default', params.config]];*/
            }
        }
        if ( !selected_tasks )
        {
            params.data.err = 'Task is not defined';
            Beeld.Actions.abort( null, params );
        }
        
        params.pipeline = self;
        params.current.tasks = Beeld.OrderedMap(selected_tasks);
        params.current.actions = self.actions;
        params.current.task = '';
        params.current.task_actions = null;
        params.current.action = '';
        params.current.action_cfg = null;
        params.data.src = '';
        params.data.header = '';
        params.data.bundle = '';
        params.data.err = false;
        params.data.tmp_in = tmpfile( ); 
        params.data.tmp_out = tmpfile( );
        
        self.on('#actions', Beeld.Actions.next_task).pipeline('#actions', params, Beeld.Actions.abort);
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