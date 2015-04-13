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
    const T_KEYVAL = 2;
    const T_MAP = 4;
    const T_LIST = 8;
    const T_ORDEREDMAP = 16;
    const T_STRUCTURED = 28; //T_LIST | T_MAP | T_ORDEREDMAP
    
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
        $rem = substr($s, $i);
        if ( false !== $and_un_escape )
        {
            foreach (self::$ESC as $unesc)
                $quoted = str_replace($unesc[0], $unesc[1], $quoted);
            $quoted = str_replace('\\\\', '\\', $quoted);
        }
        return array($quoted, trim($rem));
    }
    
    protected static function startsWith($str, $pre, $pos=0) 
    { 
        return (bool)($str && ($pre === substr($str, $pos, strlen($pre)))); 
    }

    /*protected static function getVal( $line )
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
    }*/
    
    protected static function getKeyVal( $line )
    {
        $linestartswith = $line[0];
        
        // quoted string
        if ( '"'==$linestartswith || "'"==$linestartswith || "`"==$linestartswith )
        {
            list($key, $line) = self::getStr($line, $linestartswith);
            
            // key-value pair
            $eq_index = strpos($line, '=', 0);
            
            if ( strlen($line) && 0 === $eq_index )
            {
                $comm_index = strpos($line, '#', 0);
                if ( false === $comm_index || $eq_index < $comm_index )
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
                            $val = self::removeComment($val, '#');
                        }
                    }
                }
                else
                {
                    $val = self::removeComment($line, '#', $comm_index);
                }
                return array($key, $val, self::T_KEYVAL);
            }
            else
            {
                // just value, no key-val pair
                return array(null, $key, self::T_VAL);
            }
        }
        // un-quoted string
        else
        {
            $eq_index = strpos($line, '=', 0);
            if ( false !== $eq_index )
            {
                $key = trim(substr($line, 0, $eq_index));
                $val = substr($line, $eq_index+1);
                
                if ( !strlen($key) ) $key = null;
                
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
                        $val = self::removeComment($val, '#');
                    }
                }
                
                return array($key, $val, self::T_KEYVAL);
            }
            else
            {
                // just value, no key-val pair
                return array(null, self::removeComment($line, '#'), self::T_VAL);
            }
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
                list($entry_key,$entry_val,$entry_type) = self::getKeyVal( $line );
                
                // main block/directive
                if ( null === $ctx->block  )
                {
                    $currentBlock = $entry_key;
                    $currentBuffer =& $ctx->buffer;
                    if ( !isset($currentBuffer[ $currentBlock ]) )
                        $currentBuffer[ $currentBlock ] = $entry_val;
                    $ctx = $ctx->push($currentBuffer, $currentBlock, $entry_type);
                }
                else
                {
                    if ( self::T_ORDEREDMAP === $ctx->type )
                    {
                        $keyval_pair = array(); $keyval_pair[ $entry_key ] = $entry_val;
                        $index = count($ctx->buffer[ $ctx->block ]);
                        array_push($ctx->buffer[ $ctx->block ], $keyval_pair);
                        
                        if ( self::T_STRUCTURED & $entry_type )
                        {
                            $ctx = $ctx->push($ctx->buffer[ $ctx->block ][ $index ], $entry_key, $entry_type);
                        }
                    }
                    elseif ( self::T_MAP === $ctx->type )
                    {
                        $ctx->buffer[ $ctx->block ][ $entry_key ] = $entry_val;
                        
                        if ( self::T_STRUCTURED & $entry_type )
                        {
                            $ctx = $ctx->push($ctx->buffer[ $ctx->block ], $entry_key, $entry_type);
                        }
                    }
                    else if ( self::T_LIST === $ctx->type )
                    {
                        if ( self::T_STRUCTURED & $entry_type )
                        {
                            $index = count($ctx->buffer[ $ctx->block ]);
                            array_push($ctx->buffer[ $ctx->block ], $entry_val);
                            $ctx = $ctx->push($ctx->buffer[ $ctx->block ], $index, $entry_type);
                        }
                        else
                        {
                            array_push($ctx->buffer[ $ctx->block ], $entry_val);
                        }
                    }
                    else //if ( self::T_VAL === $ctx->type )
                    {
                        $ctx->buffer[ $ctx->block ] = $entry_val;
                        $ctx = $ctx->pop();
                        if ( !$ctx ) $ctx = self::Context($rootObj, null, self::T_MAP);
                    }
                }
            }
        }
        return $rootObj;
    }
}
Custom_Parser::init();
}