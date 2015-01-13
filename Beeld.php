#!/usr/bin/env php
<?php
/**
*
*   Beeld
*   https://github.com/foo123/Beeld
*
*   A scriptable and configurable source code builder framework in Node/PHP/Python
*   @version: 0.5
*
**/
if (!class_exists('Beeld'))
{
class BeeldDynamicObject 
{ 
    public function __construct($params=null)
    {
        if ( $params )
        {
            foreach ($params as $k=>$v)
            {
                $this->{$k} = $v;
            }
        }
    }
}

final class BeeldUtils
{
    public static $compilersPath = './';
    public static $parsersPath = './';
    public static $templatesPath = './';
    public static $TPLS = array();
    
    // simulate python's "startswith" string method
    public static function startsWith($str, $pre, $pos=0) 
    { 
        return (bool)($pre === substr($str, $pos, strlen($pre))); 
    }
    
    // http://stackoverflow.com/questions/5144583/getting-filename-or-deleting-file-using-file-handle
    public static function tmpfile() 
    { 
        $tmp = tmpfile(); 
        $meta_data = stream_get_meta_data($tmp); 
        $tmpname = realpath($meta_data["uri"]); 
        return $tmpname; 
    }
    
    public static function read($file, $enc=null)
    {
        $buf = "";
        if ( is_file($file) )
        {
            try { $buf = file_get_contents($file); }
            catch ( Exception $e )  { $buf = ""; }
        }
        return $buf;
    }
    
    public static function write($file, $text, $enc=null)
    {
        try { file_put_contents($file, $text); }
        catch ( Exception $e ) { }
    }
    
    // https://github.com/JosephMoniz/php-path
    public static function joinPath() 
    {
        $args = func_get_args();
        $argslen = count($args);
        $DS = DIRECTORY_SEPARATOR;
        
        if (!$argslen)  return ".";
        
        $path = implode($DS, $args);
        $plen = strlen($path);
        
        if (!$plen) return ".";
        
        $isAbsolute    = $path[0];
        $trailingSlash = $path[$plen - 1];

        $peices = array_values( array_filter( preg_split('#/|\\\#', $path), 'strlen' ) );
        
        $new_path = array();
        $up = 0;
        $i = count($peices)-1;
        while ($i>=0)
        {
            $last = $peices[$i];
            if ($last == "..") 
            {
                $up++;
            } 
            elseif ($last != ".")
            {
                if ($up)  $up--;
                else  array_push($new_path, $peices[$i]);
            }
            $i--;
        }
        
        $path = implode($DS, array_reverse($new_path));
        
        if (!$path && !$isAbsolute) 
        {
            $path = ".";
        }

        if ($path && $trailingSlash == $DS /*"/"*/) 
        {
            $path .= $DS /*"/"*/;
        }

        return ($isAbsolute == $DS /*"/"*/ ? $DS /*"/"*/ : "") . $path;
    }
    
    public static function fileExt($file)
    {
        $extension  = pathinfo($file);
        return isset($extension['extension']) ? $extension['extension'] : '';
    }
    
    public static function cleanup($files)
    {
        foreach ((array)$files as $file)
        {
            if ( $file )
            {
                @fclose($file);
                try{
                    @unlink($file);
                }
                catch ( Exception $e) {}
            }
        }
    }
    
    public static function getRealPath( $file, $basePath='' )
    {
        if ( is_string($basePath) && strlen($basePath) && 
            (self::startsWith($file, './') || 
                self::startsWith($file, '../') || 
                self::startsWith($file, '.\\') || 
                self::startsWith($file, '..\\'))
        ) 
            return self::joinPath($basePath, $file); 
        else return $file;
    }
    
    public static function getTpl( $id, $enc=null ) 
    {
        $tpl_id = 'tpl_' . $id;
        if ( !isset(self::$TPLS[$tpl_id]) )
            self::$TPLS[$tpl_id] = self::read( self::$templatesPath . $id );
        return self::$TPLS[$tpl_id];
    }
    
    /**
     * parseArgs Command Line Interface (CLI) utility function.
     * @author              Patrick Fisher <patrick@pwfisher.com>
     * @see                 https://github.com/pwfisher/CommandLine.php
     */
    public static function parseArgs($argv = null) 
    {
        $argv = $argv ? $argv : $_SERVER['argv']; array_shift($argv); $o = array();
        for ($i = 0, $j = count($argv); $i < $j; $i++) 
        { 
            $a = $argv[$i];
            if (substr($a, 0, 2) == '--') 
            { 
                $eq = strpos($a, '=');
                if ($eq !== false) {  $o[substr($a, 2, $eq - 2)] = substr($a, $eq + 1); }
                else 
                { 
                    $k = substr($a, 2);
                    if ($i + 1 < $j && $argv[$i + 1][0] !== '-') { $o[$k] = $argv[$i + 1]; $i++; }
                    else if (!isset($o[$k])) { $o[$k] = true; } 
                } 
            }
            else if (substr($a, 0, 1) == '-') 
            {
                if (substr($a, 2, 1) == '=') { $o[substr($a, 1, 1)] = substr($a, 3); }
                else 
                {
                    foreach (str_split(substr($a, 1)) as $k) { if (!isset($o[$k])) { $o[$k] = true; } }
                    if ($i + 1 < $j && $argv[$i + 1][0] !== '-') { $o[$k] = $argv[$i + 1]; $i++; } 
                } 
            }
            else { $o[] = $a; } }
        return $o;
    }
    
    public static function parseOptions( $defaults )
    {
        $options = self::parseArgs( $_SERVER['argv'] );
        $options = array_intersect_key($options, $defaults);
        $options = array_merge($defaults, $options);
        
        if (
            ($options['h'] || $options['help']) ||
            (!isset($options['config']) || !$options['config'] || !is_string($options['config']) || 0==strlen($options['config']))
        )
        {
            // If no dependencies have been passed or help is set, show the help message and exit
            $p = pathinfo(__FILE__);
            $FILE=(isset($p['extension'])) ? $p['filename'].'.'.$p['extension'] : $p['filename'];
            
            self::echo_("usage: $FILE [-h] [--config FILE] [--tasks TASKS] [--compiler COMPILER] [--enc ENCODING]");
            self::echo_(" ");
            self::echo_("Build Source Code Packages (js/css)");
            self::echo_(" ");
            self::echo_("optional arguments:");
            self::echo_("  -h, --help              show this help message and exit");
            self::echo_("  --config   FILE         configuration file (REQUIRED)");
            self::echo_("  --tasks    TASKS        specific tasks to run with commas (OPTIONAL)");
            self::echo_("                          DEFAULT: all tasks defined in config file");
            self::echo_("  --compiler COMPILER     source compiler to use (OPTIONAL)");
            self::echo_("                          Whether to use uglifyjs, closure,");
            self::echo_("                          yui, or cssmin compiler");
            self::echo_("                          DEFAULT: uglifyjs");
            self::echo_("  --enc      ENCODING     set text encoding");
            self::echo_("                          DEFAULT: utf8");
            self::echo_(" ");
            
            exit(1);
        }
        return $options;
    }
    
    public static function process_loop(&$dto, &$p)
    {
        if ($p->process_list_index < $p->process_list_count)
        {
            $cmd = str_replace(
                    array('${DIR}', '${CWD}', '${COMPILERS}', '${TPLS}', '${IN}', '${OUT}'), 
                    array($p->basePath, $p->cwd, self::$compilersPath, self::$templatesPath, $p->in_tuple, $p->out_tuple), 
                    $p->process_list[$p->process_list_index]
                );
            // breaks correct shell scripts
            //$cmd = escapeshellcmd( $cmd );
            $p->process_list_index += 1;
            
            exec($cmd, $out=array(), $err=0);
            
            // some error occured
            if ( $err ) 
            {
                $p->err = 'Error executing "'.$cmd.'"';
                self::echo_stderr(implode(PHP_EOL, (array)$out));
                return $dto->abort( );
            }
            else return self::process_loop($dto, $p);
        }
        else
        {
            $p->srcText = self::read($p->out_tuple);
            return $dto->next( );
        }
    }
    
    public static function run_process_loop(&$dto, &$p, $process_list)
    {
        $p->process_list =& $process_list;
        $p->process_list_count = count($p->process_list);
        $p->process_list_index = 0;
        BeeldUtils::write( $p->in_tuple, $p->srcText );
        return self::process_loop($dto, $p);
    }
    
    public static function log_settings( &$dto ) 
    {
        $params = $dto->params(); 
        $sepLine = str_repeat("=", 65);
        // output the build settings
        if ( !$params->outputToStdOut )
        {
            self::echo_($sepLine);
            self::echo_(" Build Package ");
            self::echo_($sepLine);
            self::echo_(" ");
            self::echo_("Input    : " . $params->inputType);
            self::echo_("Encoding : " . $params->encoding);
            self::echo_("Task     : " . $params->currentTask);
            if ( $params->doMinify )
            {
                self::echo_("Minify   : ON");
                self::echo_("Compiler : " . $params->compilers[$params->selectedCompiler]['name']);
            }
            else
            {
                self::echo_("Minify   : OFF");
            }
            self::echo_("Output   : " . $params->outFile);
            self::echo_(" ");
        }
        return $dto->next( );
    }
    
    public static function finish_process( &$dto )
    { 
        $params = $dto->params();
        $params->pipeline->dispose( );
        $params->pipeline = null;
        self::cleanup(array($params->in_tuple, $params->out_tuple));
        $dto->dispose( );
        $params = null;
    }
    
    public static function abort_process( &$params )
    {
        $params->pipeline->dispose( );
        $params->pipeline = null;
        self::cleanup(array($params->in_tuple, $params->out_tuple));
        if ( $params->err ) self::echo_stderr( $params->err );
        $params = null;
        exit( 1 );
    }
    
    public static function switch_task( &$dto ) 
    {
        $p = $dto->params();
        
        if ( $p->task_index < $p->num_tasks )
        {
            $task = $p->tasks[$p->task_index][0];
            $config_new =& $p->tasks[$p->task_index][1];
            $p->task_index += 1;
            $p->config =& $config_new;
            $p->currentTask = $task;
            $p->bundleText = null; 
            $p->headerText = null; 
            $p->srcText = null;
            $p->err = false;
            if ( isset($config_new['out']) )
            {
                $p->outFile = self::getRealPath($config_new['out'], $p->basePath);
                $p->outputToStdOut = false;
            }
            else
            {
                $p->outFile = null;
                $p->outputToStdOut = true;
            }
            if ( isset($config_new['minify']) )
            {
                $p->doMinify = true;
            }
            else
            {
                $p->doMinify = false;
            }
            $p->pipeline->add( array('BeeldUtils', 'log_settings') );
            foreach ($p->default_actions as $action)
            {
                $action = 'action_' . $action;
                if ( isset($p->actions[$action]) ) $p->pipeline->add( $p->actions[ $action ] );
            }
            if ( $p->task_index < $p->num_tasks ) $p->pipeline->add( array('BeeldUtils', 'switch_task') );
            else $p->pipeline->add( array('BeeldUtils', 'finish_process') );
            return $dto->next( );
        }
        else
        {
            return self::finish_process( $dto );
        }
    }
        
    public static function echo_($s="") { echo $s . PHP_EOL; }
    public static function echo_stderr($msg)
    {
        file_put_contents('php://stderr', $msg);
    }
    
    public static function init()
    {
        self::$compilersPath = dirname(__FILE__) . DIRECTORY_SEPARATOR . 'compilers' . DIRECTORY_SEPARATOR;
        self::$parsersPath = dirname(__FILE__) . DIRECTORY_SEPARATOR . 'parsers' . DIRECTORY_SEPARATOR;
        self::$templatesPath = dirname(__FILE__) . DIRECTORY_SEPARATOR . 'templates' . DIRECTORY_SEPARATOR;
    }
}
BeeldUtils::init();

final class BeeldParsers
{
    public $Path = './';
    public $JSON = null;
    public $YAML = null;
    public $CUSTOM = null;
    
    public function __construct( )
    {
        $this->Path = BeeldUtils::$parsersPath;
        
        $this->JSON = new BeeldDynamicObject(array(
        'name'=> 'JSON Parser',
        'format'=> 'JSON Format',
        'ext'=> ".json",
        'path'=> $this->Path . 'json.php',
        'parser'=> null
        ));
        
        $this->YAML = new BeeldDynamicObject(array(
        'name'=> 'Yaml Symfony Parser',
        'format'=> 'Yaml Format',
        'ext'=> ".yml/.yaml",
        'path'=> $this->Path . 'yaml.php',
        'parser'=> null
        ));
        
        $this->CUSTOM = new BeeldDynamicObject(array(
        'name'=> 'Custom Parser',
        'format'=> 'Custom Format',
        'ext'=> ".custom/*",
        'path'=> $this->Path . 'custom.php',
        'parser'=> null
        ));
    }
    
    public function JSON_load()
    {
        include($this->JSON->path);
    }
    
    public function JSON_parse( $text )
    {
        if ( !class_exists('Json_Parser') ) $this->JSON_load();
        return Json_Parser::parse( $text );
    }
    
    public function YAML_load()
    {
        include($this->YAML->path);
    }
    
    public function YAML_parse( $text )
    {
        if ( !class_exists('Yaml_Parser') ) $this->YAML_load();
        return Yaml_Parser::parse( $text );
    }
    
    public function CUSTOM_load()
    {
        include($this->CUSTOM->path);
    }
    
    public function CUSTOM_parse( $text )
    {
        if ( !class_exists('Custom_Parser') ) $this->CUSTOM_load();
        return Custom_Parser::parse( $text );
    }
}

final class BeeldDTO
{
    public $_params = null;
    public $_next = null;
    public $_abort = null;
    
    public function __construct(&$params=null, $next=null, $abort=null)
    {
        $this->_params =& $params;
        $this->_next = $next;
        $this->_abort = $abort;
    }
        
    public function dispose()
    {
        $this->_params = null;
        $this->_next = null;
        $this->_abort = null;
        return $this;
    }
        
    public function &params()
    {
        return $this->_params;
    }
        
    public function &next()
    {
        if ($this->_next && is_callable($this->_next))
        {
            $r = call_user_func($this->_next, $this->_params);
            return $r;
        }
        return $this->_params;
    }
    
    public function &abort()
    {
        if ($this->_abort && is_callable($this->_abort))
            return call_user_func($this->_abort, $this->_params);
        return $this->_params;
    }
}

final class BeeldPipeline
{
    public $_tasks = null;
    public $_abort = null;
    
    public static function DTO(&$params=null, $next=null, $abort=null)
    {
        return new BeeldDTO($params, $next, $abort);
    }
    
    public static function &dummyAbort(&$params)
    {
        return $params;
    }
    
    public function __construct()
    {
        $this->_tasks = array();
        $this->_abort = null;
    }
    
    public function dispose()
    {
        $this->_tasks = null;
        $this->_abort = null;
        return $this;
    }
        
    public function add($task)
    {
        $this->_tasks[] = $task;
        return $this;
    }
        
    public function abort($abortFunc)
    {
        $this->_abort = $abortFunc;
        return $this;
    }
        
    public function &run(&$params)
    {
        $tasks =& $this->_tasks;
        if ( !empty($tasks) )
        {
            $task = array_shift($tasks);
            $next = array(&$this, 'run');
            if ( $this->_abort && is_callable($this->_abort) )
                $abort = $this->_abort;
            else
                $abort = array('BeeldPipeline', 'dummyAbort');
                
            if ( $task && is_callable($task) ) 
            {
                $r = call_user_func($task, self::DTO($params, $next, $abort));
                return $r;
            }
        }
        return $params;
    }
}        
    
class Beeld
{
    const VERSION = "0.5";
    public static $Parsers = null;
    
    public $compilers = null;
    public $tasks = null;
    public $actions = null;
    
    public static function init( )
    {
        self::$Parsers = new BeeldParsers();
    }
    
    public static function Pipeline( )
    {
        return new BeeldPipeline();
    }
    
    public function __construct()
    {
        $this->actions = array(
         'action_initially'=> array('Beeld', 'action_initially')
        ,'action_src'=> array('Beeld', 'action_src')
        ,'action_header'=> array('Beeld', 'action_header')
        ,'action_replace'=> array('Beeld', 'action_replace')
        ,'action_preprocess'=> array('Beeld', 'action_preprocess')
        ,'action_doc'=> array('Beeld', 'action_doc')
        ,'action_minify'=> array('Beeld', 'action_minify')
        ,'action_postprocess'=> array('Beeld', 'action_postprocess')
        ,'action_bundle'=> array('Beeld', 'action_bundle')
        ,'action_out'=> array('Beeld', 'action_out')
        ,'action_finally'=> array('Beeld', 'action_finally')
        );
        $this->tasks = array();
        $this->compilers = array(
        'cssmin' => array(
            'name' => 'CSS Minifier',
            'compiler' => 'php -f ${COMPILERS}cssmin.php -- ${EXTRA} ${OPTIONS} --input=${IN}  --output=${OUT}',
            'options' => ''
        ),
        'uglifyjs' => array(
            'name' => 'Node UglifyJS Compiler',
            'compiler' => 'uglifyjs ${IN} ${OPTIONS} -o ${OUT}',
            'options' => ''
        ),
        'closure' => array(
            'name' => 'Java Closure Compiler',
            'compiler' => 'java -jar ${COMPILERS}closure.jar ${EXTRA} ${OPTIONS} --js ${IN} --js_output_file ${OUT}',
            'options' => ''
        ),
        'yui' => array( 
            'name' => 'Java YUI Compressor Compiler',
            'compiler' => 'java -jar ${COMPILERS}yuicompressor.jar ${EXTRA} ${OPTIONS} --type js -o ${OUT}  ${IN}',
            'options' => ''
        )
        );
    }
    
    public function dispose( ) 
    {
        $this->compilers = null;
        $this->actions = null;
        $this->tasks = null;
    }
    
    public function addAction( $action, $handler ) 
    {
        if ( $action && is_callable($handler) )
        {
            $this->actions['action_'.$action] = $handler;
        }
        return $this;
    }
    
    public function addTask( $task, &$actions ) 
    {
        if ( $task && $actions )
        {
            $this->tasks[] = array($task, $actions);
        }
        return $this;
    }
        
    public function &parse( )
    {
        $params = new BeeldDynamicObject();
        $options = BeeldUtils::parseOptions(array(
            'h' => false,
            'help' => false,
            'config' => false,
            'tasks' => false,
            'compiler' => 'uglifyjs',
            'enc' => 'utf8'
        ));
        
        // fix compiler selection
        $options['compiler'] = strtolower(strval($options['compiler']));
        $params->compilers =& $this->compilers;
        if ( !isset($this->compilers[ $options['compiler'] ]) ) $options['compiler'] = 'uglifyjs';
        
        // if args are correct continue
        // get real-dir of config file
        $full_path = $params->configFile = realpath($options['config']);
        $params->basePath = rtrim(dirname($full_path), "/\\").DIRECTORY_SEPARATOR;
        $params->cwd = getcwd( );
        $params->encoding = strtolower($options['enc']);
        $params->selectedCompiler = $options['compiler'];
        if ( isset($options['tasks']) && $options['tasks'] )
        {
            $params->selectedTasks = explode(',', $options['tasks']);
        }
        else
        {
            $params->selectedTasks = false;
        }
        
        // parse settings
        $ext = strtolower(BeeldUtils::fileExt($full_path));
        if ( !strlen($ext) ) $ext=".custom";
        else $ext="." . $ext;
        
        $configurationFile = BeeldUtils::read($params->configFile);
        // parse dependencies file in JSON format
        if ( ".json" == $ext )
        {
            $params->inputType = self::$Parsers->JSON->format . ' (' . self::$Parsers->JSON->ext . ')';
            $config = self::$Parsers->JSON_parse($configurationFile);
        }
        // parse dependencies file in YAML format
        elseif ( ".yml" == $ext || ".yaml" == $ext )
        {
            $params->inputType = self::$Parsers->YAML->format . ' (' . self::$Parsers->YAML->ext . ')';
            $config = self::$Parsers->YAML_parse($configurationFile);
        }
        // parse dependencies file in custom format
        else
        {
            $params->inputType = self::$Parsers->CUSTOM->format . ' (' . self::$Parsers->CUSTOM->ext . ')';
            $config = self::$Parsers->CUSTOM_parse($configurationFile);
        }
        if ( !$config ) $config = array();
        $params->config = $config;
        //print_r($params->config);
        //exit(0);
        return $params;
    }
    
    public function build( &$params )
    {
        $tasks = null; 
        $actions =& $this->actions;
        $params->config_full = array_merge(array(), $params->config);
        $config = $params->config_full;
        $params->config = array();
        $default_actions = array(
         'src'
        ,'header'
        ,'replace'
        ,'preprocess'
        ,'doc'
        ,'minify'
        ,'postprocess'
        ,'bundle'
        ,'out'
        );
        
        $params->in_tuple = null; 
        $params->out_tuple = null;
        $pipeline = self::Pipeline( );
        $params->pipeline =& $pipeline;
        
        if ( isset($config['tasks']) )
        {
            foreach ((array)$config['tasks'] as $taskDef)
            {
                $task_key = reset(array_keys($taskDef));
                $this->addTask($task_key, $taskDef[$task_key]);
                if ( $params->selectedTasks && in_array($task_key, $params->selectedTasks) )
                {
                    if ( !$tasks ) $tasks = array();
                    $tasks[] = array($task_key, &$taskDef[$task_key]);
                }
            }
        }
        if ( !$tasks )
        {
            if ( false === $params->selectedTasks )
            {
                if ( !empty($this->tasks) )
                    $tasks =& $this->tasks;
                else if ( $config )
                    $tasks = array(array('default', &$config));
            }
        }
        if ( !$tasks )
        {
            $params->err = 'Task is not defined';
            BeeldUtils::abort_process( $params );
        }
        
        $params->in_tuple = BeeldUtils::tmpfile( );
        $params->out_tuple = BeeldUtils::tmpfile( );
        $params->currentTask = '';
        $params->tasks =& $tasks;
        $params->task_index = 0;
        $params->num_tasks = count($tasks);
        $params->actions =& $actions;
        $params->default_actions =& $default_actions;
        
        $pipeline
            ->abort( array('BeeldUtils', 'abort_process') )
            ->add( array('BeeldUtils', 'switch_task') )
            ->run( $params )
        ;
        return $this;
    }
    
    
    public static function action_initially(&$dto)
    { 
        return $dto->next();
    }
    
    public static function action_src(&$dto)
    {
        $params = $dto->params();
        $config = $params->config;
        $params->srcText = '';
        $params->headerText = null;
        
        if ( isset($config['src']) )
        {
            $srcFiles = (array)$config['src'];
            $count = count($srcFiles);
        }
        else
        {
            $srcFiles = null;
            $count = 0;
        }
        
        if (isset($config['header']))
        {
            $headerFile = $config['header'];
        }
        else
        {
            $headerFile = null;
        }
        
    
        if ($srcFiles && $count)
        {
            $tplid = '!tpl:';
            $tplidlen = strlen($tplid);
            $doneheader = false;
            $buffer = array();

            for ($i=0; $i<$count; $i++)
            {
                $filename = $srcFiles[$i];
                
                if ( !strlen($filename) ) continue;
                
                if ( BeeldUtils::startsWith($filename, $tplid) )
                    // template file
                    $buffer[] = BeeldUtils::getTpl( substr($filename, $tplidlen) );
                else
                    // src file
                    $buffer[] = BeeldUtils::read( BeeldUtils::getRealPath( $filename, $params->basePath ) );
                
                if ( !$doneheader )
                {
                    if ( $headerFile && $filename == $headerFile )
                    {
                        $params->headerText = $buffer[count($buffer)-1];
                        $doneheader = true;
                    }
                    elseif ( !$headerFile )
                    {
                        $params->headerText = $buffer[count($buffer)-1];
                        $doneheader = true;
                    }
                }
            }
            // header file is NOT one of the source files
            if ( $headerFile && null === $params->headerText )
                $params->headerText = BeeldUtils::read( BeeldUtils::getRealPath( $headerFile, $params->basePath ) );
            $params->srcText = implode('', $buffer);
        }
        return $dto->next();
    }
    
    public static function action_header(&$dto)
    {
        $params = $dto->params();
        $headerText = $params->headerText;
        $params->headerText = '';
        if ( $headerText )
        {
            if (BeeldUtils::startsWith($headerText, '/**'))
            {
                $position = strpos($headerText, "**/");
                $params->headerText = substr($headerText, 0, $position+3);
            }
            else if (BeeldUtils::startsWith($headerText, '/*!'))
            {
                $position = strpos($headerText, "!*/");
                $params->headerText = substr($headerText, 0, $position+3);
            }
        }
        return $dto->next();
    }
    
    public static function action_replace(&$dto)
    {
        $params = $dto->params();
        $config = $params->config;
        if ( isset($config['replace']) )
        {
            $replace = $config['replace'];
            // ordered map
            $l = count($replace);
            $hasHeader = ($params->headerText && strlen($params->headerText)) ? true : false;
            
            foreach ($replace as $repl)
            {
                $rep = array_keys($repl);  $sub = array_values($repl);
                $params->srcText = str_replace($rep, $sub, $params->srcText);
                if ( $hasHeader )
                    $params->headerText = str_replace($rep, $sub, $params->headerText);
            }
        }
        return $dto->next();
    }
    
    public static function action_preprocess(&$dto)
    { 
        $params = $dto->params( ); 
        $config = $params->config;
        if ( isset($config["preprocess"]) )
        {
            return BeeldUtils::run_process_loop($dto, $params, (array)$config['preprocess']);
        }
        else
        {
            return $dto->next( );
        }
    }
    
    public static function action_doc(&$dto)
    {
        $params = $dto->params();
        $config = $params->config;
        if ( isset($config['doc']) )
        {
            $doc = (array)$config['doc'];
            if ( isset($doc['output']) )
            {
                $docFile = BeeldUtils::getRealPath($doc['output'], $params->basePath);
                $startDoc = $doc['startdoc'];
                $endDoc = $doc['enddoc'];
                $isRegex = 0;
                $_trim = null;
                $_trimlen = 0;
                $docs = array();
                $sep = isset($doc['separator']) ? $doc['separator'] : "\n\n";
                    
                if (isset($doc['trimx']))
                {
                    $isRegex = 1;
                    $_trim = '/^' . str_replace('/', '\\/', $doc['trimx']) . '/';
                }
                elseif (isset($doc['trim']))
                {
                    $isRegex = 0;
                    $_trim = $doc['trim'];
                    $_trimlen = strlen($_trim);
                }
                
                // extract doc blocks
                $blocks = explode( $startDoc, $params->srcText );
                foreach ($blocks as $b=>$block)
                {
                    $tmp = explode( $endDoc, $block );
                    if ( isset($tmp[1]) )
                    {
                        $docs[] = $tmp[0];
                    }
                }
                $blocks = null;
                
                // trim start of each doc block line
                if ($_trim)
                {
                    foreach ($docs as $i=>$d)
                    {
                        $tmp = explode( "\n", $d );
                        foreach ($tmp as $j=>$t)
                        {
                            if (strlen($t))
                            {
                                if ($isRegex)
                                {
                                    $tmp[$j] = preg_replace($_trim, '', $tmp[$j]);
                                }
                                elseif ($_trim == substr($tmp[$j], 0, $_trimlen))
                                {
                                    $tmp[$j] = substr($tmp[$j], $_trimlen);
                                }
                            }
                        }
                        $docs[$i] = implode( "\n", $tmp );
                    }
                }
                BeeldUtils::write($docFile, implode( $sep, $docs ));
            }
        }
        return $dto->next();
    }
    
    public static function action_minify(&$dto)
    {
        $params = $dto->params();
        $config = $params->config;
        if ( isset($config['minify']) && !empty($params->srcText) )
        {
            $minsets = (array)$config['minify'];
            
            if (isset($minsets['uglifyjs']))
                $params->compilers['uglifyjs']['options'] = implode(" ", (array)$minsets['uglifyjs']);
            if (isset($minsets['closure']))
                $params->compilers['closure']['options'] = implode(" ", (array)$minsets['closure']);
            if (isset($minsets['yui']))
                $params->compilers['yui']['options'] = implode(" ", (array)$minsets['yui']);
            if (isset($minsets['cssmin']))
                $params->compilers['cssmin']['options'] = implode(" ", (array)$minsets['cssmin']);
            
            BeeldUtils::write($params->in_tuple, $params->srcText);
            
            $extra = '';
            // use the selected compiler
            $compiler = $params->compilers[$params->selectedCompiler];
            if ('cssmin' === $params->selectedCompiler && false === strpos($compiler['options'], "--basepath"))
            {
                $extra = "--basepath=".$params->basePath;
            }
            elseif ('yui' === $params->selectedCompiler || 'closure' === $params->selectedCompiler)
            {
                $extra = "--charset ".$params->encoding;
            }
            
            $cmd = str_replace(
                    array('${COMPILERS}', '${EXTRA}', '${OPTIONS}', '${IN}', '${OUT}'), 
                    array(BeeldUtils::$compilersPath, $extra, $compiler['options'], $params->in_tuple, $params->out_tuple), 
                    $compiler['compiler']
                );
            
            //$cmd = escapeshellcmd( $cmd );
            exec($cmd . ' 2>&1', $out=array(), $err=0);
            
            // some error occured
            if ( $err ) 
            {
                $params->err = 'Error executing "'.$cmd.'"';
                BeeldUtils::echo_stderr(implode(PHP_EOL, (array)$out));
                return $dto->abort( );
            }
            else
            {
                $params->srcText = BeeldUtils::read($params->out_tuple);
            }
        }
        return $dto->next( );
    }
    
    public static function action_postprocess(&$dto)
    { 
        $params = $dto->params( ); 
        $config = $params->config;
        if ( isset($config["postprocess"]) )
        {
            return BeeldUtils::run_process_loop($dto, $params, (array)$config['postprocess']);
        }
        else
        {
            return $dto->next( );
        }
    }

    public static function action_bundle(&$dto)
    {
        $params = $dto->params();
        $config = $params->config;
        $params->bundleText = '';
        if ( isset($config['bundle']) )
        {
            $bundleFiles = (array)$config['bundle'];
            $count = count($bundleFiles);
        }
        else
        {
            $bundleFiles = null;
            $count = 0;
        }
    
        if ($bundleFiles && $count)
        {
            $buffer = array();

            for ($i=0; $i<$count; $i++)
            {
                $filename = $bundleFiles[$i];
                if ( empty($filename) ) continue;
                $buffer[] = BeeldUtils::read(BeeldUtils::getRealPath($filename, $params->basePath));
            }
            $params->bundleText = implode("\n", $buffer) . "\n";
        }
        return $dto->next();
    }
    
    public static function action_out(&$dto)
    { 
        $params = $dto->params();
        // write the processed file
        $text = $params->bundleText . $params->headerText . $params->srcText;
        $params->bundleText=null; $params->headerText=null; $params->srcText=null;
        if ( $params->outputToStdOut ) echo ($text);
        else BeeldUtils::write($params->outFile, $text);
        return $dto->next();
    }
    
    public static function action_finally(&$dto)
    { 
        return $dto->next();
    }

    public static function Main()
    {
        // do the process
        $buildLib = new Beeld();
        $buildLib->build( $buildLib->parse() );
    }
}
Beeld::init();

// if called directly from command-line
if (
    (php_sapi_name() === 'cli') &&
    (__FILE__ == realpath($_SERVER['SCRIPT_FILENAME']))
)
{
    error_reporting(E_ALL);
    // do the process
    Beeld::Main();
    exit (0);
}
}
