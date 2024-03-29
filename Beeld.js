#!/usr/bin/env node
/**
*
*   Beeld
*   https://github.com/foo123/Beeld
*
*   A scriptable, extendable and configurable source code builder framework in PHP, Python, JavaScript
*   @version: 1.0.3
*
**/
!function (root, name, factory) {
    // node, CommonJS, etc..
    if ('object' == typeof(module) && module.exports) module.exports = factory();
    else if (!(name in root)) root[name] = factory();
}('undefined' !== typeof self ? self : this, 'Beeld', function(undef) {
"use strict";
var PROTO = 'prototype', HAS = Object.prototype.hasOwnProperty,
    // basic modules
    fs = require('fs'), path = require('path'), os = require('os'),
    exec_async = require('child_process').exec,
    realpath = fs.realpathSync, realpath_async = fs.realpath, dirname = path.dirname, join_path = path.join,
    exit = process.exit, echo = console.log, echo_stderr = console.error,

    // auxilliary methods
    startsWith = String[PROTO].startsWith
            ? function(s, pre, pos) {return s.startsWith(pre, pos||0);}
            : function(s, pre, pos) {pos=pos||0; return pre === s.substr(pos, pre.length+pos);},

    keys = Object.keys,
    extend = function(o1, o2) {
        o1 = o1 || {};
        for (var p in o1)
        {
            if (HAS.call(o2,p) && HAS.call(o1,p) && undef !== o2[p])
                o1[p] = o2[p];
        }
        return o1;
    },

    FUUID = 0,
    generateName = function(options) {
      var now = new Date();
      var name = [options.prefix||'',
                  now.getFullYear(), now.getMonth(), now.getDate(),
                  '-',
                  process.pid,
                  '-',
                  (++FUUID).toString(16),
                  '-',
                  (Math.random() * 0x100000000 + 1).toString(36),
                  options.suffix||''].join('');
      return path.join(options.dir || path.resolve(os.tmpdir()), name);
    },

    tmpfile = function() {
        return generateName({suffix: '.tmpnode'});
    },

    read = function(file, enc) {
        var buf = "";
        if (file && fs.existsSync(file))
        {
            try {
                buf = fs.readFileSync(file, {encoding: enc||'utf8'}).toString();
            } catch (e) {
                buf = "";
            }
        }
        return buf;
    },

    read_async = function(file, enc, cb) {
        /*fs.stat(file, function(err, stat){
            if ( !err && stat )
            {*/
                fs.readFile(file, {encoding: enc||'utf8'}, function(err,data){
                    if (cb) cb(err, err ? '' : data.toString());
                });
            /*}
            else if (cb)
            {
                cb('');
            }
        });*/
    },

    write = function(file, text, enc) {
        var res = null;
        try {
            res = fs.writeFileSync(file, text.toString(), {encoding: enc||'utf8'});
        } catch (e) {
            // pass
        }
        return res;
    },

    write_async = function(file, text, enc, cb) {
        fs.writeFile(file, text.toString(), {encoding: enc||'utf8'}, function(err) {if (cb) cb(err);});
    },

    unlink_async = function(file) {
        if (file)
        {
            /*fs.exists(file, function(yes){ if ( yes )*/ fs.unlink(file, function(err) {}); /*});*/
        }
    },

    cleanup = function(files) {
        var i, l = files.length;
        for (i=0; i<l; ++i) unlink_async(files[i]);
    },

    file_ext = function(fileName) {
        return path.extname(fileName).toString();
    },

    // needed variables
    BEELD_FILE, BEELD_ROOT, BEELD_INCLUDES, BEELD_PARSERS, BEELD_TEMPLATES, BEELD_PLUGINS,
    TPLS = {}, PublishSubscribe, Xpresion, Contemplate, /*List, Map,*/ OrderedMap,
    BeeldParser, BeeldCompiler, Beeld
;

BEELD_FILE = path.basename(__filename);
BEELD_ROOT = /*realpath(*/__dirname/*)*/;
BEELD_INCLUDES = join_path(BEELD_ROOT, "includes") + '/';
BEELD_PARSERS = join_path(BEELD_INCLUDES, "parsers") + '/';
BEELD_TEMPLATES = join_path(BEELD_ROOT, "templates") + '/';
BEELD_PLUGINS = join_path(BEELD_ROOT, "plugins") + '/';

PublishSubscribe = require(BEELD_INCLUDES + 'PublishSubscribe.js');
Xpresion = require(BEELD_INCLUDES + 'Xpresion.js');
//Contemplate = require(BEELD_INCLUDES + 'Contemplate.js');

//List = Array;
//Map = Object;
OrderedMap = function(om) {
    this.om = om;
    this.index = 0;
};
OrderedMap[PROTO] = {
    constructor: OrderedMap,
    om: null,
    index: 0,

    hasNext: function() {
        return this.index < this.om.length;
    },
    getNext: function(raw) {
        if (this.index < this.om.length)
        {
            if (true === raw)
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
    hasItem: function(index) {
        return (index >= 0 && index < this.om.length);
    },
    hasItemByKey: function(key) {
        var om = this.om, i, l = om.length;
        for (i=0; i<l; ++i)
        {
            if (om[i] && HAS.call(om[i],key))
                return i;
        }
        return -1;
    },
    getItem: function(index) {
        if (index >= 0 && index < this.om.length)
        {
            var obj = this.om[index], key = keys(obj)[0];
            return [key, obj[key]];
        }
        return null;
    },
    getItemByKey: function(key) {
        var om = this.om, i, l = om.length;
        for (i=0; i<l; ++i)
        {
            if (om[i] && HAS.call(om[i],key))
                return [key, om[i][key]];
        }
        return null;
    },
    rewind: function() {
        this.index = 0;
        return this;
    }
};

function multi_replace(tpl, reps)
{
    var out = tpl, i=0, l=reps.length;
    for (i=0; i<l; ++i)
    {
        out = out.split(reps[i][0]).join(reps[i][1]);
    }
    return out;
}

function regex(rex, evt)
{
    var settings = evt.data.config.settings;
    if (rex instanceof RegExp) return rex;
    else if (settings.RegExp && rex.substr && startsWith(rex, settings.RegExp)) return new RegExp(rex.substr(settings.RegExp.length));
    return false;
}

function xpresion(xpr, evt)
{
    var settings = evt.data.config.settings;
    if (settings.Xpresion)
    {
        if (xpr instanceof Xpresion)
        {
            return xpr;
        }
        else if (xpr.substr && startsWith(xpr, settings.Xpresion))
        {
            try {
                xpr = new Xpresion(xpr.substr(settings.Xpresion.length));
            } catch (e) {
                xpr = null;
            }
            return xpr;
        }
    }
    return xpr;
}

function evaluate(xpr, data)
{
    return xpr instanceof Xpresion ? xpr.evaluate(data) : String(xpr);
}

//
// adapted from node-commander package
// https://github.com/visionmedia/commander.js/
function parse_args(args)
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
        if (arg.length > 1 && '-' === arg[0] && '-' !== arg[1])
        {
            arg.slice(1).split('').forEach(function(c) {
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

function show_help_msg()
{
    echo ("usage: "+BEELD_FILE+" [-h] [--config FILE] [--tasks TASKS] [--enc ENCODING]");
    echo (" ");
    echo ("Build Source Code Packages");
    echo (" ");
    echo ("optional arguments:");
    echo ("  -h, --help              show this help message and exit");
    echo ("  --config   FILE         configuration file (REQUIRED)");
    echo ("  --tasks    TASKS        specific tasks to run separated by commas (OPTIONAL)");
    echo ("                          DEFAULT: all tasks defined in config file");
    echo ("  --enc      ENCODING     set text encoding");
    echo ("                          DEFAULT: utf8");
    echo ("  --compiler COMPILER     compiler to be used (if any)");
    echo ("                          DEFAULT: uglifyjs");
    echo (" ");
}

function parse_options(defaults, required, on_error)
{
    // parse args
    var options, parsedargs, is_valid, i, opt;

    parsedargs = parse_args(process.argv);
    options = parsedargs.options;
    if (defaults)
    {
        for (opt in defaults)
        {
            if (!HAS.call(defaults, opt)) continue;
            if (!HAS.call(options, opt)) options[opt] = defaults[opt];
        }
    }

    is_valid = true;

    // if help is set, or no dependencis file, echo help message and exit
    if (parsedargs.flags['h'] || options['help'])
    {
        is_valid = false;
    }
    else if (required)
    {
        for(i=0; i<required.length; ++i)
        {
            opt = required[i];
            if (!HAS.call(options, opt) || !options[opt] || !options[opt].length)
            {
                is_valid = false;
                break;
            }
        }
    }

    if (!is_valid)
    {
        on_error();
        exit(1);
        return null;
    }
    return options;
}

function get_tpl(id, enc, cb)
{
    var tpl, tpl_id = 'tpl_'+id;
    if ('function' === typeof cb)
    {
        if (!HAS.call(TPLS, tpl_id))
        {
            read_async(BEELD_TEMPLATES + id, enc, function(err,data) {
                if (!err) TPLS[tpl_id] = ''+data;
                cb(err, data);
            });
        }
        else
        {
            cb(null, TPLS[tpl_id].slice());
        }
        return '';
    }
    else
    {
        if (!HAS.call(TPLS,tpl_id)) TPLS[tpl_id] = read(BEELD_TEMPLATES + id, enc);
        tpl = TPLS[tpl_id];
        return tpl.slice();
    }
}


function get_real_path(file, basePath)
{
    basePath = basePath || '';
    if (
        ''!=basePath &&
        (startsWith(file, './') || startsWith(file, '../') || startsWith(file, '.\\') || startsWith(file, '..\\'))
    )
        return join_path(basePath, file);
    else return file;
}

function read_file(filename, basePath)
{
    return read(get_real_path(filename, basePath));
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

    dispose: function() {
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

    load: function() {
        return require(this.path);
    },

    parse: function(text) {
        var self = this;
        if (!self.parser)
            self.parser = self.load();
        return self.parser.parse(text);
    }
};

BeeldCompiler = function(name, cmd, options) {
    var self = this;
    self.name = name;
    self.cmd_tpl = cmd;
    self.options = options || '';
};
BeeldCompiler[PROTO] = {
    constructor: BeeldCompiler,
    name: null,
    cmd_tpl: null,
    options: null,

    dispose: function() {
        var self = this;
        self.name = null;
        self.cmd_tpl = null;
        self.options = null;
        return this;
    },

    compiler: function(args) {
        return multi_replace(this.cmd_tpl, args||[]);
    },

    option: function(opt) {
        opt = String(opt);
        var self = this, p = (self.options.length && opt.length) ? " " : "";
        self.options += p + opt;
        return self;
    }
};

Beeld = function Beeld() {
    var self = this;

    self.initPubSub();

    self.actions = {
     'action_src': Beeld.Actions.action_src
    ,'action_header': Beeld.Actions.action_header
    ,'action_replace': Beeld.Actions.action_replace
    ,'action_process-shell': Beeld.Actions.action_shellprocess
    ,'action_bundle': Beeld.Actions.action_bundle
    ,'action_out': Beeld.Actions.action_out
    };
};
Beeld.VERSION = "1.0.3";
Beeld.FILE      = BEELD_FILE;
Beeld.ROOT      = BEELD_ROOT;
Beeld.INCLUDES  = BEELD_INCLUDES;
Beeld.PARSERS   = BEELD_PARSERS;
Beeld.TEMPLATES = BEELD_TEMPLATES;
Beeld.PLUGINS   = BEELD_PLUGINS;

Beeld.OrderedMap = function(om) {
    return new OrderedMap(om);
};

Beeld.Parser = function(path, class_name, name) {
    return new BeeldParser(path, class_name, name);
};

Beeld.Compiler = function(name, cmd, options) {
    return new BeeldCompiler(name, cmd, options);
};

Beeld.Obj = PublishSubscribe.Data;

Beeld.Xpresion = Xpresion;

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
    extend: extend,
    regex: regex,
    xpresion: xpresion,
    evaluate: evaluate
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
Xpresion.defaultConfiguration().defFunc({
    'file': {'input':'file', 'output':'Fn.file(<$.0>)', 'otype':Xpresion.T_STR},
    'tpl':  {'input':'tpl', 'output':'Fn.tpl(<$.0>)', 'otype':Xpresion.T_STR}
}).defRuntimeFunc({
    'file': read_file,
    'tpl': get_tpl
});

//
// Beeld default actions
Beeld.Actions = {

 abort: function(evt, params) {
    if (evt && !params) params = evt.data;
    var config = params.config,
        options = params.options,
        data = params.data,
        current = params.current;
    cleanup([data.tmp_in, data.tmp_out]);
    if (data.err) echoStdErr(data.err);
    current.dispose();
    data.dispose();
    options.dispose();
    params.current = null;
    params.data = null;
    params.config = null;
    params.options = null;
    if (evt) evt.dispose();
    exit(1);
}
,log: function(evt) {
    var params = evt.data,
        options = params.options,
        data = params.data,
        current = params.current,
        sepLine = new Array(66).join("=");
    // output the build settings
    if (!options.outputToStdOut)
    {
        echo (sepLine);
        echo ("Build Package");
        echo (sepLine);
        echo (" ");
        echo ("Input    : " + options.inputType);
        echo ("Encoding : " + options.encoding);
        echo ("Task     : " + current.task);
        echo ("Output   : " + options.out);
        echo (" ");
    }
    evt.next();
}
,finish: function(evt) {
    var params = evt.data,
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
,next_action: function(evt) {
    var params = evt.data,
        current = params.current,
        task_actions = current.task_actions;
    if (task_actions && task_actions.hasNext())
    {
        var a = task_actions.getNext(),
            action = 'action_' + a[0];
        if (HAS.call(current.actions,action))
        {
            current.action = a[0];
            current.action_cfg = a[1];
            current.actions[action](evt);
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
,next_task: function next_task(evt) {
    var params = evt.data,
        options = params.options,
        data = params.data,
        current = params.current,
        current_tasks = current.tasks,
        pipeline = params.pipeline
        ;
    if (current_tasks && current_tasks.hasNext())
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
        if (out)
        {
            options.out = get_real_path(out[1], options.basePath);
            options.outputToStdOut = false;
        }
        else
        {
            options.out = null;
            options.outputToStdOut = true;
        }

        // default header action
        // is first file of src if exists
        var src_action = current.task_actions.hasItemByKey('src');
        if (!current.task_actions.getItemByKey('header') && (-1 < src_action))
        {
            var src_cfg = current.task_actions.getItemByKey('src');
            current.task_actions.om.splice(src_action+1, 0, {'header':src_cfg[1][0]});
        }


        /*pipeline.on('#actions', Beeld.Actions.log);

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
        }*/

        evt.next();
    }
    else
    {
        //Beeld.Actions.finish(evt);
        evt.next();
    }
}

/* action_initially: function(evt) {
    evt.next();
}*/

,action_src: function(evt) {
    var params = evt.data,
        options = params.options,
        data = params.data,
        current = params.current,
        srcFiles, count, buffer, i, filename,
        tplid = '!tpl:', tplidlen = tplid.length;

    data.src = '';

    if (current.action_cfg)
    {
        // make it array
        srcFiles = [].concat(current.action_cfg||[]);
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
        i = 0;
        var do_next = function do_next() {
            if (i >= count)
            {
                data.src = buffer.join('');
                evt.next();
            }
            else
            {
                filename = srcFiles[i++];
                if (!filename || !filename.length) return do_next();

                if (startsWith(filename, tplid))
                {
                    // template file
                    get_tpl(filename.substr(tplidlen), options.encoding, function(err, text) {
                        if (!err) buffer.push(text);
                        do_next();
                    });
                }
                else
                {
                    // src file
                    read_async(get_real_path(filename, options.basePath), options.encoding, function(err, text) {
                        if (!err) buffer.push(text);
                        do_next();
                    });
                }
            }
        };
        do_next();
    }
    else
    {
        evt.next();
    }
}
,action_header: function(evt) {
    var params = evt.data,
        options = params.options,
        data = params.data,
        current = params.current,
        headerFile = current.action_cfg,
        headerText = null;

    data.header = '';

    if (headerFile && headerFile.length)
    {
        read_async(get_real_path(headerFile, options.basePath), options.encoding, function(err, text) {
            if (!err)
            {
                headerText = text;
                if (headerText && headerText.length)
                {
                    if (startsWith(headerText, '/**'))
                        data.header = headerText.substr(0, headerText.indexOf("**/")+3);
                    else if (startsWith(headerText, '/*!'))
                        data.header = headerText.substr(0, headerText.indexOf("!*/")+3);
                }
            }
            evt.next();
        });
    }
    else
    {
        evt.next( );
    }
}
,action_replace: function(evt) {
    var params = evt.data,
        //options = params.options,
        data = params.data,
        current = params.current;
    if (current.action_cfg)
    {
        var replace = Beeld.OrderedMap(current.action_cfg), rep,
            hasHeader = !!(data.header && data.header.length),
            xpresion_data = {}
        ;
        // ordered map
        while (replace.hasNext())
        {
            rep = replace.getNext();
            rep[1] = Beeld.Utils.xpresion(rep[1], evt); // parse xpresion if any
            rep[1] = Beeld.Utils.evaluate(rep[1], xpresion_data);
            data.src = data.src.split(rep[0]).join(rep[1]);
            if (hasHeader) data.header = data.header.split(rep[0]).join(rep[1]);
        }
    }
    evt.next();
}
,action_shellprocess: function(evt) {
    var params = evt.data,
        options = params.options,
        data = params.data,
        current = params.current,
        process_list = current.action_cfg
        ;

    var cmd, i, l, step, process_loop;

    if (process_list && process_list.length)
    {
        process_list = [].concat(process_list);
        i = 0; l = process_list.length;
        step = 1;

        process_loop = function process_loop(err, file_data) {
            if (err)
            {
                data.err = 'Error executing "'+cmd+'"';
                evt.abort();
                return;
            }
            if (1 === step)
            {
                step = 2; i = 0;
                cmd = 'write input file for process_loop';
                write_async(data.tmp_in, data.src, options.encoding, process_loop);
                return;
            }
            if (2 === step)
            {
                if (i < l)
                {
                    cmd = multi_replace(process_list[i], [
                     ['${DIR}',          options.basePath]
                    ,['${CWD}',          options.cwd]
                    ,['${TPLS}',         BEELD_TEMPLATES]
                    ,['${IN}',           data.tmp_in]
                    ,['${OUT}',          data.tmp_out]
                    ]);
                    i += 1;
                    exec_async(cmd, null, process_loop);
                    return;
                }
                else
                {
                    step = 3;
                }
            }
            if (3 === step)
            {
                step = 4;
                cmd = 'read output file for process_loop';
                read_async(data.tmp_out, options.encoding, process_loop);
                return;
            }
            data.src = file_data;
            evt.next();
        };
        process_loop(null);
    }
    else
    {
        evt.next();
    }
}
,action_bundle: function(evt) {
    var params = evt.data,
        options = params.options,
        data = params.data,
        current = params.current,
        bundleFiles, count;

    data.bundle = '';

    if (current.action_cfg)
    {
        // make it array
        bundleFiles = [].concat(current.action_cfg||[]);
        count = bundleFiles.length;
    }
    else
    {
        bundleFiles = null;
        count = 0;
    }
    if (bundleFiles && count)
    {
        var buffer = [], i = 0, filename;
        var do_next = function do_next() {
            if (i >= count)
            {
                data.bundle = buffer.join("\n") + "\n";
                evt.next();
            }
            else
            {
                filename = bundleFiles[i++];
                if (!filename || !filename.length) return do_next();
                read_async(get_real_path(filename, options.basePath), options.encoding, function(err, text) {
                    if (!err) buffer.push(text);
                    do_next();
                });
            }
        };
        do_next();
    }
    else
    {
        evt.next();
    }
}
,action_out: function(evt) {
    var params = evt.data,
        options = params.options,
        data = params.data,
        //current = params.current,
        text;
    // write the processed file
    text = data.bundle + data.header + data.src;
    data.bundle=''; data.header=''; data.src='';
    if (options.outputToStdOut)
    {
        echo(text);
        evt.next();
    }
    else
    {
        write_async(options.out, text, options.encoding, function() {
            evt.next();
        });
    }
}
/*,action_finally: function(evt) {
    evt.next();
}*/
};


// extends/implements PublishSubscribe
Beeld[PROTO] = Object.create(PublishSubscribe[PROTO]);

Beeld[PROTO].constructor = Beeld;

Beeld[PROTO].actions = null;

Beeld[PROTO].dispose = function() {
    var self = this;
    self.disposePubSub();
    self.actions = null;
    return self;
};

Beeld[PROTO].getClass = function() {
    return Beeld;
};

Beeld[PROTO].addAction = function(action, handler) {
    if (action && 'function' === typeof handler)
    {
        this.actions['action_'+action] = handler;
    }
    return this;
};

Beeld[PROTO].loadPlugins = function(plugins, basePath) {
    var self = this;
    if (plugins && plugins.length)
    {
        var plg, plugin, filename, loader,
            plgid = '!plg:', plgidlen = plgid.length;
        plugins = Beeld.OrderedMap(plugins);
        while (plugins.hasNext())
        {
            plg = plugins.getNext();
            filename = plg[1] + '.js';
            // plugins folder file
            if (startsWith(filename, plgid))
                filename = BEELD_PLUGINS + filename.substr(plgidlen);
            else
                filename = get_real_path(filename, basePath);
            plugin = require(filename);
            loader = plugin['beeld_plugin_' + plg[0]];
            if ('function' === typeof loader) loader(self);
        }
    }
    return self;
};

// parse input arguments, options and configuration settings
Beeld[PROTO].parse = function(doneCb) {
    var params, config, options,
        configurationFile, configFile, encoding,
        ext, parser, self = this;

    params = Beeld.Obj();
    options = parse_options({
        'help' : false,
        'config' : false,
        'tasks' : false,
        'enc' : 'utf8',
        'compiler' : null
    }, ['config'], show_help_msg);

    //echo(JSON.stringify(options, null, 4));
    //exit(0);

    realpath_async(options.config, function(err, rpath) {
        if (err) throw err;

        configFile = rpath;
        encoding = options.enc.toLowerCase();
        // parse config settings
        ext = file_ext(configFile).toLowerCase();
        if (!ext.length || !HAS.call(Beeld.Parsers,ext)) ext = "*";
        parser = Beeld.Parsers[ext];
        read_async(configFile, encoding, function(err, data) {
            if (err) throw err;

            configurationFile = data;
            config = parser.parse(configurationFile);
            config = config||{};
            //echo(JSON.stringify(config, null, 4));
            //exit(0);
            params.options = Beeld.Obj({
            'configFile': configFile,
            'inputType': parser.name + ' (' + ext + ')',
            'basePath': dirname(configFile),
            'cwd': process.cwd(),
            'encoding': encoding,
            'tasks': options.tasks ? options.tasks.split(',') : false
            });
            params.cmd_opts = options;
            params.data = Beeld.Obj();
            params.current = Beeld.Obj();

            if (HAS.call(config, 'settings'))
            {
                if (!HAS.call(config['settings'], 'RegExp')) config['settings']['RegExp'] = false;
                if (!HAS.call(config['settings'], 'Xpresion')) config['settings']['Xpresion'] = false;
            }
            else
            {
                config['settings'] = {'RegExp':false, 'Xpresion':false};
            }
            if (HAS.call(config, 'plugins'))
            {
                self.loadPlugins(config.plugins, params.options.basePath);
            }
            params.config = config;
            if (doneCb) doneCb(params);
        });
    });
};

Beeld[PROTO].build = function(params) {
    var self = this,
        tasks = [],
        selected_tasks = null,
        task, task_name;

    params.data.tmp_in = null;
    params.data.tmp_out = null;

    if (HAS.call(params.config, 'tasks'))
    {
        params.config.tasks = Beeld.OrderedMap(params.config.tasks);
        while (params.config.tasks.hasNext())
        {
            task = params.config.tasks.getNext(true); task_name = keys(task)[0];
            tasks.push(task);
            if (params.options.tasks && -1 < params.options.tasks.indexOf(task_name))
            {
                selected_tasks = selected_tasks || [];
                selected_tasks.push(task);
            }
        }
    }
    if (!selected_tasks)
    {
        if (false === params.options.tasks)
        {
            if (tasks.length)
                selected_tasks = tasks;
            /*else if ( params.config )
                selected_tasks = [['default', params.config]];*/
        }
    }
    if (!selected_tasks)
    {
        params.data.err = 'Task is not defined';
        Beeld.Actions.abort(null, params);
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
    params.data.tmp_in = tmpfile();
    params.data.tmp_out = tmpfile();

    while (params.current.tasks && params.current.tasks.hasNext())
    {
        var task = params.current.tasks.getNext();
        self.on('#actions', Beeld.Actions.next_task);
        var task_actions = Beeld.OrderedMap(task[1]);
        self.on('#actions', Beeld.Actions.log);
        // default header action
        // is first file of src if exists
        var src_action = task_actions.hasItemByKey('src');
        if (!task_actions.getItemByKey('header') && (-1 < src_action))
        {
            self.on('#actions', Beeld.Actions.next_action);
        }
        while (task_actions && task_actions.hasNext())
        {
            var action = task_actions.getNext();
            self.on('#actions', Beeld.Actions.next_action);
        }
        task_actions.rewind();
    }
    params.current.tasks.rewind();
    self.on('#actions', Beeld.Actions.finish).pipeline('#actions', params, Beeld.Actions.abort);
    return self;
};

Beeld.Main = function() {
    var builder = new Beeld();
    // do the process
    builder.parse(function(params) {
       builder.build(params);
    });
};

// if called from command-line
if (require && require.main === module)
{
    // do the process
    Beeld.Main();
}

// export it
return Beeld;
});