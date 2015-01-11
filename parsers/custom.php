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
class CustomContext
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
    const MAP_ = 1;
    const LIST_ = 2; 
    const ORDEREDMAP_ = 3;
    const VAL_ = 0;
    
    protected static $NL = '/\\n\\r|\\r\\n|\\r|\\n/'; 
    protected static $BLOCK = '/^([a-zA-Z0-9\\-_]+)\\s*(=\\[\\{\\}\\]|=\\[\\]|=\\{\\}|=$)?/';
    protected static $ENDBLOCK = '/^(@\\s*)+/';
    protected static $ACTUAL = array(
        '\\n' => "\n",
        '\\t' => "\t",
        '\\v' => "\v",
        '\\f' => "\f"
    );
    protected static function removeComment($s, $comm) 
    {
        $p = explode($comm, $s);
        return trim( $p[0] );
    }
    
    protected static function parseStr($s, $q)
    {
        $endq = strpos($s, $q, 1);
        $quoted = substr($s, 1, $endq-1);
        $rem = trim(substr($s, $endq));
        foreach (self::$ACTUAL as $c=>$actual)
            $quoted = implode( $actual, explode( $c, $quoted ) );
        $quoted = implode( '\\', explode( '\\\\', $quoted ) );
        return array($quoted, $rem);
    }
    
    protected static function startsWith($s, $prefix) 
    { 
        return ($s && ($prefix==substr($s, 0, strlen($prefix)))); 
    }

    protected static function getQuotedValue( $line )
    {
        $linestartswith = substr($line, 0, 1);
        
        // quoted string
        if ( '"'==$linestartswith || "'"==$linestartswith || "`"==$linestartswith )
        {
            list($key, $line) = self::parseStr($line, $linestartswith);
            return $key;
        }
        // un-quoted string
        else
        {
            return self::removeComment( $line, '#' );
        }
    }
    
    protected static function getKeyValuePair( $line )
    {
        $linestartswith = substr($line, 0, 1);
        
        // quoted string
        if ( '"'==$linestartswith || "'"==$linestartswith || "`"==$linestartswith )
        {
            list($key, $line) = self::parseStr($line, $linestartswith);
            
            // key-value pair
            $eq_index = strpos($line, '=', 0);
            $comm_index = strpos($line, '#', 0);
            if ( false!==$eq_index && (false===$comm_index || $eq_index<$comm_index) )
            {
                $line = explode('=', $line);
                array_shift($line);
                $value = implode('=', $line);
                
                if ( self::startsWith($value, "[{}]"))
                {
                    return array($key, array(), self::ORDEREDMAP_);
                }
                elseif ( self::startsWith($value, "[]"))
                {
                    return array($key, array(), self::LIST_);
                }
                elseif ( self::startsWith($value, "{}"))
                {
                    return array($key, array(), self::MAP_);
                }
                
                if ( $value )
                {
                    $value = trim($value);
                    $valuestartswith = $value[0];
                    
                    // quoted value
                    if ('"'==$valuestartswith || "'"==$valuestartswith || "`"==$valuestartswith)
                    {
                        list($value, $rem) = self::parseStr($value, $valuestartswith);
                    }
                    else
                    {
                        $value = self::removeComment($value, '#');
                    }
                }
            }
            else
            {
                $line = explode('=', $line);
                array_shift($line);
                $value = self::removeComment(implode('=', $line), '#');
            }
            return array($key, $value, self::VAL_);
        }
        // un-quoted string
        else
        {
            $line = explode('=', $line);
            $key = trim( array_shift($line) );
            $value = implode('=', $line);
            
            if ( self::startsWith($value, "[{}]"))
            {
                return array($key, array(), self::ORDEREDMAP_);
            }
            elseif ( self::startsWith($value, "[]"))
            {
                return array($key, array(), self::LIST_);
            }
            elseif ( self::startsWith($value, "{}"))
            {
                return array($key, array(), self::MAP_);
            }
            
            if ( $value )
            {
                $valuestartswith = $value[0];
                
                // quoted value
                if ('"'==$valuestartswith || "'"==$valuestartswith || "`"==$valuestartswith)
                {
                    list($value, $rem) = self::parseStr($value, $valuestartswith);
                }
                else
                {
                    $value = self::removeComment($value, '#');
                }
            }
            
            return array($key, $value, self::VAL_);
        }
    }
    
    public static function fromString($s)
    {
        // settings buffers
        $settings = array( );
        
        $ctx = new CustomContext($settings, null, self::MAP_);
        
        // parse the lines
        $lines = preg_split(self::$NL, $s);
        $lenlines = count($lines);
        
        // parse it line-by-line
        for ($i=0; $i<$lenlines; $i++)
        {
            // strip the line of comments and extra spaces
            $line = trim( $lines[$i] );
            
            // comment or empty line, skip it
            if ( !strlen($line) || '#'==$line[0] )  continue;
            
            $linestartswith = substr($line, 0, 1);
            
            // block/directive line, parse it
            if ( !$ctx->block && ($matchblock = preg_match( self::$BLOCK, $line, $block )) )
            {
                $currentBlock = $block[1];
                if ( !isset($block[2]) || !$block[2] || '='==$block[2] ) $isType = self::VAL_;
                else if ( '=[{}]'==$block[2] ) $isType = self::ORDEREDMAP_;
                else if ( '=[]'==$block[2] ) $isType = self::LIST_;
                else if ( '={}'==$block[2] ) $isType = self::MAP_;
                
                $currentBuffer =& $ctx->buffer;
                if ( !isset($currentBuffer[ $currentBlock ]) )
                {
                    if (self::LIST_ == $isType || self::MAP_ == $isType || self::ORDEREDMAP_ == $isType)
                        $currentBuffer[ $currentBlock ] = array();
                    else
                        $currentBuffer[ $currentBlock ] = '';
                }
                $ctx = $ctx->push($currentBuffer, $currentBlock, $isType);
                continue;
            }
            else if ( $matchendblock = preg_match( self::$ENDBLOCK, $line, $endblock ) )
            {
                $numEnds = count(explode("@", $line))-1;
                
                for ($j=0; $j<$numEnds && $ctx; $j++)
                    $ctx = $ctx->pop();
                
                if ( !$ctx ) $ctx = new CustomContext($settings, null, self::MAP_);
                continue;
            }
            
            // if any settings need to be stored, store them in the appropriate buffer
            if ( $ctx->block && $ctx->buffer )  
            {
                if ( self::ORDEREDMAP_ == $ctx->type )
                {
                    $keyval = self::getKeyValuePair( $line );
                    $kvmap = array(); $kvmap[ $keyval[0] ] = $keyval[1];
                    $ctx->buffer[ $ctx->block ][] = $kvmap;
                    $pos = count($ctx->buffer[ $ctx->block ])-1;
                    
                    if ( self::LIST_ == $keyval[2] || self::MAP_ == $keyval[2] || self::ORDEREDMAP_ == $keyval[2] )
                    {
                        $ctx = $ctx->push($ctx->buffer[ $ctx->block ][ $pos ], $keyval[0], $keyval[2]);
                    }
                }
                elseif ( self::MAP_ == $ctx->type )
                {
                    $keyval = self::getKeyValuePair( $line );
                    $ctx->buffer[ $ctx->block ][ $keyval[0] ] = $keyval[1];
                    
                    if ( self::LIST_ == $keyval[2] || self::MAP_ == $keyval[2] || self::ORDEREDMAP_ == $keyval[2] )
                    {
                        $ctx = $ctx->push($ctx->buffer[ $ctx->block ], $keyval[0], $keyval[2]);
                    }
                }
                else if ( self::LIST_ == $ctx->type )
                {
                    $ctx->buffer[ $ctx->block ][] = self::getQuotedValue( $line );
                }
                else //if ( VAL == isType )
                {
                    $ctx->buffer[ $ctx->block ] = self::getQuotedValue( $line );
                    $ctx = $ctx->pop();
                    if ( !$ctx ) $ctx = new CustomContext($settings, null, self::MAP_);
                }
            }
        }
        return $settings;
    }
    
    public static function fromFile($filename)
    {
        return self::fromString( file_get_contents($filename) );
    }
}
}