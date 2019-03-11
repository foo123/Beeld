#!/usr/bin/env php
<?php
/**
*
*   Beeld
*   https://github.com/foo123/Beeld
*
*   A scriptable, extendable and configurable source code builder framework in Node/PHP/Python
*   @version: 1.0.0
*
**/
if (!class_exists('Beeld'))
{

$BEELD_FILE_INFO = pathinfo(__FILE__);
define('BEELD_FILE', (isset($BEELD_FILE_INFO['extension']) ? $BEELD_FILE_INFO['filename'].'.'.$BEELD_FILE_INFO['extension'] : $BEELD_FILE_INFO['filename']));
define('BEELD_ROOT', dirname(__FILE__) . DIRECTORY_SEPARATOR);
define('BEELD_INCLUDES', BEELD_ROOT . 'includes' . DIRECTORY_SEPARATOR);
define('BEELD_PARSERS', BEELD_INCLUDES . 'parsers' . DIRECTORY_SEPARATOR);
define('BEELD_TEMPLATES', BEELD_ROOT . 'templates' . DIRECTORY_SEPARATOR);
define('BEELD_PLUGINS', BEELD_ROOT . 'plugins' . DIRECTORY_SEPARATOR);

require(BEELD_INCLUDES . 'PublishSubscribe.php');
require(BEELD_INCLUDES . 'Xpresion.php');
//require(BEELD_INCLUDES . 'Contemplate.php');

//
// beeld utils
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
    public static function join_path() 
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
    
    public static function file_ext($file)
    {
        $extension  = pathinfo($file);
        return isset($extension['extension']) ? ('.'.$extension['extension']) : '';
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
    
    public static function get_real_path( $file, $basePath='' )
    {
        if ( is_string($basePath) && strlen($basePath) && 
            (self::startsWith($file, './') || 
                self::startsWith($file, '../') || 
                self::startsWith($file, '.\\') || 
                self::startsWith($file, '..\\'))
        ) 
            return self::join_path($basePath, $file); 
        else return $file;
    }
    
    public static function get_tpl( $id, $enc=null ) 
    {
        $tpl_id = 'tpl_' . $id;
        if ( !isset(self::$TPLS[$tpl_id]) )
            self::$TPLS[$tpl_id] = self::read( BEELD_TEMPLATES . $id );
        return self::$TPLS[$tpl_id];
    }
    
    public static function read_file($filename, $basePath='')
    {
        return file_get_contents( self::get_real_path( $filename, $basePath ) );
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
    
    // http://stackoverflow.com/questions/10778318/test-if-a-string-is-regex
    public static function regex($rex, $evt) 
    {
        $settings = $evt->data->config['settings'];
        if ( $settings['RegExp'] && is_string($rex) && self::startsWith($rex, $settings['RegExp']) ) 
            return '/' . str_replace('/', '\\/', substr($rex, strlen($settings['RegExp']))) . '/';
        return false;
    }
    
    public static function xpresion($xpr, $evt) 
    {
        $settings = $evt->data->config['settings'];
        if ( $settings['Xpresion'] )
        {
            if ( $xpr instanceof Xpresion ) 
            {
                return $xpr;
            }
            else if ( is_string($xpr) && self::startsWith($xpr, $settings['Xpresion']) )
            {
                $xpr = new Xpresion( substr($xpr, strlen($settings['Xpresion'])) );
                return $xpr;
            }
        }
        return $xpr;
    }
    
    public static function evaluate($xpr, $data) {
        return $xpr instanceof Xpresion ? $xpr->evaluate($data) : $xpr;
    }
    
    /**
     * parseArgs Command Line Interface (CLI) utility function.
     * @author              Patrick Fisher <patrick@pwfisher.com>
     * @see                 https://github.com/pwfisher/CommandLine.php
     */
    public static function parse_args($argv = null) 
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
    
    public static function show_help_msg( )
    {
        self::echo_("usage: ".BEELD_FILE." [-h] [--config FILE] [--tasks TASKS] [--enc ENCODING]");
        self::echo_(" ");
        self::echo_("Build Source Code Packages");
        self::echo_(" ");
        self::echo_("optional arguments:");
        self::echo_("  -h, --help              show this help message and exit");
        self::echo_("  --config   FILE         configuration file (REQUIRED)");
        self::echo_("  --tasks    TASKS        specific tasks to run separated by commas (OPTIONAL)");
        self::echo_("                          DEFAULT: all tasks defined in config file");
        self::echo_("  --enc      ENCODING     set text encoding");
        self::echo_("                          DEFAULT: utf8");
        self::echo_("  --compiler COMPILER     compiler to be used (if any)");
        self::echo_("                          DEFAULT: uglifyjs");
        self::echo_(" ");
    }
    
    public static function parse_options( $defaults, $required, $on_error )
    {
        $options = self::parse_args( $_SERVER['argv'] );
        if ( !empty($defaults) )
        {
            foreach((array)$defaults as $opt=>$default)
            {
                if ( !isset($options[$opt]) ) 
                    $options[$opt] = $default;
            }
        }
        
        $is_valid = true;
        
        if ( $options['h'] || $options['help'] ) 
        {
            $is_valid = false;
        }
        elseif ( !empty($required) )
        {
            foreach ($required as $opt)
            {
                if ( !isset($options[$opt]) || empty($options[$opt]) || !$options[$opt] )
                {
                    $is_valid = false;
                    break;
                }
            }
        }
        
        if ( !$is_valid )
        {
            // If no dependencies have been passed or help is set, show the help message and exit
            call_user_func( $on_error );
            exit(1);
            return null;
        }
        return $options;
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
    
    public function getNext($raw=false)
    {
        if ($this->index < count($this->om))
        {
            if ( true === $raw )
            {
                return $this->om[$this->index++];
            }
            else
            {
                $obj = $this->om[$this->index++];
                $keys = array_keys($obj);
                $key = reset($keys);
                return array($key, $obj[$key]);
            }
        }
        return null;
    }
    
    public function hasItem($index)
    {
        return ($index >= 0 && $index < count($this->om));
    }
    
    public function hasItemByKey($key)
    {
        $om =& $this->om; 
        $l = count($om);
        for ($i=0; $i<$l; $i++)
        {
            $entry = $om[$i];
            if ( isset($entry[$key]) )
                return $i;
        }
        return -1;
    }
    
    public function getItem($index)
    {
        if ($index >= 0 && $index < count($this->om))
        {
            $obj = $this->om[$index];
            $key = reset(array_keys($obj));
            return array($key, $obj[$key]);
        }
        return null;
    }
    
    public function getItemByKey($key)
    {
        foreach ($this->om as $entry)
        {
            if ( isset($entry[$key]) )
                return array($key, $entry[$key]);
        }
        return null;
    }
    
    public function rewind()
    {
        $this->index = 0;
        return $this;
    }
}

final class BeeldParser
{
    public function __construct($path, $class_name, $name)
    {
        $this->path = $path;
        $this->class_name = $class_name;
        $this->name = $name;
        $this->parser = null;
    }

    public function __destruct()
    {
        $this->dispose();
    }
    
    public function dispose()
    {
        $this->class_name = null;
        $this->name = null;
        $this->path = null;
        $this->parser = null;
        return $this;
    }
    
    public function load()
    {
        include($this->path);
    }
    
    public function parse($text)
    {
        if ( !class_exists($this->class_name) ) 
            $this->load( );
        return call_user_func(array($this->class_name, 'parse'), $text);
    }
}

final class BeeldCompiler
{    
    public function __construct($name, $cmd, $options='')
    {
        $this->name = $name;
        $this->cmd_tpl = $cmd;
        $this->options = $options;
    }
    
    public function __destruct()
    {
        $this->dispose();
    }
    
    public function dispose()
    {
        $this->name = null;
        $this->cmd_tpl = null;
        $this->options = null;
        return $this;
    }
    
    
    public function compiler($args=array())
    {
        return BeeldUtils::multi_replace($this->cmd_tpl, $args);
    }
    
    
    public function option($opt)
    {
        $opt = strval($opt);
        $p = (strlen($this->options) && strlen($opt)) ? " " : "";
        $this->options .= $p . $opt;
        return $this;
    }
}

//
// Beeld default actions
final class BeeldActions
{
    public static function abort($evt, $params=null)
    {
        if ( $evt && null === $params ) $params =& $evt->data;
        //$config =& $params->config;
        $options =& $params->options;
        $data =& $params->data;
        $current =& $params->current;
        BeeldUtils::cleanup(array($data->tmp_in, $data->tmp_out));
        if ( $data->err ) BeeldUtils::echo_stderr( $data->err );
        $options->dispose();
        $data->dispose();
        $current->dispose();
        $params->config = null;
        $params->options = null;
        $params->data = null;
        $params->current = null;
        if ( $evt ) $evt->dispose( );
        exit( 1 );
    }
    
    public static function process_loop($evt)
    {
        $params =& $evt->data;
        $options =& $params->options;
        $data =& $params->data;
        $current =& $params->current;
        if ($params->process_list_index < $params->process_list_count)
        {
            $cmd = BeeldUtils::multi_replace($params->process_list[$params->process_list_index], array(
             array('${DIR}',        $options->basePath)
            ,array('${CWD}',        $options->cwd)
            ,array('${TPLS}',       BEELD_TEMPLATES)
            ,array('${IN}',         $data->tmp_in)
            ,array('${OUT}',        $data->tmp_out)
            ));
            // breaks correct shell scripts
            //$cmd = escapeshellcmd( $cmd );
            $params->process_list_index += 1;
            
            exec($cmd, $out=array(), $err=0);
            
            // some error occured
            if ( $err ) 
            {
                $data->err = 'Error executing "'.$cmd.'"';
                BeeldUtils::echo_stderr(implode(PHP_EOL, (array)$out));
                $params->process_list = null;
                $evt->abort( );
                return;
            }
            else self::process_loop($evt);
        }
        else
        {
            $data->src = BeeldUtils::read($data->tmp_out);
            $params->process_list = null;
            $evt->next( );
        }
    }
    
    public static function log($evt)
    {
        $params =& $evt->data;
        $options =& $params->options;
        $data =& $params->data;
        $current =& $params->current;
        $sepLine = str_repeat("=", 65);
        // output the build settings
        if ( !$options->outputToStdOut )
        {
            BeeldUtils::echo_($sepLine);
            BeeldUtils::echo_("Build Package");
            BeeldUtils::echo_($sepLine);
            BeeldUtils::echo_(" ");
            BeeldUtils::echo_("Input    : " . $options->inputType);
            BeeldUtils::echo_("Encoding : " . $options->encoding);
            BeeldUtils::echo_("Task     : " . $current->task);
            BeeldUtils::echo_("Output   : " . $options->out);
            BeeldUtils::echo_(" ");
        }
        $evt->next( );
    }
    
    public static function finish($evt)
    { 
        $params =& $evt->data;
        $options =& $params->options;
        $data =& $params->data;
        $current =& $params->current;
        BeeldUtils::cleanup(array($data->tmp_in, $data->tmp_out));
        $options->dispose();
        $data->dispose();
        $current->dispose();
        $params->config = null;
        $params->options = null;
        $params->data = null;
        $params->current = null;
        $evt->dispose( );
    }
    
    public static function next_action($evt) 
    {
        $params =& $evt->data;
        $current =& $params->current;
        $task_actions = $current->task_actions;
        if ( $task_actions && $task_actions->hasNext() )
        {
            $a = $task_actions->getNext();
            $action = 'action_' . $a[0];
            if ( isset($current->actions[$action]) )
            {
                $current->action = $a[0];
                $current->action_cfg = $a[1];
                call_user_func($current->actions[ $action ], $evt);
            }
            else
            {
                $evt->next();
            }
        }
        else
        {
            $evt->next();
        }
    }
    
    public static function next_task($evt) 
    {
        $params =& $evt->data;
        $options =& $params->options;
        $data =& $params->data;
        $current =& $params->current;
        $current_tasks = $current->tasks;
        $pipeline = $params->pipeline;
        if ( $current_tasks && $current_tasks->hasNext() )
        {
            $task = $current_tasks->getNext();
            
            $current->task = $task[0];
            $current->task_actions = Beeld::OrderedMap($task[1]);
            $current->action = '';
            $current->action_cfg = null;
            
            $data->bundle = ''; 
            $data->header = ''; 
            $data->src = '';
            $data->err = false;
            
            $out = $current->task_actions->getItemByKey('out');
            if ( $out )
            {
                $options->out = BeeldUtils::get_real_path($out[1], $options->basePath);
                $options->outputToStdOut = false;
            }
            else
            {
                $options->out = null;
                $options->outputToStdOut = true;
            }
            
            // default header action
            // is first file of src if exists
            $src_action = $current->task_actions->hasItemByKey('src');
            if ( !$current->task_actions->getItemByKey('header') && (-1 < $src_action) )
            {
                $src_cfg = $current->task_actions->getItemByKey('src');
                array_splice($current->task_actions->om, $src_action+1, 0, array(array('header'=>$src_cfg[1][0])));
            }
            
            /*$pipeline->on('#actions', array('BeeldActions','log'));
            
            while ($current->task_actions->hasNext())
            {
                $current->task_actions->getNext();
                $pipeline->on('#actions', array('BeeldActions','next_action'));
            }
            $current->task_actions->rewind( );
            
            if ( $current_tasks->hasNext() ) 
            {
                $pipeline->on('#actions', array('BeeldActions','next_task'));
            }
            else 
            {
                $pipeline->on('#actions', array('BeeldActions','finish'));
            }*/
            
            $evt->next( );
        }
        else
        {
            //BeeldActions::finish( $evt );
            $evt->next( );
        }
    }
                
    /*public static function action_initially($evt)
    { 
        $evt->next();
    }*/
    
    public static function action_src($evt)
    {
        $params =& $evt->data;
        $options =& $params->options;
        $data =& $params->data;
        $current =& $params->current;
        
        $data->src = '';
        
        if ( $current->action_cfg )
        {
            $srcFiles = (array)$current->action_cfg;
            $count = count($srcFiles);
        }
        else
        {
            $srcFiles = null;
            $count = 0;
        }
        
        if ($srcFiles && $count)
        {
            $tplid = '!tpl:';
            $tplidlen = strlen($tplid);
            $buffer = array();

            for ($i=0; $i<$count; $i++)
            {
                $filename = $srcFiles[$i];
                
                if ( !strlen($filename) ) continue;
                
                if ( BeeldUtils::startsWith($filename, $tplid) )
                    // template file
                    $buffer[] = BeeldUtils::get_tpl( substr($filename, $tplidlen) );
                else
                    // src file
                    $buffer[] = BeeldUtils::read( BeeldUtils::get_real_path( $filename, $options->basePath ) );
            }
            $data->src = implode('', $buffer);
        }
        $evt->next();
    }
    
    public static function action_header($evt)
    {
        $params =& $evt->data;
        $options =& $params->options;
        $data =& $params->data;
        $current =& $params->current;
        
        $headerFile = $current->action_cfg;
        $headerText = null;
        $data->header = '';
        
        if ( $headerFile )
        {
            $headerText = BeeldUtils::read( BeeldUtils::get_real_path( $headerFile, $options->basePath ) );
        }
        if ( $headerText && !empty($headerText) )    
        {
            if (BeeldUtils::startsWith($headerText, '/**'))
            {
                $position = strpos($headerText, "**/");
                $data->header = substr($headerText, 0, $position+3);
            }
            else if (BeeldUtils::startsWith($headerText, '/*!'))
            {
                $position = strpos($headerText, "!*/");
                $data->header = substr($headerText, 0, $position+3);
            }
        }
        $evt->next();
    }
    
    public static function action_replace($evt)
    {
        $params =& $evt->data;
        $options =& $params->options;
        $data =& $params->data;
        $current =& $params->current;
        
        if ( $current->action_cfg )
        {
            // ordered map
            $replace = Beeld::OrderedMap($current->action_cfg);
            $hasHeader = ($data->header && strlen($data->header)) ? true : false;
            $xpresion_data = array();
            while ($replace->hasNext())
            {
                $rep = $replace->getNext();
                $rep[1] = BeeldUtils::xpresion($rep[1], $evt); // parse xpresion if any
                $rep[1] = BeeldUtils::evaluate($rep[1], $xpresion_data);
                $data->src = str_replace($rep[0], $rep[1], $data->src);
                if ( $hasHeader )
                    $data->header = str_replace($rep[0], $rep[1], $data->header);
            }
        }
        $evt->next();
    }
    
    public static function action_shellprocess($evt)
    { 
        $params =& $evt->data;
        $current =& $params->current;
        if ( $current->action_cfg )
        {
            $data =& $params->data;
            $params->process_list = (array)$current->action_cfg;
            $params->process_list_count = count($params->process_list);
            $params->process_list_index = 0;
            BeeldUtils::write( $data->tmp_in, $data->src );
            BeeldActions::process_loop( $evt );
        }
        else
        {
            $evt->next( );
        }
    }
    
    public static function action_bundle($evt)
    {
        $params =& $evt->data;
        $options =& $params->options;
        $data =& $params->data;
        $current =& $params->current;
        
        $data->bundle = '';
        
        if ( $current->action_cfg )
        {
            $bundleFiles = (array)$current->action_cfg;
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
                $buffer[] = BeeldUtils::read(BeeldUtils::get_real_path($filename, $options->basePath));
            }
            $data->bundle = implode("\n", $buffer) . "\n";
        }
        $evt->next();
    }
    
    public static function action_out($evt)
    { 
        $params =& $evt->data;
        $options =& $params->options;
        $data =& $params->data;
        //$current =& $params->current;
        // write the processed file
        $text = $data->bundle . $data->header . $data->src;
        $data->bundle=''; $data->header=''; $data->src='';
        if ( $options->outputToStdOut ) echo ($text);
        else BeeldUtils::write($options->out, $text);
        $evt->next();
    }
    
    /*public static function action_finally($evt)
    { 
        $evt->next();
    }*/
}

// extends/implements PublishSubscribe
class Beeld extends PublishSubscribe
{
    const VERSION = "1.0.0";
    public static $Parsers = null;
    
    public $actions = null;
    
    public static function OrderedMap($om)
    {
        return new BeeldOrderedMap($om);
    }
    
    public static function Parser($path, $class_name, $name)
    {
        return new BeeldParser($path, $class_name, $name);
    }
    
    public static function Compiler($name, $cmd, $options='')
    {
        return new BeeldCompiler($name, $cmd, $options);
    }
    
    public static function Obj($props=null)
    {
        return PublishSubscribe::Data($props);
    }
    
    /*public static function Xpresion($xpr)
    {
        return new Xpresion($xpr);
    }*/
    
    public static function init( )
    {
        //
        // Beeld default parsers
        self::$Parsers = array(
            ".json" => Beeld::Parser(
                BEELD_PARSERS . 'Json_Parser.php',
                'Json_Parser',
                'JSON Parser'
            ),
            
            ".yml" => Beeld::Parser(
                BEELD_PARSERS . 'Yaml_Parser.php',
                'Yaml_Parser',
                'Yaml Symfony Parser'
            ),
            
            ".custom" => Beeld::Parser(
                BEELD_PARSERS . 'Custom_Parser.php',
                'Custom_Parser',
                'Custom Parser'
            )
        );
        // aliases
        self::$Parsers[".yaml"] = self::$Parsers[".yml"];
        self::$Parsers["*"] = self::$Parsers[".custom"];
        Xpresion::defaultConfiguration();
        Xpresion::defFunc(array(
            'file'=> Xpresion::Func('file', '$Fn->file($0)'),
            'tpl'=>  Xpresion::Func('tpl',  '$Fn->tpl($0)')
        ));
        Xpresion::defRuntimeFunc(array(
            'file'=> array('BeeldUtils', 'read_file'),
            'tpl'=> array('BeeldUtils', 'get_tpl')
        ));
    }
    
    public function __construct()
    {
        $this->initPubSub( ); 
        
        $this->actions = array(
         'action_src'=> array('BeeldActions', 'action_src')
        ,'action_header'=> array('BeeldActions', 'action_header')
        ,'action_replace'=> array('BeeldActions', 'action_replace')
        ,'action_process-shell'=> array('BeeldActions', 'action_shellprocess')
        ,'action_bundle'=> array('BeeldActions', 'action_bundle')
        ,'action_out'=> array('BeeldActions', 'action_out')
        );
    }
    
    public function __destruct()
    {
        $this->dispose();
    }
    
    public function dispose( ) 
    {
        $this->disposePubSub();
        $this->actions = null;
    }
    
    public function getClass( )
    {
        return Beeld; // "Beeld"
    }
    
    public function addAction( $action, $handler ) 
    {
        if ( $action && is_callable($handler) )
        {
            $this->actions['action_'.$action] = $handler;
        }
        return $this;
    }
    
    public function loadPlugins($plugins, $basePath)
    {
        if ($plugins && !empty($plugins))
        {
            $plugins = Beeld::OrderedMap($plugins);
            $plgid = '!plg:';
            $plgidlen = strlen($plgid);
            while ($plugins->hasNext())
            {
                $plg = $plugins->getNext();
                $filename = $plg[1] . '.php';
                if (BeeldUtils::startsWith($filename, $plgid))
                    $filename = BEELD_PLUGINS . substr($filename, $plgidlen);
                else
                    $filename = BeeldUtils::get_real_path($filename, $basePath);
                require_once($filename);
                $loader = 'beeld_plugin_' . $plg[0];
                if ( is_callable($loader) ) call_user_func( $loader, $this );
            }
        }
        return $this;
    }
    
    // parse input arguments, options and configuration settings
    public function &parse( )
    {
        $params = Beeld::Obj();
        $options = BeeldUtils::parse_options(array(
            'h' => false,
            'help' => false,
            'config' => false,
            'tasks' => false,
            'enc' => 'utf8',
            'compiler' => null
        ), array('config'), array('BeeldUtils', 'show_help_msg'));
        
        //print_r($options);
        //exit(0);
        
        $configFile = realpath($options['config']);
        $encoding = strtolower($options['enc']);
        // parse settings
        $ext = strtolower(BeeldUtils::file_ext($configFile));
        if ( !strlen($ext) || !isset(Beeld::$Parsers[$ext]) ) $ext="*";
        $parser =& Beeld::$Parsers[$ext];
        $configurationFile = BeeldUtils::read($configFile, $encoding);
        $config = $parser->parse($configurationFile);
        if ( !$config ) $config = array();
        //print_r($config);
        //exit(0);
        $params->options = Beeld::Obj(array(
        'configFile'=> $configFile,
        'inputType'=> $parser->name . ' (' . $ext . ')',
        'basePath'=> rtrim(dirname($configFile), "/\\").DIRECTORY_SEPARATOR,
        'cwd'=> getcwd( ),
        'encoding'=> $encoding,
        'compiler'=> $options['compiler'],
        'tasks'=> (isset($options['tasks']) && $options['tasks'] ? explode(',', $options['tasks']) : false)
        ));
        $params->cmd_opts = $options;
        $params->data = Beeld::Obj();
        $params->current = Beeld::Obj();
        
        if ( isset($config['settings']) )
        {
            if ( !isset($config['settings']['RegExp']) ) $config['settings']['RegExp'] = false;
            if ( !isset($config['settings']['Xpresion']) ) $config['settings']['Xpresion'] = false;
        }
        else
        {
            $config['settings'] = array('RegExp'=>false, 'Xpresion'=>false);
        }
        if ( isset($config['plugins']) )
        {
            $this->loadPlugins($config['plugins'], $params->options->basePath);
        }
        $params->config = $config;
        
        return $params;
    }
    
    public function build( &$params )
    {
        $tasks = array(); 
        $selected_tasks = null; 
        
        $params->data->tmp_in = null; 
        $params->data->tmp_out = null;
        
        if ( isset($params->config['tasks']) )
        {
            $params->config['tasks'] = Beeld::OrderedMap($params->config['tasks']);
            while ($params->config['tasks']->hasNext())
            {
                $task = $params->config['tasks']->getNext(true);
                $task_keys = array_keys($task);
                $task_name = reset($task_keys);
                $tasks[] = $task;
                if ( $params->options->tasks && in_array($task_name, $params->options->tasks) )
                {
                    if ( !$selected_tasks ) $selected_tasks = array();
                    $selected_tasks[] = $task;
                }
            }
        }
        if ( !$selected_tasks )
        {
            if ( false === $params->options->tasks )
            {
                if ( !empty($tasks) )
                    $selected_tasks =& $tasks;
                /*else if ( $config )
                    $selected_tasks = array(array('default', &$config));*/
            }
        }
        if ( !$selected_tasks )
        {
            $params->data->err = 'Task is not defined';
            BeeldActions::abort( null, $params );
        }
        
        $params->pipeline =& $this;
        $params->current->tasks = Beeld::OrderedMap($selected_tasks);
        $params->current->actions =& $this->actions;
        $params->current->task_actions = null;
        $params->current->task = '';
        $params->current->action = '';
        $params->current->data = null;
        $params->data->src = '';
        $params->data->header = '';
        $params->data->bundle = '';
        $params->data->err = false;
        $params->data->tmp_in = BeeldUtils::tmpfile( );
        $params->data->tmp_out = BeeldUtils::tmpfile( );
        
        while ( $params->current->tasks && $params->current->tasks->hasNext() )
        {
            $task = $params->current->tasks->getNext();
            $this->on('#actions', array('BeeldActions', 'next_task'));
            $task_actions = Beeld::OrderedMap($task[1]);
            $this->on('#actions', array('BeeldActions','log'));
            // default header action
            // is first file of src if exists
            $src_action = $task_actions->hasItemByKey('src');
            if ( !$task_actions->getItemByKey('header') && (-1 < $src_action) )
            {
                $this->on('#actions', array('BeeldActions','next_action'));
            }
            while ( $task_actions && $task_actions->hasNext() )
            {
                $action = $task_actions->getNext();
                $this->on('#actions', array('BeeldActions','next_action'));
            }
            $task_actions->rewind();
        }
        $params->current->tasks->rewind();
        $this->on('#actions', array('BeeldActions','finish'))->pipeline('#actions', $params, array('BeeldActions', 'abort'));
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
