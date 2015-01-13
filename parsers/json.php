<?php
/**
*
*   JSON Parser for PHP 5.2+
*
*   @author Nikos M.  
*   https://foo123.github.com/
*   http://nikos-web-development.netai.net/
*
**/
if (!class_exists('Json_Parser'))
{

class Json_Parser
{
    public static function parse($s)
    {
        return json_decode( $s );
    }
}
}