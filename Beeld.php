#!/usr/bin/env php
<?php
/**
*
*   Beeld
*   https://github.com/foo123/Beeld
*
*   A scriptable and configurable source code builder framework in Node/PHP/Python
*   @version: 0.6
*
**/
if (!class_exists('Beeld'))
{

$BEELD_FILE_INFO = pathinfo(__FILE__);
define('BEELD_FILE', (isset($BEELD_FILE_INFO['extension']) ? $BEELD_FILE_INFO['filename'].'.'.$BEELD_FILE_INFO['extension'] : $BEELD_FILE_INFO['filename']));
define('BEELD_ROOT', dirname(__FILE__) . DIRECTORY_SEPARATOR);
define('BEELD_INCLUDES', BEELD_ROOT . 'includes' . DIRECTORY_SEPARATOR);
define('BEELD_COMPILERS', BEELD_ROOT . 'compilers' . DIRECTORY_SEPARATOR);
define('BEELD_PARSERS', BEELD_ROOT . 'parsers' . DIRECTORY_SEPARATOR);
define('BEELD_TEMPLATES', BEELD_ROOT . 'templates' . DIRECTORY_SEPARATOR);

require(BEELD_INCLUDES . 'PublishSubscribe.php');

final class BeeldOrderedMap
{
    
    public $om=null;
    public $index=0;
    
    public function __construct($om)
    {
        $this->om = $om;
        $this->index = 0;
    }
    
    public function hasNext()
    {
        return ($this->index < count($this->om));
    }
    
    public function getNext()
    {
        if ($this->index < count($this->om))
        {
            $obj = $this->om[$this->index++];
            $key = reset(array_keys($obj));
            return array('key'=> $key, 'val'=> $obj[$key]);
        }
        return null;
    }
    
    public function getItem($index)
    {
        if ($index >= 0 && $index < count($this->om))
        {
            $obj = $this->om[$index];
            $key = reset(array_keys($obj));
            return array('key'=> $key, 'val'=> $obj[$key]);
        }
        return null;
    }
    
    public function rewind()
    {
        $this->index = 0;
        return $this;
    }
}
    
final class BeeldUtils
{
    public static $TPLS = null;
    
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
            self::$TPLS[$tpl_id] = self::read( BEELD_TEMPLATES . $id );
        return self::$TPLS[$tpl_id];
    }
    
    public static function multi_replace($tpl, $reps)
    {
        $out = $tpl;
        foreach ($reps as $r)
        {
            $out = str_replace($r[0], $r[1], $out);
        }
        return $out;
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
            
            self::echo_("usage: ".BEELD_FILE." [-h] [--config FILE] [--tasks TASKS] [--compiler COMPILER] [--enc ENCODING]");
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
    
    public static function process_loop($evt, &$p)
    {
        if ($p->process_list_index < $p->process_list_count)
        {
            $cmd = BeeldUtils::multi_replace($p->process_list[$p->process_list_index], array(
             array('${DIR}',        $p->basePath)
            ,array('${CWD}',        $p->cwd)
            ,array('${COMPILERS}',  BEELD_COMPILERS)
            ,array('${TPLS}',       BEELD_TEMPLATES)
            ,array('${IN}',         $p->in_tuple)
            ,array('${OUT}',        $p->out_tuple)
            ));
            // breaks correct shell scripts
            //$cmd = escapeshellcmd( $cmd );
            $p->process_list_index += 1;
            
            exec($cmd, $out=array(), $err=0);
            
            // some error occured
            if ( $err ) 
            {
                $p->err = 'Error executing "'.$cmd.'"';
                self::echo_stderr(implode(PHP_EOL, (array)$out));
                $evt->abort( );
                return;
            }
            else self::process_loop($evt, $p);
        }
        else
        {
            $p->srcText = self::read($p->out_tuple);
            $evt->next( );
        }
    }
    
    public static function run_process_loop($evt, &$p, $process_list)
    {
        $p->process_list =& $process_list;
        $p->process_list_count = count($p->process_list);
        $p->process_list_index = 0;
        BeeldUtils::write( $p->in_tuple, $p->srcText );
        self::process_loop($evt, $p);
    }
    
    public static function log_settings( $evt ) 
    {
        $params =& $evt->data->data; 
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
        $evt->next( );
    }
    
    public static function finish_process( $evt )
    { 
        $params =& $evt->data->data;
        self::cleanup(array($params->in_tuple, $params->out_tuple));
        $evt->dispose( );
        $params = null;
    }
    
    public static function abort_process( $evt=null )
    {
        if ( $evt )
        {
            $params =& $evt->data->data;
            self::cleanup(array($params->in_tuple, $params->out_tuple));
            if ( $params->err ) self::echo_stderr( $params->err );
            $evt->dispose( );
            $params = null;
        }
        exit( 1 );
    }
    
    public static function switch_task( $evt ) 
    {
        $p =& $evt->data->data;
        
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
            $p->pipeline->on('#actions', array('BeeldUtils', 'log_settings'));
            foreach ($p->default_actions as $action)
            {
                $action = 'action_' . $action;
                if ( isset($p->actions[$action]) ) $p->pipeline->on('#actions',  $p->actions[ $action ]);
            }
            if ( $p->task_index < $p->num_tasks ) $p->pipeline->on('#actions',  array('BeeldUtils', 'switch_task'));
            else $p->pipeline->on('#actions',  array('BeeldUtils', 'finish_process'));
            $evt->next( );
        }
        else
        {
            self::finish_process( $evt );
        }
    }
        
    public static function echo_($s="") { echo $s . PHP_EOL; }
    public static function echo_stderr($msg)
    {
        file_put_contents('php://stderr', $msg);
    }
    
    public static function init()
    {
        self::$TPLS = array();
    }
}
BeeldUtils::init();

