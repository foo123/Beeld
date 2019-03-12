<?php
/**
*!/usr/bin/env php
*
* CSSmin.py for Notepad++ Python Scripting plugin
* https://github.com/ethanpil/npp-cssmin
* This is a simple script that contains a Python port of the YUI CSS Compressor so you can minify both CSS and JS
*
* Credits:
*  Original cssmin.py ported from YUI here https://github.com/zacharyvoase/cssmin 
*
*  Modified version of npp-cssmin adapted for PHP 5.2+
*  v. 1.0.0
*  @Nikos M.
*
*  NOTE: Does not yet support all vendor prefixes like js cssmin compiler does, 
*  use js cssmin or py cssmin compiler instead if you need those
**/

error_reporting(E_ALL);
if (!class_exists('CSSMin'))
{

if (!function_exists('__echo'))
{
    function __echo($s="") { echo $s . PHP_EOL; }
}

function clamp($v, $m, $M) { return max(min($v, $M), $m); }

// color format conversions
function CSSMin_rgb2hex($r, $g, $b, $asPercent=false) 
{ 
    $per = 2.55;
    if ( $asPercent )
    {
        $r *= $per;
        $g *= $per;
        $b *= $per;
    }
    $r = clamp(round($r), 0, 255);
    $g = clamp(round($g), 0, 255);
    $b = clamp(round($b), 0, 255);
    
    /*$r = sprintf('%02X', $r);
    $g = sprintf('%02X', $g);
    $b = sprintf('%02X', $b);
    $hex = '#' . $r . $g . $b;*/
    $hex = sprintf('#%02X%02X%02X', $r, $g, $b);
    
    return $hex;
}

function CSSMin_hex2rgb($hex, $asPercent=false) 
{  
    $per = 100/255;
    $len = strlen($hex);
    if ( $len && '#' == $hex{0} ) $hex = substr($hex, 1);
    
    $len = strlen($hex);
    
    if ( $len < 3 ) 
        $rgb = array(0, 0, 0);
    
    elseif (6 > $len )
        $rgb = array(
            clamp( hexdec($hex[0].$hex[0]), 0, 255 ), 
            clamp( hexdec($hex[1].$hex[1]), 0, 255 ), 
            clamp( hexdec($hex[2],$hex[2]), 0, 255 )
        );
    
    else
        $rgb = array(
            clamp( hexdec($hex[0].$hex[1]), 0, 255 ), 
            clamp( hexdec($hex[2].$hex[3]), 0, 255 ), 
            clamp( hexdec($hex[4].$hex[5]), 0, 255 )
        );
    
    if ( $asPercent )
    {
        $rgb = array(
            ($rgb[0]*$per).'%', 
            ($rgb[1]*$per).'%', 
            ($rgb[2]*$per).'%'
        );
    }
    return $rgb;
}

function CSSMin_hue2rgb($p, $q, $t) 
{
    if ( $t < 0 ) $t += 1;
    if ( $t > 1 ) $t -= 1;
    if ( $t < 1/6 ) return $p + ($q - $p) * 6 * $t;
    if ( $t < 1/2 ) return $q;
    if ( $t < 2/3 ) return $p + ($q - $p) * (2/3 - $t) * 6;
    return $p;
}

function CSSMin_hsl2rgb($h, $s, $l) 
{
    // convert to [0, 1] range
    $h = (($h + 360)%360)/360;
    $s *= 0.01;
    $l *= 0.01;
    
    if ( 0 == $s )
    {
        // achromatic
        $r = 1;
        $g = 1;
        $b = 1;
    }
    else
    {

        $q = $l < 0.5 ? $l * (1 + $s) : $l + $s - $l * $s;
        $p = 2 * $l - $q;
        $r = CSSMin_hue2rgb($p, $q, $h + 1/3);
        $g = CSSMin_hue2rgb($p, $q, $h);
        $b = CSSMin_hue2rgb($p, $q, $h - 1/3);
    }

    return array(
        clamp( round($r * 255), 0, 255 ), 
        clamp( round($g * 255), 0, 255 ),  
        clamp( round($b * 255), 0, 255 )
    );
}

// vendor prefixes config
$CSSMin_vendor_prefixes = array(

    'values' => array(
        'border-radius' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'box-shadow' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'transform' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'transform-function' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'transform-origin' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'transform-style' => array('-webkit-', '-moz-', '-ms-', '-o-')
    ),
        
    'explicit' => array(
        'border-top-left-radius' => array('-webkit-border-top-left-radius', '-moz-border-radius-topleft')
        ,'border-bottom-left-radius' => array('-webkit-border-bottom-left-radius', '-moz-border-radius-bottomleft')
        ,'border-bottom-right-radius' => array('-webkit-border-bottom-right-radius', '-moz-border-radius-bottomright')
        ,'border-top-right-radius' => array('-webkit-border-top-right-radius', '-moz-border-radius-topright')
        ,'align-items' => array('-webkit-box-align', '-moz-box-align', '-ms-flex-align', '-webkit-align-items')
        ,'justify-content' => array('-webkit-box-pack', '-moz-box-pack', '-ms-flex-pack', '-webkit-justify-content')
    ),
    
    'properties' => array(
        'animation' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'animation-delay' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'animation-direction' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'animation-duration' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'animation-iteration-count' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'animation-name' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'animation-play-state' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'animation-timing-function' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'animation-fill-mode' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'border-radius' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'box-shadow' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'box-sizing' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'backface-visibility' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'column-count' => array('-webkit-', '-moz-')
        ,'column-gap' => array('-webkit-', '-moz-')
        ,'column-fill' => array('-webkit-', '-moz-')
        ,'column-break-inside' => array('-webkit-', '-moz-')
        //,'filter' : ['-webkit-', '-moz-', '-ms-', '-o-']
        ,'perspective' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'perspective-origin' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'transform' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'transform-function' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'transform-origin' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'transform-style' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'transition' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'transition-delay' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'transition-duration' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'transition-property' => array('-webkit-', '-moz-', '-ms-', '-o-')
        ,'transition-timing-function' => array('-webkit-', '-moz-', '-ms-', '-o-')
    ),

    'atrules' => array(
        'keyframes' => array('-webkit-', '-moz-', '-ms-', '-o-')
    )
);

// regexes used to parse/process css
function CSSMin_regex_vendor_value($v) { return '/(^|\s|:|,)(\s*)(' . preg_quote($v, '/') . ')($|;|\s|,)/miS'; }
function CSSMin_regex_vendor_explicit($p) { return '/(^|;|\{)(\s*)((' . preg_quote($p, '/') . ')\s*:([^;\}]*))($|;|\})/miS'; }
function CSSMin_regex_vendor_property($p) { return '/(^|;|\{)(\s*)((' . preg_quote($p, '/') . ')\s*:([^;\}]*))($|;|\})/miS'; }
function CSSMin_regex_vendor_atrule($p) { return '/(^|;|\{|\})(\s*)(@(' . preg_quote($p, '/') . ')\s+([0-9a-zA-Z_\-]+)\s*\{)/miS'; }

$CSSMin_Regex = (object)array(
    'hsla'=> '/\b(hsla|hsl)\s*\(([^\(\)]+)\)/miS',
    'rgba'=> '/\b(rgba|rgb)\s*\(([^\(\)]+)\)/miS',
    'pseudoclasscolon'=> '/(^|\})(([^\{\:])+\:)+([^\{]*\{)/',
    'whitespace_start'=> '/\s+([!{};:>+\(\)\],])/',
    '_and'=> '/\band\(/i',
    'whitespace_end'=> '/([!{}:;>+\(\[,])\s+/',
    'space'=> '/\s+/',
    'semi'=> '/;+\}/',
    'semicolons'=> '/;;+/',
    '_empty'=> '/[^\}\{]+\{\}/',
    'zero_units'=> '/([\s:])(0)(px|rem|em|%|in|cm|mm|pc|pt|ex)/i', /* ms|s seems to cause animation issues */
    'floating_points'=> '/(:|\s|,)0+\.(\d+)/',
    'hex_color'=> '/([^"\'=\s])(\s*)#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])/',
    'url'=> '#\burl\s*\(([^\(\)]+?)\)#i',
    'charset'=> '/@charset [^;]+($|;)/mi',
    'vendor'=> array( 'value'=> array(), 'explicit'=> array(), 'property'=> array(), 'atrule'=> array() )
);

foreach (array_keys($CSSMin_vendor_prefixes['values']) as $p)
    $CSSMin_Regex->vendor['value'][$p] = CSSMin_regex_vendor_value($p);
foreach (array_keys($CSSMin_vendor_prefixes['explicit']) as $p)
    $CSSMin_Regex->vendor['explicit'][$p] = CSSMin_regex_vendor_explicit($p);
foreach (array_keys($CSSMin_vendor_prefixes['properties']) as $p)
    $CSSMin_Regex->vendor['property'][$p] = CSSMin_regex_vendor_property($p);
foreach (array_keys($CSSMin_vendor_prefixes['atrules']) as $p)
    $CSSMin_Regex->vendor['atrule'][$p] = CSSMin_regex_vendor_value($p);

       
class CSSMin
{
    const VERSION = "1.0.0";
    
    public $enc = false;
    public $input = false;
    public $output = false;
    public $realpath = null;
    public $embedImages = false;
    public $embedFonts = false;
    public $embedImports = false;
    public $removeComments = false;
    public $noMinify = false;
    public $vendorPrefixes = false;
    public $HSLA2RGBA = false;
    public $RGB2HEX = false;
    
    public function __construct() 
    { 
        $this->enc = false; 
        $this->input = false; 
        $this->output = false; 
        $this->embedImages = false; 
        $this->embedFonts = false; 
        $this->embedImports = false; 
        $this->removeComments = false;
        $this->noMinify = false; 
        $this->vendorPrefixes = false; 
        $this->HSLA2RGBA = false;
        $this->RGB2HEX = false;
        $this->realpath = null; 
    }
   
    public function CSSMin() { $this->__construct();  }
   
    // simulate python's "startswith" string method
    /*protected function startsWith($s, $prefix) { return ($prefix==substr($s, 0, strlen($prefix))); }*/
    protected function startsWith($s, $prefix) { return (0===strncmp($s, $prefix, strlen($prefix))); }
    
    public function read($file) { return file_get_contents($file); }

    public function write($file, $text) { return file_put_contents($file, $text); }

    // https://github.com/JosephMoniz/php-path
    protected function joinPath() 
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
    
    protected function isRelativePath($file)
    {
        
        if (
            self::startsWith($file, 'http://') || 
            self::startsWith($file, 'https://') ||
            self::startsWith($file, '/') ||
            self::startsWith($file, '\\')
        )
            return false;
        elseif (
            self::startsWith($file, './') || 
            self::startsWith($file, '../') || 
            self::startsWith($file, '.\\') || 
            self::startsWith($file, '..\\') ||
            preg_match('/[a-z0-9_]/i', $file[0])
        )
            return true;
            
        // unknown
        return false;
    }
    
    protected function realPath($file, $rpath=null)
    {
        $rpath = ($rpath) ? $rpath : $this->realpath;
        if ( $rpath ) return $this->joinPath($rpath, $file); 
        else return $file;
    }
    
    /**
     * parseArgs Command Line Interface (CLI) utility function.
     * @author              Patrick Fisher <patrick@pwfisher.com>
     * @see                 https://github.com/pwfisher/CommandLine.php
     */
    protected function parseArgs($argv = null) 
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
    
    public function parse()
    {
        $defaultArgs=array(
            'h' => false,
            'help' => false,
            'embed-images' => false,
            'embed-fonts' => false,
            'embed-imports' => false,
            'remove-comments' => false,
            'no-minify' => false,
            'vendor-prefixes' => false,
            'hsla2rgba' => false,
            'rgb2hex' => false,
            'basepath' => false,
            'input' => false,
            'output' => false
        );
        $args = $this->parseArgs();
        $args = array_intersect_key($args, $defaultArgs);
        $args = array_merge($defaultArgs, $args);
        
        if (
            ($args['h'] || $args['help']) ||
            (!isset($args['input']) || !$args['input'] || !is_string($args['input']) || 0==strlen($args['input']))
        )
        {
            // If no dependencies have been passed or help is set, show the help message and exit
            $p = pathinfo(__FILE__);
            $thisFile = (isset($p['extension'])) ? $p['filename'].'.'.$p['extension'] : $p['filename'];
            
            __echo ("usage: $thisFile [-h] [--no-minify] [--remove-comments] [--vendor-prefixes] [--hsla2rgba] [--rgb2hex] [--embed-images] [--embed-fonts] [--embed-imports] [--basepath=PATH] [--input=FILE] [--output=FILE]");
            __echo ();
            __echo ("Process and Minify CSS Files (v. ".CSSMin::VERSION.")");
            __echo ();
            __echo ("optional arguments:");
            __echo ("  -h, --help              show this help message and exit");
            __echo ("  --input=FILE            input file (REQUIRED)");
            __echo ("  --output=FILE           output file (OPTIONAL)");
            __echo ("  --vendor-prefixes       whether to add/fix vendor prefixes in css (default false)");
            __echo ("  --hsla2rgba             whether to convert hsl(a) colors to rgb(a) colors (default false)");
            __echo ("  --rgb2hex               whether to convert rgb colors to hex colors (default false)");
            __echo ("  --embed-images          whether to embed images in the css (default false)");
            __echo ("  --embed-fonts           whether to embed fonts in the css (default false)");
            __echo ("  --embed-imports         TODO, whether to embed css files added with @import (default false)");
            __echo ("  --remove-comments       whether to remove css comments (default false)");
            __echo ("  --no-minify             whether to bypass minification of the css (default false)");
            __echo ("  --basepath=PATH         file base path (OPTIONAL)");
            __echo ();
            
            exit(1);
        }
        
        if ( $args['basepath'] )
            $this->realpath = $args['basepath'];
        else
            // get real-dir of input file
            $this->realpath = rtrim(dirname( realpath($args['input']) ), "/\\" ).DIRECTORY_SEPARATOR;
            
        $this->input = $args['input'];
        $this->output = (isset($args['output'])) ? $args['output'] : false;
        $this->embedImages = (isset($args['embed-images']) && $args['embed-images']) ? true : false;
        $this->embedFonts = (isset($args['embed-fonts']) && $args['embed-fonts']) ? true : false;
        $this->embedImports = (isset($args['embed-imports']) && $args['embed-imports']) ? true : false;
        $this->removeComments = (isset($args['remove-comments']) && $args['remove-comments']) ? true : false;
        $this->noMinify = (isset($args['no-minify']) && $args['no-minify']) ? true : false;
        $this->vendorPrefixes = (isset($args['vendor-prefixes']) && $args['vendor-prefixes']) ? true : false;
        $this->HSLA2RGBA = (isset($args['hsla2rgba']) && $args['hsla2rgba']) ? true : false;
        $this->RGB2HEX = (isset($args['rgb2hex']) && $args['rgb2hex']) ? true : false;
    }
    
    public function convert_hsl2rgb($css) 
    {
        global $CSSMin_Regex;
        $rx = $CSSMin_Regex->hsla; 
        $per = 100/255;
        $offset = 0;
        while ( preg_match($rx, $css, $m, PREG_OFFSET_CAPTURE, $offset) ) 
        {
            $isHSLA = 'hsla'==$m[1][0] || 'HSLA'==$m[1][0];
            
            $hsl = explode(',', trim($m[2][0]));
            
            $h = floatval(trim($hsl[0]));
            
            $s = trim($hsl[1]);
            if ( false !== strpos($s, '%') ) $s = floatval($s);
            else $s = floatval($s)*$per;
            
            $l = trim($hsl[2]);
            if ( false !== strpos($l, '%') ) $l = floatval($l);
            else $l = floatval($l)*$per;
            
            $rgb = CSSMin_hsl2rgb($h, $s, $l);
            if ( $isHSLA )
                $rgb = 'rgba(' . implode(',', $rgb) . ',' . $hsl[3] . ')';
            else
                $rgb = 'rgb(' . implode(',', $rgb) . ')';
                
            //$css = str_replace($m[0][0], $rgb . ' ', $css);
            $css = substr($css, 0, $m[0][1]) . $rgb . substr($css, $m[0][1]+strlen($m[0][0]));
            $offset = $m[0][1] + strlen($rgb);
        }
        return $css;
    }
        
    public function convert_rgb2hex($css) 
    {
        global $CSSMin_Regex;
        $rx = $CSSMin_Regex->rgba; 
        $rep = array();
        $i = 0;
        $offset = 0;
        while ( preg_match($rx, $css, $m, PREG_OFFSET_CAPTURE, $offset) ) 
        {
            $isRGBA = 'rgba'==strtolower($m[1][0]);
            if ( $isRGBA ) 
            {
                // bypass
                $i++;
                $id = '__[[rep_'.$i.']]__';
                $rep[$id] = $m[0][0];
                //$css = str_replace( $m[0][0], $id . ' ', $css );
                $css = substr($css, 0, $m[0][1]) . $id . substr($css, $m[0][1]+strlen($m[0][0]));
                $offset = $m[0][1] + strlen($id);
            }
            else
            {
                $rgb = explode(',', trim($m[2][0]));
                
                $r = trim($rgb[0]);
                if ( false !== strpos($r, '%') ) $r = floatval($r)*2.55;
                else $r = floatval($r);
                
                $g = trim($rgb[1]);
                if ( false !== strpos($g, '%') ) $g = floatval($g)*2.55;
                else $g = floatval($g);
                
                $b = trim($rgb[2]);
                if ( false !== strpos($b, '%') ) $b = floatval($b)*2.55;
                else $b = floatval($b);
                
                $hex = CSSMin_rgb2hex($r, $g, $b);
                //$css = str_replace($m[0][0], $hex . ' ', $css);
                $css = substr($css, 0, $m[0][1]) . $hex . substr($css, $m[0][1]+strlen($m[0][0]));
                $offset = $m[0][1] + strlen($hex);
            }
        }
        $css = str_replace(array_keys($rep), array_values($rep), $css);
        
        return $css;
    }
        
    public function remove_comments($css)
    {
        // """Remove all CSS comment blocks."""
        
        $iemac = false;
        $preserve = false;
        $comment_start = strpos($css, "/*");
        while (false!==$comment_start)
        {
            // Preserve comments that look like `/*!...*/` or `/**...*/`.
            // Slicing is used to make sure we don"t get an IndexError.
            $preserve = false;//(bool)($css[$comment_start + 2] /*$comment_start + 3*/ == "!" || $css[$comment_start + 2] /*$comment_start + 3*/ == "*");
            
            $comment_end = strpos($css, "*/", $comment_start + 2);
            if (false===$comment_end)
            {
                if (!$preserve)
                {
                    $css = substr($css, 0, $comment_start);
                    break;
                }
            }
            elseif ($comment_end >= ($comment_start + 2))
            {
                if ($css[$comment_end - 1] == "\\")
                {
                    // This is an IE Mac-specific comment; leave this one and the
                    // following one alone.
                    $comment_start = $comment_end + 2;
                    $iemac = true;
                }
                elseif ($iemac)
                {
                    $comment_start = $comment_end + 2;
                    $iemac = false;
                }
                elseif (!$preserve)
                {
                    $css = substr($css, 0, $comment_start) . substr($css, $comment_end + 2);
                }
                else
                {
                    $comment_start = $comment_end + 2;
                }
            }
            $comment_start = strpos($css, "/*", $comment_start);
        }
        return $css;
    }

    protected function pseudoclasscolon($css)
    {
        
        /**
        """
        Prevents 'p :link' from becoming 'p:link'.
        
        Translates 'p :link' into 'p ___PSEUDOCLASSCOLON___link'; this is
        translated back again later.
        """
        **/
        
        global $CSSMin_Regex;
        $rx = $CSSMin_Regex->pseudoclasscolon;
        $offset = 0;
        while ( preg_match($rx, $css, $m, PREG_OFFSET_CAPTURE, $offset) )
        {
            $rep = str_replace( ":", "___PSEUDOCLASSCOLON___", $m[0][0] );
            //$css = str_replace( $m[0][0], $rep, $css );
            $css = substr($css, 0, $m[0][1]) . $rep . substr($css, $m[0][1]+strlen($m[0][0]));
            $offset = $m[0][1] + strlen($rep);
        }
        return $css;
    }
        
    public function remove_unnecessary_whitespace($css)
    {
        // """Remove unnecessary whitespace characters."""
        
        global $CSSMin_Regex;
        $css = $this->pseudoclasscolon($css);
        // Remove spaces from before things.
        $css = preg_replace($CSSMin_Regex->whitespace_start, '$1', $css);
        
        // Put the space back in for a few cases, such as `@media screen` and
        // `(-webkit-min-device-pixel-ratio:0)`.
        $css = preg_replace($CSSMin_Regex->_and, "and (", $css);
        
        // Put the colons back.
        $css = str_replace('___PSEUDOCLASSCOLON___', ':', $css);
        
        // Remove spaces from after things.
        $css = preg_replace($CSSMin_Regex->whitespace_end, '$1', $css);
        
        return $css;
    }


    public function remove_unnecessary_semicolons($css)
    {
        // """Remove unnecessary semicolons."""
        
        global $CSSMin_Regex;
        return preg_replace($CSSMin_Regex->semi, "}", $css);
    }

    public function remove_empty_rules($css)
    {
        // """Remove empty rules."""
        
        global $CSSMin_Regex;
        return preg_replace($CSSMin_Regex->_empty, "", $css);
    }

    public function condense_zero_units($css)
    {
        // """Replace `0(px, em, %, etc)` with `0`."""
        
        global $CSSMin_Regex;
        return preg_replace($CSSMin_Regex->zero_units, '$1$2', $css);
    }

    public function condense_multidimensional_zeros($css)
    {
        // """Replace `:0 0 0 0;`, `:0 0 0;` etc. with `:0;`."""
        
        $css = str_replace(":0 0 0 0;", ":0;", $css);
        $css = str_replace(":0 0 0;", ":0;", $css);
        $css = str_replace(":0 0;", ":0;", $css);
        
        // Revert `background-position:0;` to the valid `background-position:0 0;`.
        $css = str_replace("background-position:0;", "background-position:0 0;", $css);
        
        return $css;
    }

    public function condense_floating_points($css)
    {
        // """Replace `0.6` with `.6` where possible."""
        
        global $CSSMin_Regex;
        return preg_replace($CSSMin_Regex->floating_points, '$1.$2', $css);
    }

    public function condense_hex_colors($css)
    {
        // """Shorten colors from #AABBCC to #ABC where possible."""
        
        global $CSSMin_Regex;
        $rx = $CSSMin_Regex->hex_color;
        $offset=0;
        while (preg_match($regex, $css, $m, PREG_OFFSET_CAPTURE, $offset))
        {
            $first = $m[3][0] . $m[5][0] . $m[7][0];
            $second = $m[4][0] . $m[6][0] . $m[8][0];
            if ( strtolower($first) === strtolower($second) )
            {
                $rep = $m[1][0] . $m[2][0] . '#' . strtolower($first);
                //$css = str_replace($m[0][0], $rep, $css);
                $css = substr($css, 0, $m[0][1]) . $rep . substr($css, $m[0][1]+strlen($m[0][0]));
                $offset = $m[0][1] + strlen($rep);
            }
            else
            {
                $offset = $m[0][1] + strlen($m[0][0]);
            }
        }
        return $css;
    }

    public function condense_whitespace($css)
    {
        // """Condense multiple adjacent whitespace characters into one."""
        
        global $CSSMin_Regex;
        return preg_replace($CSSMin_Regex->space, " ", $css);
    }

    public function condense_semicolons($css)
    {
        // """Condense multiple adjacent semicolon characters into one."""
        
        global $CSSMin_Regex;
        return preg_replace($CSSMin_Regex->semicolons, ";", $css);
    }

    public function wrap_css_lines($css, $line_length)
    {
        // """Wrap the lines of the given CSS to an approximate length."""
        
        $lines = array();
        $line_start = 0;
        $str_len = strlen($css);
        for ($i=0; $i<$str_len; $i++)
        {
            $ch = $css[$i];
            // It's safe to break after `}` characters.
            if ( '}' == $ch && ($i - $line_start >= $line_length) )
            {
                $lines[] = substr($css, $line_start, $i + 1);
                $line_start = $i + 1;
            }
        }
        if ($line_start < $str_len) $lines[] = substr($css, $line_start);
        
        return implode("\n", $lines);
    }
    
    protected function extract_urls($css)
    {
        // handle (relative) image/font urls in CSS
        global $CSSMin_Regex;
        $rx = $CSSMin_Regex->url;
        $urls = array();
        if ( preg_match_all($rx, $css, $m) )
        {
            $matches = $m[1];
            unset($m);
            foreach ($matches as $match)
            {
                $url = trim( trim( trim( $match ), '"\'' ) );
                
                if ( $this->isRelativePath($url) ) $urls[] = $url;
            }
        }
        return $urls;
    }
    
    public function embed_images($css, $urls)
    {
        $imgs = array('gif', 'png', 'jpg', 'jpeg');
        $replace = array();
        foreach ($urls as $url)
        {
            if ( isset($replace[$url]) && $replace[$url] ) continue;
            
            $ext = strtolower(end(explode(".", $url)));
            
            if ( in_array($ext, $imgs) )
            {
                $path = $this->realPath($url);
                $inline = base64_encode(file_get_contents($path));
                
                // gif
                if ( 'gif' == $ext )
                    $inline = 'data:image/gif;base64,'.$inline;
                
                // png
                elseif ( 'png' == $ext )
                    $inline = 'data:image/png;base64,'.$inline;
                
                // jpg/jpeg
                else
                    $inline = 'data:image/jpeg;base64,'.$inline;
                
                $css = str_replace($url, $inline, $css);
                
                $replace[$url] = 1;
            }
        }
        return $css;
    }

    public function embed_fonts($css, $urls)
    {
        $fonts = array('svg', 'ttf', 'eot', 'woff');
        $replace = array();
        foreach ($urls as $url)
        {
            $idpos = strpos($url, '#');
            $id = (false!==$idpos) ? substr($url, $idpos) : '';
            $fonturl = (false!==$idpos) ? substr($url, 0, $idpos) : $url;
            
            if ( isset($replace[$fonturl]) && $replace[$fonturl] ) continue;
            
            $ext = strtolower(end(explode(".", $fonturl)));
            
            if ( in_array($ext, $fonts) )
            {
                $path = $this->realPath($fonturl);
                $inline = base64_encode(file_get_contents($path));
                
                // svg
                if ( 'svg' == $ext )
                    $inline = 'data:font/svg;charset=utf-8;base64,'.$inline;
                
                // ttf
                elseif ( 'ttf' == $ext )
                    $inline = 'data:font/ttf;charset=utf-8;base64,'.$inline;
                
                // eot
                elseif ( 'eot' == $ext )
                    $inline = 'data:font/eot;charset=utf-8;base64,'.$inline;
                
                // woff
                else
                    $inline = 'data:font/woff;charset=utf-8;base64,'.$inline;
                
                $css = str_replace($url, $inline.$id, $css);
                
                $replace[$fonturl] = 1;
            }
        }
        return $css;
    }

    public function embed_imports($css) 
    {
        // todo
        return $css;
    }
    
    public function remove_multiple_charset($css) 
    {
        global $CSSMin_Regex;
        $rx = $CSSMin_Regex->charset;
        $charset = null; $times = 0;
        $offset = 0;
        while ( preg_match($rx, $css, $m, PREG_OFFSET_CAPTURE, $offset) )
        {
            $times++;
            if ( 1 == $times) $charset = $m[0][0];
            //$css = str_replace($m[0][0], '', $css);
            $css = substr($css, 0, $m[0][1]) . '' . substr($css, $m[0][1]+strlen($m[0][0]));
            $offset = $m[0][1];
        }
        
        if ( $charset )
            $css = $charset . "\n" . $css;
        
        return $css;
    }
        
    public function vendor_prefix_values($val, $prefix) 
    {
        global $CSSMin_vendor_prefixes, $CSSMin_Regex;
        $values = array_keys($CSSMin_vendor_prefixes['values']);
        $rv = array();
        $i = 0;
        foreach ($values as $v)
        {
            $rx = $CSSMin_Regex->vendor['value'][$v];
            $offset = 0;
            while ( preg_match($rx, $val, $m, PREG_OFFSET_CAPTURE, $offset) ) 
            {
                $i++;
                $id = '__[[value_'.$i.']]__';
                $rep = $m[1][0] . $m[2][0] . $id . $m[4][0];
                //$val = str_replace( $m[0][0], $rep . ' ', $val );
                $val = substr($val, 0, $m[0][1]) . $rep . ' ' . substr($val, $m[0][1]+strlen($m[0][0]));
                $rv[$id] = $prefix . $m[3][0];
                $offset = $m[0][1] + strlen($rep);
            }
        }
        $val = str_replace(array_keys($rv), array_values($rv), $val);
        return $val;
    }
        
    public function vendor_prefix_explicit($css) 
    {
        global $CSSMin_vendor_prefixes, $CSSMin_Regex;
        $expl = $CSSMin_vendor_prefixes['explicit'];
        $replacements = array();
        $i = 0;
        foreach ($expl as $p => $prefixes)
        {
            $l = count($prefixes);
            $rx = $CSSMin_Regex->vendor['explicit'][$p];
            $offset = 0;
            while ( preg_match($rx, $css, $m, PREG_OFFSET_CAPTURE, $offset) ) 
            {
                $css = explode($m[0][0], $css);
                $prefixed = array();
                for ($j=0; $j<$l; $j++)
                    $prefixed[]  = $m[2][0] . $prefixes[$j] . ':' . $m[5][0] . ';';
                $prefixed[] = $m[2][0] . $p . ':' . $m[5][0] . $m[6][0];
                $i++;
                $id = '__[[explicit_'.$i.']]__';
                $rep = $m[1][0] . $id;
                if ( '}'==$m[6][0] )
                    $css = implode($rep, $css);
                else
                    $css = implode($rep . ';', $css);
                $replacements[$id] = implode("\n", $prefixed);
                $offset = $m[0][1] + strlen($rep);
            }
        }
        return array($css, $replacements);
    }
        
    public function vendor_prefix_properties($css, $prefix=null) 
    {
        global $CSSMin_vendor_prefixes, $CSSMin_Regex;
        $props = $CSSMin_vendor_prefixes['properties'];
        $replacements = array();
        $i = 0;
        foreach ($props as $p => $prefixes)
        {
            $l = count($prefixes);
            $rx = $CSSMin_Regex->vendor['property'][$p];
            $offset = 0;
            while ( preg_match($rx, $css, $m, PREG_OFFSET_CAPTURE, $offset) ) 
            {
                $css = explode($m[0][0], $css);
                $prefixed = array();
                if ($prefix)
                {
                    $prefixed[] = $m[2][0] . $prefix . $p . ':' . $this->vendor_prefix_values($m[5][0], $prefix) . $m[6][0];
                }
                else
                {
                    for ($j=0; $j<$l; $j++)
                        $prefixed[] = $m[2][0] . $prefixes[$j] . $p . ':' . $this->vendor_prefix_values($m[5][0], $prefixes[$j]) . ';';
                    $prefixed[] = $m[2][0] . $p . ':' . $m[5][0] . $m[6][0];
                }
                $i++;
                $id = '__[[property_'.$i.']]__';
                $rep = $m[1][0] . $id;
                if ( '}'==$m[6][0] )
                    $css = implode($rep, $css);
                else
                    $css = implode($rep . ';', $css);
                $replacements[$id] = implode("\n", $prefixed);
                $offset = $m[0][1] + strlen($rep);
            }
        }
        return array($css, $replacements);
    }
        
    public function vendor_prefix_atrules($css) 
    {
        global $CSSMin_vendor_prefixes, $CSSMin_Regex;
        $atrules = $CSSMin_vendor_prefixes['atrules'];
        $replacements = array();
        $i = 0;
        $has_properties = !empty($CSSMin_vendor_prefixes['properties']);
        foreach ($atrules as $p=>$prefixes)
        {
            $l = count($prefixes);
            $rx = $CSSMin_Regex->vendor['atrule'][$p];
            $offset = 0;
            while ( preg_match($rx, $css, $m, PREG_OFFSET_CAPTURE, $offset) ) 
            {
                $braces = 1; 
                $start = $m[0][1] + strlen($m[1][0]) + strlen($m[2][0]); 
                $start2 = $start + strlen($m[3][0]); 
                $lent = 0; //$ch = ' ';
                while ( $braces )
                {
                    $ch = $css{$start2 + $lent++};
                    if ('{' == $ch) $braces++;
                    else if ('}' == $ch) $braces--;
                }
                
                $at_rule = substr($css, $start, strlen($m[3][0])+$lent);
                $at_rule_name = $m[5][0];
                $at_rule_body = substr($css, $start+ strlen($m[3][0]), $lent-1);
                $css = explode($at_rule, $css);
                $prefixed = array();
                for ($j=0; $j<$l; $j++)
                {
                    $at_rule_body_p = $at_rule_body . '';
                    if ( $has_properties )
                    {
                        $res = $this->vendor_prefix_properties($at_rule_body_p, $prefixes[$j]);
                        $at_rule_body_p = $res[0];
                        $at_rule_body_replace = $res[1];
                        $at_rule_body_p = str_replace(array_keys($at_rule_body_replace), array_values($at_rule_body_replace), $at_rule_body_p);
                    }
                    $prefixed[] = '@' . $prefixes[$j] . $p . ' ' . $at_rule_name . ' {' . $at_rule_body_p . ' }';
                }
                $prefixed[] = '@' . $p . ' ' . $at_rule_name . ' {' . $at_rule_body . ' }';
                $i++;
                $id = '__[[at_rule_'.$i.']]__';
                $rep = $id;
                $css = implode($rep . "\n", $css);
                $replacements[$id] = implode("\n", $prefixed);
                $offset = $m[0][1] + strlen($rep);
            }
        }
        return array($css, $replacements);
    }
        
    public function vendor_prefixes($css)
    {
        global $CSSMin_vendor_prefixes;
        
        if ( !empty($CSSMin_vendor_prefixes) )
        {
            $replace_atrules = null;
            $replace_explicit = null;
            $replace_properties = null;
            if ( !empty($CSSMin_vendor_prefixes['atrules']) )
            {
                $res = $this->vendor_prefix_atrules($css);
                $css = $res[0];
                $replace_atrules = $res[1];
            }
            if ( !empty($CSSMin_vendor_prefixes['explicit']) )
            {
                $res = $this->vendor_prefix_explicit($css);
                $css = $res[0];
                $replace_explicit = $res[1];
            }
            if ( !empty($CSSMin_vendor_prefixes['properties']) )
            {
                $res = $this->vendor_prefix_properties($css);
                $css = $res[0];
                $replace_properties = $res[1];
            }
            
            if ( !empty($replace_atrules) )
                $css = str_replace(array_keys($replace_atrules), array_values($replace_atrules), $css);
            
            if ( !empty($replace_explicit) )
                $css = str_replace(array_keys($replace_explicit), array_values($replace_explicit), $css);
            
            if ( !empty($replace_properties) )
                $css = str_replace(array_keys($replace_properties), array_values($replace_properties), $css);
                
            $css = $this->condense_semicolons($css);
        }
        return $css;
    }
    
    public function minify($css, $wrap=null, $commentsRemoved=false)
    {
        if ( !$commentsRemoved )
            $css = $this->remove_comments($css);
        
        $css = $this->condense_whitespace($css);
        
        // A pseudo class for the Box Model Hack
        // (see http://tantek.com/CSS/Examples/boxmodelhack.html)
        $css = str_replace('"\\"}\\""', "___PSEUDOCLASSBMH___", $css);
        
        $css = $this->remove_unnecessary_whitespace($css);
        
        $css = $this->remove_unnecessary_semicolons($css);
        
        $css = $this->condense_zero_units($css);
        
        $css = $this->condense_multidimensional_zeros($css);
        
        $css = $this->condense_floating_points($css);
        
        //$css = $this->normalize_rgb_colors_to_hex($css);
        
        $css = $this->condense_hex_colors($css);
        
        if ( null!==$wrap ) $css = $this->wrap_css_lines($css, $wrap);
        
        $css = str_replace("___PSEUDOCLASSBMH___", '"\\"}\\""', $css);
        
        $css = trim( $this->condense_semicolons($css) );
        
        return $css;
    }
    
    public function process($css, $wrap=null)
    {
        if ( $this->removeComments )
            $css = $this->remove_comments($css);
        
        //if ( $this->embedImports )
        //    $css = $this->embed_imports($css);
        
        $css = $this->remove_multiple_charset($css);
            
        if ( $this->HSLA2RGBA )
            $css = $this->convert_hsl2rgb($css);
        if ( $this->RGB2HEX )
            $css = $this->convert_rgb2hex($css);
            
        if ( $this->vendorPrefixes )
            $css = $this->vendor_prefixes($css);
        
        if ( !$this->noMinify )
            $css = $this->minify($css, $wrap, $this->removeComments);
        
        if ( $this->embedImages || $this->embedFonts )
            $urls = $this->extract_urls($css);
        if ( $this->embedImages )
            $css = $this->embed_images($css, $urls);
        if ( $this->embedFonts )
            $css = $this->embed_fonts($css, $urls);
        
        return $css;
    }
    
    // static
    public static function Main()
    {
        $cssmin = new CSSMin();
        $cssmin->parse( );
        if ( $cssmin->input )
        {
            $css = $cssmin->read( $cssmin->input );
            $mincss = $cssmin->process( $css );
            if ( $cssmin->output ) $cssmin->write( $cssmin->output, $mincss );
            else echo ( $mincss );
        }
    }
}
}
// if called directly from command-line
if ( ('cli' === php_sapi_name()) && (__FILE__ == realpath($_SERVER['SCRIPT_FILENAME'])) )
    // run it
    CSSMin::Main();
