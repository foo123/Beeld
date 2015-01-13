<?php
/**
*
*   Custom Parser for PHP 5.2+
*
*   @author Nikos M.  
*   https://foo123.github.com/
*   http://nikos-web-development.netai.net/
*
**/
if (!class_exists('Custom_Parser'))
{
final class Custom_Parser_Context
{
    public $prev = null;
    public $next = null;
    public $buffer = null;
    public $block = null;
    public $type = null;
    
    public function __construct(&$buffer, $block, $type, $prev=null)
    {
        $this->buffer =& $buffer;
        $this->block = $block;
        $this->type = $type;
        $this->prev = $prev;
        $this->next = null;
    }
    
    public function push(&$buffer, $block, $type) 
    {
        $_ctx = new self($buffer, $block, $type, $this);
        $this->next = $_ctx;
        return $_ctx;
    }
    
    public function pop() 
    {
        return $this->prev;
    }
}

class Custom_Parser
{
    const T_VAL = 1;
    const T_MAP = 2;
    const T_LIST = 3;
    const T_ORDEREDMAP = 4;
    
    protected static $RE_NEWLINE = null; 
    //protected static $RE_BLOCK = '/^([a-zA-Z0-9\\-_]+)\\s*(=\\[\\{\\}\\]|=\\[\\]|=\\{\\}|=)?/';
    protected static $RE_ENDBLOCK = null;
    protected static $ESC = null;
    
    public static function init()
    {
        self::$RE_NEWLINE = '/\\n\\r|\\r\\n|\\r|\\n/'; 
        self::$RE_ENDBLOCK = '/^(@\\s*)+/';
        self::$ESC = array(
            array('\\n', "\n"),
            array('\\r', "\r"),
            array('\\t', "\t"),
            array('\\v', "\v"),
            array('\\f', "\f")
        );
    }
    
    protected static function Context(&$buffer, $block, $type, $prev=null) 
    {
        return new Custom_Parser_Context($buffer, $block, $type, $prev);
    }
    
    protected static function removeComment($s, $comm, $pos=null) 
    {
        $p = null !== $pos ? $pos : strpos($s, $comm, 0);
        return trim( false !== $p ? substr($s, 0, $p) : $s );
    }
    
    protected static function getStr($s, $q, $and_un_escape=true)
    {
        $i = 1;
        $l = strlen($s); 
        $esc = false;
        $ch = ''; 
        $quoted = ''; 
        $rem = '';
        while ( $i < $l )
        {
            $ch = $s[$i++];
            if ( $q === $ch && !$esc ) break;
            $esc = !$esc && ('\\' === $ch);
            $quoted .= $ch;
        }
        $rem = trim( substr($s, $i) );
        if ( false !== $and_un_escape )
        {
            foreach (self::$ESC as $unesc)
                $quoted = str_replace($unesc[0], $unesc[1], $quoted);
            $quoted = str_replace('\\\\', '\\', $quoted);
        }
        return array($quoted, $rem);
    }
    
    protected static function startsWith($str, $pre, $pos=0) 
    { 
        return (bool)($str && ($pre === substr($str, $pos, strlen($pre)))); 
    }

    protected static function getVal( $line )
    {
        $linestartswith = $line[0];
        // quoted string
        if ( '"'==$linestartswith || "'"==$linestartswith || "`"==$linestartswith )
        {
            list($key, $line) = self::getStr($line, $linestartswith);
            return $key;
        }
        // un-quoted string
        else
        {
            return self::removeComment( $line, '#' );
        }
    }
    
    protected static function getKeyVal( $line )
    {
        $linestartswith = $line[0];
        
        // quoted string
        if ( '"'==$linestartswith || "'"==$linestartswith || "`"==$linestartswith )
        {
            list($key, $line) = self::getStr($line, $linestartswith);
            
            // key-value pair
            $eq_index = strpos($line, '=', 0);
            $comm_index = strpos($line, '#', 0);
            
            if ( false !== $eq_index && (false === $comm_index || $eq_index < $comm_index) )
            {
                $val = substr($line, $eq_index+1);
                
                if ( self::startsWith($val, "[{}]"))
                {
                    return array($key, array(), self::T_ORDEREDMAP);
                }
                elseif ( self::startsWith($val, "[]"))
                {
                    return array($key, array(), self::T_LIST);
                }
                elseif ( self::startsWith($val, "{}"))
                {
                    return array($key, array(), self::T_MAP);
                }
                
                if ( $val )
                {
                    $val = trim($val);
                    $valstartswith = $val[0];
                    
                    // quoted value
                    if ('"'==$valstartswith || "'"==$valstartswith || "`"==$valstartswith)
                    {
                        list($val, $rem) = self::getStr($val, $valstartswith);
                    }
                    else
                    {
                        $val = self::removeComment($val, '#', $comm_index);
                    }
                }
            }
            else
            {
                $val = self::removeComment($line, '#', $comm_index);
            }
            return array($key, $val, self::T_VAL);
        }
        // un-quoted string
        else
        {
            $eq_index = strpos($line, '=', 0);
            $key = trim(substr($line, 0, $eq_index));
            $val = substr($line, $eq_index+1);
            
            if ( self::startsWith($val, "[{}]"))
            {
                return array($key, array(), self::T_ORDEREDMAP);
            }
            elseif ( self::startsWith($val, "[]"))
            {
                return array($key, array(), self::T_LIST);
            }
            elseif ( self::startsWith($val, "{}"))
            {
                return array($key, array(), self::T_MAP);
            }
            
            if ( $val )
            {
                $valstartswith = $val[0];
                
                // quoted value
                if ('"'==$valstartswith || "'"==$valstartswith || "`"==$valstartswith)
                {
                    list($val, $rem) = self::getStr($val, $valstartswith);
                }
                else
                {
                    $val = self::removeComment($val, '#');
                }
            }
            
            return array($key, $val, self::T_VAL);
        }
    }
    
    public static function parse( $s )
    {
        // rootObj buffers
        $rootObj = array( );
        
        $ctx = self::Context($rootObj, null, self::T_MAP);
        
        // parse the lines
        $lines = preg_split(self::$RE_NEWLINE, $s);
        $lenlines = count($lines);
        
        // parse it line-by-line
        for ($i=0; $i<$lenlines; $i++)
        {
            // strip the line of comments and extra spaces
            $line = trim( $lines[$i] );
            
            // empty line or comment, skip it
            if ( !strlen($line) || '#'===$line[0] )  continue;
            
            if ( preg_match( self::$RE_ENDBLOCK, $line, $endblock ) )
            {
                $numEnds = count(explode("@", $line))-1;
                
                for ($j=0; $j<$numEnds && $ctx; $j++) $ctx = $ctx->pop();
                
                if ( !$ctx ) $ctx = self::Context($rootObj, null, self::T_MAP);
                continue;
            }
            
            // if any settings need to be stored, store them in the appropriate buffer
            if ( null !== $ctx->buffer )  
            {
                // main block/directive
                if ( !$ctx->block  )
                {
                    $keyval = self::getKeyVal( $line );
                    $currentBlock = $keyval[ 0 ];
                    $currentBuffer =& $ctx->buffer;
                    if ( !isset($currentBuffer[ $currentBlock ]) )
                        $currentBuffer[ $currentBlock ] = $keyval[ 1 ];
                    $ctx = $ctx->push($currentBuffer, $currentBlock, $keyval[ 2 ]);
                }
                else
                {
                    if ( self::T_ORDEREDMAP === $ctx->type )
                    {
                        $keyval = self::getKeyVal( $line );
                        $kvmap = array(); $kvmap[ $keyval[0] ] = $keyval[1];
                        $ctx->buffer[ $ctx->block ][] = $kvmap;
                        $pos = count($ctx->buffer[ $ctx->block ])-1;
                        
                        if ( self::T_LIST === $keyval[2] || self::T_MAP === $keyval[2] || self::T_ORDEREDMAP === $keyval[2] )
                        {
                            $ctx = $ctx->push($ctx->buffer[ $ctx->block ][ $pos ], $keyval[0], $keyval[2]);
                        }
                    }
                    elseif ( self::T_MAP === $ctx->type )
                    {
                        $keyval = self::getKeyVal( $line );
                        $ctx->buffer[ $ctx->block ][ $keyval[0] ] = $keyval[1];
                        
                        if ( self::T_LIST === $keyval[2] || self::T_MAP === $keyval[2] || self::T_ORDEREDMAP === $keyval[2] )
                        {
                            $ctx = $ctx->push($ctx->buffer[ $ctx->block ], $keyval[0], $keyval[2]);
                        }
                    }
                    else if ( self::T_LIST === $ctx->type )
                    {
                        $ctx->buffer[ $ctx->block ][] = self::getVal( $line );
                    }
                    else //if ( self::T_VAL === $ctx->type )
                    {
                        $ctx->buffer[ $ctx->block ] = self::getVal( $line );
                        $ctx = $ctx->pop();
                        if ( !$ctx ) $ctx = self::Context($rootObj, null, self::T_MAP);
                    }
                }
            }
        }
        return $rootObj;
    }
    
    // alias
    public static function fromString( $s )
    {
        return self::parse( $s );
    }
}
Custom_Parser::init();
}