//
// Beeld default parsers
final class BeeldParsers
{
    public $Path = './';
    public $JSON = null;
    public $YAML = null;
    public $CUSTOM = null;
    
    public function __construct( )
    {
        $this->Path = BEELD_PARSERS;
        
        $this->JSON = PublishSubscribe::Data(array(
        'name'=> 'JSON Parser',
        'format'=> 'JSON Format',
        'ext'=> ".json",
        'path'=> $this->Path . 'json.php',
        'parser'=> null
        ));
        
        $this->YAML = PublishSubscribe::Data(array(
        'name'=> 'Yaml Symfony Parser',
        'format'=> 'Yaml Format',
        'ext'=> ".yml/.yaml",
        'path'=> $this->Path . 'yaml.php',
        'parser'=> null
        ));
        
        $this->CUSTOM = PublishSubscribe::Data(array(
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

//
// Beeld default actions
final class BeeldActions
{
    public static function action_initially($evt)
    { 
        $evt->next();
    }
    
    public static function action_src($evt)
    {
        $params =& $evt->data->data;
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
        $evt->next();
    }
    
    public static function action_header($evt)
    {
        $params =& $evt->data->data;
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
        $evt->next();
    }
    
    public static function action_replace($evt)
    {
        $params =& $evt->data->data;
        $config = $params->config;
        if ( isset($config['replace']) )
        {
            // ordered map
            $replace = Beeld::OrderedMap($config['replace']);
            $hasHeader = ($params->headerText && strlen($params->headerText)) ? true : false;
            
            while ($replace->hasNext())
            {
                $rep = $replace->getNext();
                $params->srcText = str_replace($rep['key'], $rep['val'], $params->srcText);
                if ( $hasHeader )
                    $params->headerText = str_replace($rep['key'], $rep['val'], $params->headerText);
            }
        }
        $evt->next();
    }
    
    public static function action_preprocess($evt)
    { 
        $params =& $evt->data->data; 
        $config = $params->config;
        if ( isset($config["preprocess"]) )
        {
            BeeldUtils::run_process_loop($evt, $params, (array)$config['preprocess']);
        }
        else
        {
            $evt->next( );
        }
    }
    
    public static function action_doc($evt)
    {
        $params =& $evt->data->data;
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
        $evt->next();
    }
    
    public static function action_minify($evt)
    {
        $params =& $evt->data->data;
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
            
            $cmd = BeeldUtils::multi_replace($compiler['compiler'], array(
             array('${COMPILERS}',       BEELD_COMPILERS)
            ,array('${EXTRA}',           $extra)
            ,array('${OPTIONS}',         $compiler['options'])
            ,array('${IN}',              $params->in_tuple)
            ,array('${OUT}',             $params->out_tuple)
            ));
            
            //$cmd = escapeshellcmd( $cmd );
            exec($cmd . ' 2>&1', $out=array(), $err=0);
            
            // some error occured
            if ( $err ) 
            {
                $params->err = 'Error executing "'.$cmd.'"';
                BeeldUtils::echo_stderr(implode(PHP_EOL, (array)$out));
                $evt->abort( );
                return;
            }
            else
            {
                $params->srcText = BeeldUtils::read($params->out_tuple);
            }
        }
        $evt->next( );
    }
    
    public static function action_postprocess($evt)
    { 
        $params =& $evt->data->data; 
        $config = $params->config;
        if ( isset($config["postprocess"]) )
        {
            BeeldUtils::run_process_loop($evt, $params, (array)$config['postprocess']);
        }
        else
        {
            $evt->next( );
        }
    }

    public static function action_bundle($evt)
    {
        $params =& $evt->data->data;
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
        $evt->next();
    }
    
    public static function action_out($evt)
    { 
        $params =& $evt->data->data;
        // write the processed file
        $text = $params->bundleText . $params->headerText . $params->srcText;
        $params->bundleText=null; $params->headerText=null; $params->srcText=null;
        if ( $params->outputToStdOut ) echo ($text);
        else BeeldUtils::write($params->outFile, $text);
        $evt->next();
    }
    
    public static function action_finally($evt)
    { 
        $evt->next();
    }
}

// extends/implements PublishSubscribe
class Beeld extends PublishSubscribe
{
    const VERSION = "0.6";
    public static $Parsers = null;
    
    public $compilers = null;
    public $tasks = null;
    public $actions = null;
    
    public static function OrderedMap($om)
    {
        return new BeeldOrderedMap($om);
    }
    
    public static function init( )
    {
        self::$Parsers = new BeeldParsers();
    }
    
    public function __construct()
    {
        $this->initPubSub( ); 
        
        $this->actions = array(
         'action_initially'=> array('BeeldActions', 'action_initially')
        ,'action_src'=> array('BeeldActions', 'action_src')
        ,'action_header'=> array('BeeldActions', 'action_header')
        ,'action_replace'=> array('BeeldActions', 'action_replace')
        ,'action_preprocess'=> array('BeeldActions', 'action_preprocess')
        ,'action_doc'=> array('BeeldActions', 'action_doc')
        ,'action_minify'=> array('BeeldActions', 'action_minify')
        ,'action_postprocess'=> array('BeeldActions', 'action_postprocess')
        ,'action_bundle'=> array('BeeldActions', 'action_bundle')
        ,'action_out'=> array('BeeldActions', 'action_out')
        ,'action_finally'=> array('BeeldActions', 'action_finally')
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
        $this->disposePubSub();
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
        $params = PublishSubscribe::Data();
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
        
        if ( isset($config['tasks']) )
        {
            $config['tasks'] = Beeld::OrderedMap($config['tasks']);
            while ($config['tasks']->hasNext())
            {
                $task = $config['tasks']->getNext();
                $this->addTask($task['key'], $task['val']);
                if ( $params->selectedTasks && in_array($task['key'], $params->selectedTasks) )
                {
                    if ( !$tasks ) $tasks = array();
                    $tasks[] = array($task['key'], $task['val']);
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
            BeeldUtils::abort_process( );
        }
        
        $params->in_tuple = BeeldUtils::tmpfile( );
        $params->out_tuple = BeeldUtils::tmpfile( );
        $params->currentTask = '';
        $params->tasks =& $tasks;
        $params->task_index = 0;
        $params->num_tasks = count($tasks);
        $params->actions =& $actions;
        $params->default_actions =& $default_actions;
        $params->pipeline =& $this;
        
        $this
            ->on('#actions', array('BeeldUtils', 'switch_task'))
            ->pipeline('#actions', &$params, array('BeeldUtils', 'abort_process'))
        ;
        return $this;
    }
    
    public static function Main()
    {
        // do the process
        $builder = new Beeld();
        $builder->build( $builder->parse() );
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
