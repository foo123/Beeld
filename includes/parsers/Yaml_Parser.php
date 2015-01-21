<?php

/*
*   Symfony Yaml parser by (c) Fabien Potencier <fabien@symfony.com>
*   adapted into a standalone mode
*
*
*/

/**
 * Exception interface for all exceptions thrown by the component.
 *
 * @author Fabien Potencier <fabien@symfony.com>
 *
 * @api
 */
interface YamlExceptionInterface
{
}

/**
 * Exception class thrown when an error occurs during parsing.
 *
 * @author Romain Neutron <imprec@gmail.com>
 *
 * @api
 */
class YamlRuntimeException extends \RuntimeException implements YamlExceptionInterface
{
}

/**
 * Exception class thrown when an error occurs during parsing.
 *
 * @author Fabien Potencier <fabien@symfony.com>
 *
 * @api
 */
class YamlParseException extends YamlRuntimeException
{
    private $parsedFile;
    private $parsedLine;
    private $snippet;
    private $rawMessage;

    /**
     * Constructor.
     *
     * @param string    $message    The error message
     * @param integer   $parsedLine The line where the error occurred
     * @param integer   $snippet    The snippet of code near the problem
     * @param string    $parsedFile The file name where the error occurred
     * @param \Exception $previous   The previous exception
     */
    public function __construct($message, $parsedLine = -1, $snippet = null, $parsedFile = null, \Exception $previous = null)
    {
        $this->parsedFile = $parsedFile;
        $this->parsedLine = $parsedLine;
        $this->snippet = $snippet;
        $this->rawMessage = $message;

        $this->updateRepr();

        parent::__construct($this->message, 0, $previous);
    }

    /**
     * Gets the snippet of code near the error.
     *
     * @return string The snippet of code
     */
    public function getSnippet()
    {
        return $this->snippet;
    }

    /**
     * Sets the snippet of code near the error.
     *
     * @param string $snippet The code snippet
     */
    public function setSnippet($snippet)
    {
        $this->snippet = $snippet;

        $this->updateRepr();
    }

    /**
     * Gets the filename where the error occurred.
     *
     * This method returns null if a string is parsed.
     *
     * @return string The filename
     */
    public function getParsedFile()
    {
        return $this->parsedFile;
    }

    /**
     * Sets the filename where the error occurred.
     *
     * @param string $parsedFile The filename
     */
    public function setParsedFile($parsedFile)
    {
        $this->parsedFile = $parsedFile;

        $this->updateRepr();
    }

    /**
     * Gets the line where the error occurred.
     *
     * @return integer The file line
     */
    public function getParsedLine()
    {
        return $this->parsedLine;
    }

    /**
     * Sets the line where the error occurred.
     *
     * @param integer $parsedLine The file line
     */
    public function setParsedLine($parsedLine)
    {
        $this->parsedLine = $parsedLine;

        $this->updateRepr();
    }

    private function updateRepr()
    {
        $this->message = $this->rawMessage;

        $dot = false;
        if ('.' === substr($this->message, -1)) {
            $this->message = substr($this->message, 0, -1);
            $dot = true;
        }

        if (null !== $this->parsedFile) {
            $this->message .= sprintf(' in %s', json_encode($this->parsedFile, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        }

        if ($this->parsedLine >= 0) {
            $this->message .= sprintf(' at line %d', $this->parsedLine);
        }

        if ($this->snippet) {
            $this->message .= sprintf(' (near "%s")', $this->snippet);
        }

        if ($dot) {
            $this->message .= '.';
        }
    }
}

/**
 * Exception class thrown when an error occurs during dumping.
 *
 * @author Fabien Potencier <fabien@symfony.com>
 *
 * @api
 */
class YamlDumpException extends YamlRuntimeException
{
}

/**
 * Escaper encapsulates escaping rules for single and double-quoted
 * YAML strings.
 *
 * @author Matthew Lewinski <matthew@lewinski.org>
 */
class YamlEscaper
{
    // Characters that would cause a dumped string to require double quoting.
    const REGEX_CHARACTER_TO_ESCAPE = "[\\x00-\\x1f]|\xc2\x85|\xc2\xa0|\xe2\x80\xa8|\xe2\x80\xa9";

    // Mapping arrays for escaping a double quoted string. The backslash is
    // first to ensure proper escaping because str_replace operates iteratively
    // on the input arrays. This ordering of the characters avoids the use of strtr,
    // which performs more slowly.
    private static $escapees = array('\\\\', '\\"', '"',
                                     "\x00",  "\x01",  "\x02",  "\x03",  "\x04",  "\x05",  "\x06",  "\x07",
                                     "\x08",  "\x09",  "\x0a",  "\x0b",  "\x0c",  "\x0d",  "\x0e",  "\x0f",
                                     "\x10",  "\x11",  "\x12",  "\x13",  "\x14",  "\x15",  "\x16",  "\x17",
                                     "\x18",  "\x19",  "\x1a",  "\x1b",  "\x1c",  "\x1d",  "\x1e",  "\x1f",
                                     "\xc2\x85", "\xc2\xa0", "\xe2\x80\xa8", "\xe2\x80\xa9");
    private static $escaped  = array('\\"', '\\\\', '\\"',
                                     "\\0",   "\\x01", "\\x02", "\\x03", "\\x04", "\\x05", "\\x06", "\\a",
                                     "\\b",   "\\t",   "\\n",   "\\v",   "\\f",   "\\r",   "\\x0e", "\\x0f",
                                     "\\x10", "\\x11", "\\x12", "\\x13", "\\x14", "\\x15", "\\x16", "\\x17",
                                     "\\x18", "\\x19", "\\x1a", "\\e",   "\\x1c", "\\x1d", "\\x1e", "\\x1f",
                                     "\\N", "\\_", "\\L", "\\P");

    /**
     * Determines if a PHP value would require double quoting in YAML.
     *
     * @param string $value A PHP value
     *
     * @return Boolean True if the value would require double quotes.
     */
    public static function requiresDoubleQuoting($value)
    {
        return preg_match('/'.self::REGEX_CHARACTER_TO_ESCAPE.'/u', $value);
    }

    /**
     * Escapes and surrounds a PHP value with double quotes.
     *
     * @param string $value A PHP value
     *
     * @return string The quoted, escaped string
     */
    public static function escapeWithDoubleQuotes($value)
    {
        return sprintf('"%s"', str_replace(self::$escapees, self::$escaped, $value));
    }

    /**
     * Determines if a PHP value would require single quoting in YAML.
     *
     * @param string $value A PHP value
     *
     * @return Boolean True if the value would require single quotes.
     */
    public static function requiresSingleQuoting($value)
    {
        return preg_match('/[ \s \' " \: \{ \} \[ \] , & \* \# \?] | \A[ \- ? | < > = ! % @ ` ]/x', $value);
    }

    /**
     * Escapes and surrounds a PHP value with single quotes.
     *
     * @param string $value A PHP value
     *
     * @return string The quoted, escaped string
     */
    public static function escapeWithSingleQuotes($value)
    {
        return sprintf("'%s'", str_replace('\'', '\'\'', $value));
    }
}

/**
 * Unescaper encapsulates unescaping rules for single and double-quoted
 * YAML strings.
 *
 * @author Matthew Lewinski <matthew@lewinski.org>
 */
class YamlUnescaper
{
    // Parser and Inline assume UTF-8 encoding, so escaped Unicode characters
    // must be converted to that encoding.
    const ENCODING = 'UTF-8';

    // Regex fragment that matches an escaped character in a double quoted
    // string.
    const REGEX_ESCAPED_CHARACTER = "\\\\([0abt\tnvfre \\\"\\/\\\\N_LP]|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})";

    /**
     * Unescapes a single quoted string.
     *
     * @param string $value A single quoted string.
     *
     * @return string The unescaped string.
     */
    public function unescapeSingleQuotedString($value)
    {
        return str_replace('\'\'', '\'', $value);
    }

    /**
     * Unescapes a double quoted string.
     *
     * @param string $value A double quoted string.
     *
     * @return string The unescaped string.
     */
    public function unescapeDoubleQuotedString($value)
    {
        $self = $this;
        $callback = function($match) use ($self) {
            return $self->unescapeCharacter($match[0]);
        };

        // evaluate the string
        return preg_replace_callback('/'.self::REGEX_ESCAPED_CHARACTER.'/u', $callback, $value);
    }

    /**
     * Unescapes a character that was found in a double-quoted string
     *
     * @param string $value An escaped character
     *
     * @return string The unescaped character
     */
    public function unescapeCharacter($value)
    {
        switch ($value{1}) {
            case '0':
                return "\x0";
            case 'a':
                return "\x7";
            case 'b':
                return "\x8";
            case 't':
                return "\t";
            case "\t":
                return "\t";
            case 'n':
                return "\n";
            case 'v':
                return "\xb";
            case 'f':
                return "\xc";
            case 'r':
                return "\xd";
            case 'e':
                return "\x1b";
            case ' ':
                return ' ';
            case '"':
                return '"';
            case '/':
                return '/';
            case '\\':
                return '\\';
            case 'N':
                // U+0085 NEXT LINE
                return $this->convertEncoding("\x00\x85", self::ENCODING, 'UCS-2BE');
            case '_':
                // U+00A0 NO-BREAK SPACE
                return $this->convertEncoding("\x00\xA0", self::ENCODING, 'UCS-2BE');
            case 'L':
                // U+2028 LINE SEPARATOR
                return $this->convertEncoding("\x20\x28", self::ENCODING, 'UCS-2BE');
            case 'P':
                // U+2029 PARAGRAPH SEPARATOR
                return $this->convertEncoding("\x20\x29", self::ENCODING, 'UCS-2BE');
            case 'x':
                $char = pack('n', hexdec(substr($value, 2, 2)));

                return $this->convertEncoding($char, self::ENCODING, 'UCS-2BE');
            case 'u':
                $char = pack('n', hexdec(substr($value, 2, 4)));

                return $this->convertEncoding($char, self::ENCODING, 'UCS-2BE');
            case 'U':
                $char = pack('N', hexdec(substr($value, 2, 8)));

                return $this->convertEncoding($char, self::ENCODING, 'UCS-4BE');
        }
    }

    /**
     * Convert a string from one encoding to another.
     *
     * @param string $value The string to convert
     * @param string $to    The input encoding
     * @param string $from  The output encoding
     *
     * @return string The string with the new encoding
     *
     * @throws \RuntimeException if no suitable encoding function is found (iconv or mbstring)
     */
    private function convertEncoding($value, $to, $from)
    {
        if (function_exists('mb_convert_encoding')) {
            return mb_convert_encoding($value, $to, $from);
        } elseif (function_exists('iconv')) {
            return iconv($from, $to, $value);
        }

        throw new \RuntimeException('No suitable convert encoding function (install the iconv or mbstring extension).');
    }
}

/**
 * Inline implements a YAML parser/dumper for the YAML inline syntax.
 *
 * @author Fabien Potencier <fabien@symfony.com>
 */
class YamlInline
{
    const REGEX_QUOTED_STRING = '(?:"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"|\'([^\']*(?:\'\'[^\']*)*)\')';

    private static $exceptionOnInvalidType = false;
    private static $objectSupport = false;

    /**
     * Converts a YAML string to a PHP array.
     *
     * @param string  $value                  A YAML string
     * @param Boolean $exceptionOnInvalidType true if an exception must be thrown on invalid types (a PHP resource or object), false otherwise
     * @param Boolean $objectSupport          true if object support is enabled, false otherwise
     *
     * @return array A PHP array representing the YAML string
     *
     * @throws ParseException
     */
    public static function parse($value, $exceptionOnInvalidType = false, $objectSupport = false)
    {
        self::$exceptionOnInvalidType = $exceptionOnInvalidType;
        self::$objectSupport = $objectSupport;

        $value = trim($value);

        if (0 == strlen($value)) {
            return '';
        }

        if (function_exists('mb_internal_encoding') && ((int) ini_get('mbstring.func_overload')) & 2) {
            $mbEncoding = mb_internal_encoding();
            mb_internal_encoding('ASCII');
        }

        $i = 0;
        switch ($value[0]) {
            case '[':
                $result = self::parseSequence($value, $i);
                ++$i;
                break;
            case '{':
                $result = self::parseMapping($value, $i);
                ++$i;
                break;
            default:
                $result = self::parseScalar($value, null, array('"', "'"), $i);
        }

        // some comments are allowed at the end
        if (preg_replace('/\s+#.*$/A', '', substr($value, $i))) {
            throw new YamlParseException(sprintf('Unexpected characters near "%s".', substr($value, $i)));
        }

        if (isset($mbEncoding)) {
            mb_internal_encoding($mbEncoding);
        }

        return $result;
    }

    /**
     * Dumps a given PHP variable to a YAML string.
     *
     * @param mixed   $value                  The PHP variable to convert
     * @param Boolean $exceptionOnInvalidType true if an exception must be thrown on invalid types (a PHP resource or object), false otherwise
     * @param Boolean $objectSupport          true if object support is enabled, false otherwise
     *
     * @return string The YAML string representing the PHP array
     *
     * @throws DumpException When trying to dump PHP resource
     */
    public static function dump($value, $exceptionOnInvalidType = false, $objectSupport = false)
    {
        switch (true) {
            case is_resource($value):
                if ($exceptionOnInvalidType) {
                    throw new YamlDumpException(sprintf('Unable to dump PHP resources in a YAML file ("%s").', get_resource_type($value)));
                }

                return 'null';
            case is_object($value):
                if ($objectSupport) {
                    return '!!php/object:'.serialize($value);
                }

                if ($exceptionOnInvalidType) {
                    throw new YamlDumpException('Object support when dumping a YAML file has been disabled.');
                }

                return 'null';
            case is_array($value):
                return self::dumpArray($value, $exceptionOnInvalidType, $objectSupport);
            case null === $value:
                return 'null';
            case true === $value:
                return 'true';
            case false === $value:
                return 'false';
            case ctype_digit($value):
                return is_string($value) ? "'$value'" : (int) $value;
            case is_numeric($value):
                $locale = setlocale(LC_NUMERIC, 0);
                if (false !== $locale) {
                    setlocale(LC_NUMERIC, 'C');
                }
                $repr = is_string($value) ? "'$value'" : (is_infinite($value) ? str_ireplace('INF', '.Inf', strval($value)) : strval($value));

                if (false !== $locale) {
                    setlocale(LC_NUMERIC, $locale);
                }

                return $repr;
            case YamlEscaper::requiresDoubleQuoting($value):
                return YamlEscaper::escapeWithDoubleQuotes($value);
            case YamlEscaper::requiresSingleQuoting($value):
                return YamlEscaper::escapeWithSingleQuotes($value);
            case '' == $value:
                return "''";
            case preg_match(self::getTimestampRegex(), $value):
            case in_array(strtolower($value), array('null', '~', 'true', 'false')):
                return "'$value'";
            default:
                return $value;
        }
    }

    /**
     * Dumps a PHP array to a YAML string.
     *
     * @param array   $value                  The PHP array to dump
     * @param Boolean $exceptionOnInvalidType true if an exception must be thrown on invalid types (a PHP resource or object), false otherwise
     * @param Boolean $objectSupport          true if object support is enabled, false otherwise
     *
     * @return string The YAML string representing the PHP array
     */
    private static function dumpArray($value, $exceptionOnInvalidType, $objectSupport)
    {
        // array
        $keys = array_keys($value);
        if ((1 == count($keys) && '0' == $keys[0])
            || (count($keys) > 1 && array_reduce($keys, function ($v, $w) { return (integer) $v + $w; }, 0) == count($keys) * (count($keys) - 1) / 2)
        ) {
            $output = array();
            foreach ($value as $val) {
                $output[] = self::dump($val, $exceptionOnInvalidType, $objectSupport);
            }

            return sprintf('[%s]', implode(', ', $output));
        }

        // mapping
        $output = array();
        foreach ($value as $key => $val) {
            $output[] = sprintf('%s: %s', self::dump($key, $exceptionOnInvalidType, $objectSupport), self::dump($val, $exceptionOnInvalidType, $objectSupport));
        }

        return sprintf('{ %s }', implode(', ', $output));
    }

    /**
     * Parses a scalar to a YAML string.
     *
     * @param scalar $scalar
     * @param string $delimiters
     * @param array  $stringDelimiters
     * @param integer &$i
     * @param Boolean $evaluate
     *
     * @return string A YAML string
     *
     * @throws ParseException When malformed inline YAML string is parsed
     */
    public static function parseScalar($scalar, $delimiters = null, $stringDelimiters = array('"', "'"), &$i = 0, $evaluate = true)
    {
        if (in_array($scalar[$i], $stringDelimiters)) {
            // quoted scalar
            $output = self::parseQuotedScalar($scalar, $i);

            if (null !== $delimiters) {
                $tmp = ltrim(substr($scalar, $i), ' ');
                if (!in_array($tmp[0], $delimiters)) {
                    throw new YamlParseException(sprintf('Unexpected characters (%s).', substr($scalar, $i)));
                }
            }
        } else {
            // "normal" string
            if (!$delimiters) {
                $output = substr($scalar, $i);
                $i += strlen($output);

                // remove comments
                if (false !== $strpos = strpos($output, ' #')) {
                    $output = rtrim(substr($output, 0, $strpos));
                }
            } elseif (preg_match('/^(.+?)('.implode('|', $delimiters).')/', substr($scalar, $i), $match)) {
                $output = $match[1];
                $i += strlen($output);
            } else {
                throw new YamlParseException(sprintf('Malformed inline YAML string (%s).', $scalar));
            }

            $output = $evaluate ? self::evaluateScalar($output) : $output;
        }

        return $output;
    }

    /**
     * Parses a quoted scalar to YAML.
     *
     * @param string $scalar
     * @param integer &$i
     *
     * @return string A YAML string
     *
     * @throws ParseException When malformed inline YAML string is parsed
     */
    private static function parseQuotedScalar($scalar, &$i)
    {
        if (!preg_match('/'.self::REGEX_QUOTED_STRING.'/Au', substr($scalar, $i), $match)) {
            throw new YamlParseException(sprintf('Malformed inline YAML string (%s).', substr($scalar, $i)));
        }

        $output = substr($match[0], 1, strlen($match[0]) - 2);

        $unescaper = new YamlUnescaper();
        if ('"' == $scalar[$i]) {
            $output = $unescaper->unescapeDoubleQuotedString($output);
        } else {
            $output = $unescaper->unescapeSingleQuotedString($output);
        }

        $i += strlen($match[0]);

        return $output;
    }

    /**
     * Parses a sequence to a YAML string.
     *
     * @param string $sequence
     * @param integer &$i
     *
     * @return string A YAML string
     *
     * @throws ParseException When malformed inline YAML string is parsed
     */
    private static function parseSequence($sequence, &$i = 0)
    {
        $output = array();
        $len = strlen($sequence);
        $i += 1;

        // [foo, bar, ...]
        while ($i < $len) {
            switch ($sequence[$i]) {
                case '[':
                    // nested sequence
                    $output[] = self::parseSequence($sequence, $i);
                    break;
                case '{':
                    // nested mapping
                    $output[] = self::parseMapping($sequence, $i);
                    break;
                case ']':
                    return $output;
                case ',':
                case ' ':
                    break;
                default:
                    $isQuoted = in_array($sequence[$i], array('"', "'"));
                    $value = self::parseScalar($sequence, array(',', ']'), array('"', "'"), $i);

                    if (!$isQuoted && false !== strpos($value, ': ')) {
                        // embedded mapping?
                        try {
                            $value = self::parseMapping('{'.$value.'}');
                        } catch (\InvalidArgumentException $e) {
                            // no, it's not
                        }
                    }

                    $output[] = $value;

                    --$i;
            }

            ++$i;
        }

        throw new YamlParseException(sprintf('Malformed inline YAML string %s', $sequence));
    }

    /**
     * Parses a mapping to a YAML string.
     *
     * @param string $mapping
     * @param integer &$i
     *
     * @return string A YAML string
     *
     * @throws ParseException When malformed inline YAML string is parsed
     */
    private static function parseMapping($mapping, &$i = 0)
    {
        $output = array();
        $len = strlen($mapping);
        $i += 1;

        // {foo: bar, bar:foo, ...}
        while ($i < $len) {
            switch ($mapping[$i]) {
                case ' ':
                case ',':
                    ++$i;
                    continue 2;
                case '}':
                    return $output;
            }

            // key
            $key = self::parseScalar($mapping, array(':', ' '), array('"', "'"), $i, false);

            // value
            $done = false;
            while ($i < $len) {
                switch ($mapping[$i]) {
                    case '[':
                        // nested sequence
                        $output[$key] = self::parseSequence($mapping, $i);
                        $done = true;
                        break;
                    case '{':
                        // nested mapping
                        $output[$key] = self::parseMapping($mapping, $i);
                        $done = true;
                        break;
                    case ':':
                    case ' ':
                        break;
                    default:
                        $output[$key] = self::parseScalar($mapping, array(',', '}'), array('"', "'"), $i);
                        $done = true;
                        --$i;
                }

                ++$i;

                if ($done) {
                    continue 2;
                }
            }
        }

        throw new YamlParseException(sprintf('Malformed inline YAML string %s', $mapping));
    }

    /**
     * Evaluates scalars and replaces magic values.
     *
     * @param string $scalar
     *
     * @return string A YAML string
     */
    private static function evaluateScalar($scalar)
    {
        $scalar = trim($scalar);

        switch (true) {
            case 'null' == strtolower($scalar):
            case '' == $scalar:
            case '~' == $scalar:
                return null;
            case 0 === strpos($scalar, '!str'):
                return (string) substr($scalar, 5);
            case 0 === strpos($scalar, '! '):
                return intval(self::parseScalar(substr($scalar, 2)));
            case 0 === strpos($scalar, '!!php/object:'):
                if (self::$objectSupport) {
                    return unserialize(substr($scalar, 13));
                }

                if (self::$exceptionOnInvalidType) {
                    throw new YamlParseException('Object support when parsing a YAML file has been disabled.');
                }

                return null;
            case ctype_digit($scalar):
                $raw = $scalar;
                $cast = intval($scalar);

                return '0' == $scalar[0] ? octdec($scalar) : (((string) $raw == (string) $cast) ? $cast : $raw);
            case '-' === $scalar[0] && ctype_digit(substr($scalar, 1)):
                $raw = $scalar;
                $cast = intval($scalar);

                return '0' == $scalar[1] ? octdec($scalar) : (((string) $raw == (string) $cast) ? $cast : $raw);
            case 'true' === strtolower($scalar):
                return true;
            case 'false' === strtolower($scalar):
                return false;
            case is_numeric($scalar):
                return '0x' == $scalar[0].$scalar[1] ? hexdec($scalar) : floatval($scalar);
            case 0 == strcasecmp($scalar, '.inf'):
            case 0 == strcasecmp($scalar, '.NaN'):
                return -log(0);
            case 0 == strcasecmp($scalar, '-.inf'):
                return log(0);
            case preg_match('/^(-|\+)?[0-9,]+(\.[0-9]+)?$/', $scalar):
                return floatval(str_replace(',', '', $scalar));
            case preg_match(self::getTimestampRegex(), $scalar):
                return strtotime($scalar);
            default:
                return (string) $scalar;
        }
    }

    /**
     * Gets a regex that matches a YAML date.
     *
     * @return string The regular expression
     *
     * @see http://www.yaml.org/spec/1.2/spec.html#id2761573
     */
    private static function getTimestampRegex()
    {
        return <<<EOF
        ~^
        (?P<year>[0-9][0-9][0-9][0-9])
        -(?P<month>[0-9][0-9]?)
        -(?P<day>[0-9][0-9]?)
        (?:(?:[Tt]|[ \t]+)
        (?P<hour>[0-9][0-9]?)
        :(?P<minute>[0-9][0-9])
        :(?P<second>[0-9][0-9])
        (?:\.(?P<fraction>[0-9]*))?
        (?:[ \t]*(?P<tz>Z|(?P<tz_sign>[-+])(?P<tz_hour>[0-9][0-9]?)
        (?::(?P<tz_minute>[0-9][0-9]))?))?)?
        $~x
EOF;
    }
}

/**
 * Parser parses YAML strings to convert them to PHP arrays.
 *
 * @author Fabien Potencier <fabien@symfony.com>
 */
class YamlParser
{
    const FOLDED_SCALAR_PATTERN = '(?P<separator>\||>)(?P<modifiers>\+|\-|\d+|\+\d+|\-\d+|\d+\+|\d+\-)?(?P<comments> +#.*)?';

    private $offset         = 0;
    private $lines          = array();
    private $currentLineNb  = -1;
    private $currentLine    = '';
    private $refs           = array();

    /**
     * Constructor
     *
     * @param integer $offset The offset of YAML document (used for line numbers in error messages)
     */
    public function __construct($offset = 0)
    {
        $this->offset = $offset;
    }

    /**
     * Parses a YAML string to a PHP value.
     *
     * @param string  $value                  A YAML string
     * @param Boolean $exceptionOnInvalidType true if an exception must be thrown on invalid types (a PHP resource or object), false otherwise
     * @param Boolean $objectSupport          true if object support is enabled, false otherwise
     *
     * @return mixed  A PHP value
     *
     * @throws ParseException If the YAML is not valid
     */
    public function parse($value, $exceptionOnInvalidType = false, $objectSupport = false)
    {
        $this->currentLineNb = -1;
        $this->currentLine = '';
        $this->lines = explode("\n", $this->cleanup($value));

        if (function_exists('mb_detect_encoding') && false === mb_detect_encoding($value, 'UTF-8', true)) {
            throw new YamlParseException('The YAML value does not appear to be valid UTF-8.');
        }

        if (function_exists('mb_internal_encoding') && ((int) ini_get('mbstring.func_overload')) & 2) {
            $mbEncoding = mb_internal_encoding();
            mb_internal_encoding('UTF-8');
        }

        $data = array();
        $context = null;
        while ($this->moveToNextLine()) {
            if ($this->isCurrentLineEmpty()) {
                continue;
            }

            // tab?
            if ("\t" === $this->currentLine[0]) {
                throw new YamlParseException('A YAML file cannot contain tabs as indentation.', $this->getRealCurrentLineNb() + 1, $this->currentLine);
            }

            $isRef = $isInPlace = $isProcessed = false;
            if (preg_match('#^\-((?P<leadspaces>\s+)(?P<value>.+?))?\s*$#u', $this->currentLine, $values)) {
                if ($context && 'mapping' == $context) {
                    throw new YamlParseException('You cannot define a sequence item when in a mapping');
                }
                $context = 'sequence';

                if (isset($values['value']) && preg_match('#^&(?P<ref>[^ ]+) *(?P<value>.*)#u', $values['value'], $matches)) {
                    $isRef = $matches['ref'];
                    $values['value'] = $matches['value'];
                }

                // array
                if (!isset($values['value']) || '' == trim($values['value'], ' ') || 0 === strpos(ltrim($values['value'], ' '), '#')) {
                    $c = $this->getRealCurrentLineNb() + 1;
                    $parser = new YamlParser($c);
                    $parser->refs =& $this->refs;
                    $data[] = $parser->parse($this->getNextEmbedBlock(), $exceptionOnInvalidType, $objectSupport);
                } else {
                    if (isset($values['leadspaces'])
                        && ' ' == $values['leadspaces']
                        && preg_match('#^(?P<key>'.YamlInline::REGEX_QUOTED_STRING.'|[^ \'"\{\[].*?) *\:(\s+(?P<value>.+?))?\s*$#u', $values['value'], $matches)
                    ) {
                        // this is a compact notation element, add to next block and parse
                        $c = $this->getRealCurrentLineNb();
                        $parser = new YamlParser($c);
                        $parser->refs =& $this->refs;

                        $block = $values['value'];
                        if ($this->isNextLineIndented()) {
                            $block .= "\n".$this->getNextEmbedBlock($this->getCurrentLineIndentation() + 2);
                        }

                        $data[] = $parser->parse($block, $exceptionOnInvalidType, $objectSupport);
                    } else {
                        $data[] = $this->parseValue($values['value'], $exceptionOnInvalidType, $objectSupport);
                    }
                }
            } elseif (preg_match('#^(?P<key>'.YamlInline::REGEX_QUOTED_STRING.'|[^ \'"\[\{].*?) *\:(\s+(?P<value>.+?))?\s*$#u', $this->currentLine, $values) && false === strpos($values['key'],' #')) {
                if ($context && 'sequence' == $context) {
                    throw new YamlParseException('You cannot define a mapping item when in a sequence');
                }
                $context = 'mapping';

                // force correct settings
                YamlInline::parse(null, $exceptionOnInvalidType, $objectSupport);
                try {
                    $key = YamlInline::parseScalar($values['key']);
                } catch (YamlParseException $e) {
                    $e->setParsedLine($this->getRealCurrentLineNb() + 1);
                    $e->setSnippet($this->currentLine);

                    throw $e;
                }

                if ('<<' === $key) {
                    if (isset($values['value']) && 0 === strpos($values['value'], '*')) {
                        $isInPlace = substr($values['value'], 1);
                        if (!array_key_exists($isInPlace, $this->refs)) {
                            throw new YamlParseException(sprintf('Reference "%s" does not exist.', $isInPlace), $this->getRealCurrentLineNb() + 1, $this->currentLine);
                        }
                    } else {
                        if (isset($values['value']) && $values['value'] !== '') {
                            $value = $values['value'];
                        } else {
                            $value = $this->getNextEmbedBlock();
                        }
                        $c = $this->getRealCurrentLineNb() + 1;
                        $parser = new YamlParser($c);
                        $parser->refs =& $this->refs;
                        $parsed = $parser->parse($value, $exceptionOnInvalidType, $objectSupport);

                        $merged = array();
                        if (!is_array($parsed)) {
                            throw new YamlParseException('YAML merge keys used with a scalar value instead of an array.', $this->getRealCurrentLineNb() + 1, $this->currentLine);
                        } elseif (isset($parsed[0])) {
                            // Numeric array, merge individual elements
                            foreach (array_reverse($parsed) as $parsedItem) {
                                if (!is_array($parsedItem)) {
                                    throw new YamlParseException('Merge items must be arrays.', $this->getRealCurrentLineNb() + 1, $parsedItem);
                                }
                                $merged = array_merge($parsedItem, $merged);
                            }
                        } else {
                            // Associative array, merge
                            $merged = array_merge($merged, $parsed);
                        }

                        $isProcessed = $merged;
                    }
                } elseif (isset($values['value']) && preg_match('#^&(?P<ref>[^ ]+) *(?P<value>.*)#u', $values['value'], $matches)) {
                    $isRef = $matches['ref'];
                    $values['value'] = $matches['value'];
                }

                if ($isProcessed) {
                    // Merge keys
                    $data = $isProcessed;
                // hash
                } elseif (!isset($values['value']) || '' == trim($values['value'], ' ') || 0 === strpos(ltrim($values['value'], ' '), '#')) {
                    // if next line is less indented or equal, then it means that the current value is null
                    if (!$this->isNextLineIndented() && !$this->isNextLineUnIndentedCollection()) {
                        $data[$key] = null;
                    } else {
                        $c = $this->getRealCurrentLineNb() + 1;
                        $parser = new YamlParser($c);
                        $parser->refs =& $this->refs;
                        $data[$key] = $parser->parse($this->getNextEmbedBlock(), $exceptionOnInvalidType, $objectSupport);
                    }
                } else {
                    if ($isInPlace) {
                        $data = $this->refs[$isInPlace];
                    } else {
                        $data[$key] = $this->parseValue($values['value'], $exceptionOnInvalidType, $objectSupport);
                    }
                }
            } else {
                // 1-liner optionally followed by newline
                $lineCount = count($this->lines);
                if (1 === $lineCount || (2 === $lineCount && empty($this->lines[1]))) {
                    try {
                        $value = YamlInline::parse($this->lines[0], $exceptionOnInvalidType, $objectSupport);
                    } catch (YamlParseException $e) {
                        $e->setParsedLine($this->getRealCurrentLineNb() + 1);
                        $e->setSnippet($this->currentLine);

                        throw $e;
                    }

                    if (is_array($value)) {
                        $first = reset($value);
                        if (is_string($first) && 0 === strpos($first, '*')) {
                            $data = array();
                            foreach ($value as $alias) {
                                $data[] = $this->refs[substr($alias, 1)];
                            }
                            $value = $data;
                        }
                    }

                    if (isset($mbEncoding)) {
                        mb_internal_encoding($mbEncoding);
                    }

                    return $value;
                }

                switch (preg_last_error()) {
                    case PREG_INTERNAL_ERROR:
                        $error = 'Internal PCRE error.';
                        break;
                    case PREG_BACKTRACK_LIMIT_ERROR:
                        $error = 'pcre.backtrack_limit reached.';
                        break;
                    case PREG_RECURSION_LIMIT_ERROR:
                        $error = 'pcre.recursion_limit reached.';
                        break;
                    case PREG_BAD_UTF8_ERROR:
                        $error = 'Malformed UTF-8 data.';
                        break;
                    case PREG_BAD_UTF8_OFFSET_ERROR:
                        $error = 'Offset doesn\'t correspond to the begin of a valid UTF-8 code point.';
                        break;
                    default:
                        $error = 'Unable to parse.';
                }

                throw new YamlParseException($error, $this->getRealCurrentLineNb() + 1, $this->currentLine);
            }

            if ($isRef) {
                $this->refs[$isRef] = end($data);
            }
        }

        if (isset($mbEncoding)) {
            mb_internal_encoding($mbEncoding);
        }

        return empty($data) ? null : $data;
    }

    /**
     * Returns the current line number (takes the offset into account).
     *
     * @return integer The current line number
     */
    private function getRealCurrentLineNb()
    {
        return $this->currentLineNb + $this->offset;
    }

    /**
     * Returns the current line indentation.
     *
     * @return integer The current line indentation
     */
    private function getCurrentLineIndentation()
    {
        return strlen($this->currentLine) - strlen(ltrim($this->currentLine, ' '));
    }

    /**
     * Returns the next embed block of YAML.
     *
     * @param integer $indentation The indent level at which the block is to be read, or null for default
     *
     * @return string A YAML string
     *
     * @throws ParseException When indentation problem are detected
     */
    private function getNextEmbedBlock($indentation = null)
    {
        $this->moveToNextLine();

        if (null === $indentation) {
            $newIndent = $this->getCurrentLineIndentation();

            $unindentedEmbedBlock = $this->isStringUnIndentedCollectionItem($this->currentLine);

            if (!$this->isCurrentLineEmpty() && 0 === $newIndent && !$unindentedEmbedBlock) {
                throw new YamlParseException('Indentation problem.', $this->getRealCurrentLineNb() + 1, $this->currentLine);
            }
        } else {
            $newIndent = $indentation;
        }

        $data = array(substr($this->currentLine, $newIndent));

        $isItUnindentedCollection = $this->isStringUnIndentedCollectionItem($this->currentLine);

        // Comments must not be removed inside a string block (ie. after a line ending with "|")
        $removeCommentsPattern = '~'.self::FOLDED_SCALAR_PATTERN.'$~';
        $removeComments = !preg_match($removeCommentsPattern, $this->currentLine);

        while ($this->moveToNextLine()) {
            if ($this->getCurrentLineIndentation() === $newIndent) {
                $removeComments = !preg_match($removeCommentsPattern, $this->currentLine);
            }

            if ($isItUnindentedCollection && !$this->isStringUnIndentedCollectionItem($this->currentLine)) {
                $this->moveToPreviousLine();
                break;
            }

            if ($removeComments && $this->isCurrentLineEmpty() || $this->isCurrentLineBlank()) {
                if ($this->isCurrentLineBlank()) {
                    $data[] = substr($this->currentLine, $newIndent);
                }

                continue;
            }

            $indent = $this->getCurrentLineIndentation();

            if (preg_match('#^(?P<text> *)$#', $this->currentLine, $match)) {
                // empty line
                $data[] = $match['text'];
            } elseif ($indent >= $newIndent) {
                $data[] = substr($this->currentLine, $newIndent);
            } elseif (0 == $indent) {
                $this->moveToPreviousLine();

                break;
            } else {
                throw new YamlParseException('Indentation problem.', $this->getRealCurrentLineNb() + 1, $this->currentLine);
            }
        }

        return implode("\n", $data);
    }

    /**
     * Moves the parser to the next line.
     *
     * @return Boolean
     */
    private function moveToNextLine()
    {
        if ($this->currentLineNb >= count($this->lines) - 1) {
            return false;
        }

        $this->currentLine = $this->lines[++$this->currentLineNb];

        return true;
    }

    /**
     * Moves the parser to the previous line.
     */
    private function moveToPreviousLine()
    {
        $this->currentLine = $this->lines[--$this->currentLineNb];
    }

    /**
     * Parses a YAML value.
     *
     * @param string  $value                  A YAML value
     * @param Boolean $exceptionOnInvalidType True if an exception must be thrown on invalid types false otherwise
     * @param Boolean $objectSupport          True if object support is enabled, false otherwise
     *
     * @return mixed  A PHP value
     *
     * @throws ParseException When reference does not exist
     */
    private function parseValue($value, $exceptionOnInvalidType, $objectSupport)
    {
        if (0 === strpos($value, '*')) {
            if (false !== $pos = strpos($value, '#')) {
                $value = substr($value, 1, $pos - 2);
            } else {
                $value = substr($value, 1);
            }

            if (!array_key_exists($value, $this->refs)) {
                throw new YamlParseException(sprintf('Reference "%s" does not exist.', $value), $this->currentLine);
            }

            return $this->refs[$value];
        }

        if (preg_match('/^'.self::FOLDED_SCALAR_PATTERN.'$/', $value, $matches)) {
            $modifiers = isset($matches['modifiers']) ? $matches['modifiers'] : '';

            return $this->parseFoldedScalar($matches['separator'], preg_replace('#\d+#', '', $modifiers), intval(abs($modifiers)));
        }

        try {
            return YamlInline::parse($value, $exceptionOnInvalidType, $objectSupport);
        } catch (YamlParseException $e) {
            $e->setParsedLine($this->getRealCurrentLineNb() + 1);
            $e->setSnippet($this->currentLine);

            throw $e;
        }
    }

    /**
     * Parses a folded scalar.
     *
     * @param string  $separator   The separator that was used to begin this folded scalar (| or >)
     * @param string  $indicator   The indicator that was used to begin this folded scalar (+ or -)
     * @param integer $indentation The indentation that was used to begin this folded scalar
     *
     * @return string  The text value
     */
    private function parseFoldedScalar($separator, $indicator = '', $indentation = 0)
    {
        $notEOF = $this->moveToNextLine();
        if (!$notEOF) {
            return '';
        }

        $isCurrentLineBlank = $this->isCurrentLineBlank();
        $text = '';

        // leading blank lines are consumed before determining indentation
        while ($notEOF && $isCurrentLineBlank) {
            // newline only if not EOF
            if ($notEOF = $this->moveToNextLine()) {
                $text .= "\n";
                $isCurrentLineBlank = $this->isCurrentLineBlank();
            }
        }

        // determine indentation if not specified
        if (0 === $indentation) {
            if (preg_match('/^ +/', $this->currentLine, $matches)) {
                $indentation = strlen($matches[0]);
            }
        }

        if ($indentation > 0) {
            $pattern = sprintf('/^ {%d}(.*)$/', $indentation);

            while (
                $notEOF && (
                    $isCurrentLineBlank ||
                    preg_match($pattern, $this->currentLine, $matches)
                )
            ) {
                if ($isCurrentLineBlank) {
                    $text .= substr($this->currentLine, $indentation);
                } else {
                    $text .= $matches[1];
                }

                // newline only if not EOF
                if ($notEOF = $this->moveToNextLine()) {
                    $text .= "\n";
                    $isCurrentLineBlank = $this->isCurrentLineBlank();
                }
            }
        } elseif ($notEOF) {
            $text .= "\n";
        }

        if ($notEOF) {
            $this->moveToPreviousLine();
        }

        // replace all non-trailing single newlines with spaces in folded blocks
        if ('>' === $separator) {
            preg_match('/(\n*)$/', $text, $matches);
            $text = preg_replace('/(?<!\n)\n(?!\n)/', ' ', rtrim($text, "\n"));
            $text .= $matches[1];
        }

        // deal with trailing newlines as indicated
        if ('' === $indicator) {
            $text = preg_replace('/\n+$/s', "\n", $text);
        } elseif ('-' === $indicator) {
            $text = preg_replace('/\n+$/s', '', $text);
        }

        return $text;
    }

    /**
     * Returns true if the next line is indented.
     *
     * @return Boolean Returns true if the next line is indented, false otherwise
     */
    private function isNextLineIndented()
    {
        $currentIndentation = $this->getCurrentLineIndentation();
        $EOF = !$this->moveToNextLine();

        while (!$EOF && $this->isCurrentLineEmpty()) {
            $EOF = !$this->moveToNextLine();
        }

        if ($EOF) {
            return false;
        }

        $ret = false;
        if ($this->getCurrentLineIndentation() > $currentIndentation) {
            $ret = true;
        }

        $this->moveToPreviousLine();

        return $ret;
    }

    /**
     * Returns true if the current line is blank or if it is a comment line.
     *
     * @return Boolean Returns true if the current line is empty or if it is a comment line, false otherwise
     */
    private function isCurrentLineEmpty()
    {
        return $this->isCurrentLineBlank() || $this->isCurrentLineComment();
    }

    /**
     * Returns true if the current line is blank.
     *
     * @return Boolean Returns true if the current line is blank, false otherwise
     */
    private function isCurrentLineBlank()
    {
        return '' == trim($this->currentLine, ' ');
    }

    /**
     * Returns true if the current line is a comment line.
     *
     * @return Boolean Returns true if the current line is a comment line, false otherwise
     */
    private function isCurrentLineComment()
    {
        //checking explicitly the first char of the trim is faster than loops or strpos
        $ltrimmedLine = ltrim($this->currentLine, ' ');

        return $ltrimmedLine[0] === '#';
    }

    /**
     * Cleanups a YAML string to be parsed.
     *
     * @param string $value The input YAML string
     *
     * @return string A cleaned up YAML string
     */
    private function cleanup($value)
    {
        $value = str_replace(array("\r\n", "\r"), "\n", $value);

        // strip YAML header
        $count = 0;
        $value = preg_replace('#^\%YAML[: ][\d\.]+.*\n#su', '', $value, -1, $count);
        $this->offset += $count;

        // remove leading comments
        $trimmedValue = preg_replace('#^(\#.*?\n)+#s', '', $value, -1, $count);
        if ($count == 1) {
            // items have been removed, update the offset
            $this->offset += substr_count($value, "\n") - substr_count($trimmedValue, "\n");
            $value = $trimmedValue;
        }

        // remove start of the document marker (---)
        $trimmedValue = preg_replace('#^\-\-\-.*?\n#s', '', $value, -1, $count);
        if ($count == 1) {
            // items have been removed, update the offset
            $this->offset += substr_count($value, "\n") - substr_count($trimmedValue, "\n");
            $value = $trimmedValue;

            // remove end of the document marker (...)
            $value = preg_replace('#\.\.\.\s*$#s', '', $value);
        }

        return $value;
    }

    /**
     * Returns true if the next line starts unindented collection
     *
     * @return Boolean Returns true if the next line starts unindented collection, false otherwise
     */
    private function isNextLineUnIndentedCollection()
    {
        $currentIndentation = $this->getCurrentLineIndentation();
        $notEOF = $this->moveToNextLine();

        while ($notEOF && $this->isCurrentLineEmpty()) {
            $notEOF = $this->moveToNextLine();
        }

        if (false === $notEOF) {
            return false;
        }

        $ret = false;
        if (
            $this->getCurrentLineIndentation() == $currentIndentation
            &&
            $this->isStringUnIndentedCollectionItem($this->currentLine)
        ) {
            $ret = true;
        }

        $this->moveToPreviousLine();

        return $ret;
    }

    /**
     * Returns true if the string is un-indented collection item
     *
     * @return Boolean Returns true if the string is un-indented collection item, false otherwise
     */
    private function isStringUnIndentedCollectionItem()
    {
        return (0 === strpos($this->currentLine, '- '));
    }

}

/**
 * Dumper dumps PHP variables to YAML strings.
 *
 * @author Fabien Potencier <fabien@symfony.com>
 */
class YamlDumper
{
    /**
     * The amount of spaces to use for indentation of nested nodes.
     *
     * @var integer
     */
    protected $indentation = 4;

    /**
     * Sets the indentation.
     *
     * @param integer $num The amount of spaces to use for indentation of nested nodes.
     */
    public function setIndentation($num)
    {
        $this->indentation = (int) $num;
    }

    /**
     * Dumps a PHP value to YAML.
     *
     * @param mixed   $input                  The PHP value
     * @param integer $inline                 The level where you switch to inline YAML
     * @param integer $indent                 The level of indentation (used internally)
     * @param Boolean $exceptionOnInvalidType true if an exception must be thrown on invalid types (a PHP resource or object), false otherwise
     * @param Boolean $objectSupport          true if object support is enabled, false otherwise
     *
     * @return string  The YAML representation of the PHP value
     */
    public function dump($input, $inline = 0, $indent = 0, $exceptionOnInvalidType = false, $objectSupport = false)
    {
        $output = '';
        $prefix = $indent ? str_repeat(' ', $indent) : '';

        if ($inline <= 0 || !is_array($input) || empty($input)) {
            $output .= $prefix.YamlInline::dump($input, $exceptionOnInvalidType, $objectSupport);
        } else {
            $isAHash = array_keys($input) !== range(0, count($input) - 1);

            foreach ($input as $key => $value) {
                $willBeInlined = $inline - 1 <= 0 || !is_array($value) || empty($value);

                $output .= sprintf('%s%s%s%s',
                    $prefix,
                    $isAHash ? YamlInline::dump($key, $exceptionOnInvalidType, $objectSupport).':' : '-',
                    $willBeInlined ? ' ' : "\n",
                    $this->dump($value, $inline - 1, $willBeInlined ? 0 : $indent + $this->indentation, $exceptionOnInvalidType, $objectSupport)
                ).($willBeInlined ? "\n" : '');
            }
        }

        return $output;
    }
}

/**
 * Yaml offers convenience methods to load and dump YAML.
 *
 * @author Fabien Potencier <fabien@symfony.com>
 *
 * @api
 */
class Yaml
{
    /**
     * Parses YAML into a PHP array.
     *
     * The parse method, when supplied with a YAML stream (string or file),
     * will do its best to convert YAML in a file into a PHP array.
     *
     *  Usage:
     *  <code>
     *   $array = Yaml::parse('config.yml');
     *   print_r($array);
     *  </code>
     *
     * As this method accepts both plain strings and file names as an input,
     * you must validate the input before calling this method. Passing a file
     * as an input is a deprecated feature and will be removed in 3.0.
     *
     * @param string  $input                  Path to a YAML file or a string containing YAML
     * @param Boolean $exceptionOnInvalidType True if an exception must be thrown on invalid types false otherwise
     * @param Boolean $objectSupport          True if object support is enabled, false otherwise
     *
     * @return array The YAML converted to a PHP array
     *
     * @throws ParseException If the YAML is not valid
     *
     * @api
     */
    public static function parse($input, $exceptionOnInvalidType = false, $objectSupport = false)
    {
        // if input is a file, process it
        $file = '';
        if (strpos($input, "\n") === false && is_file($input)) {
            if (false === is_readable($input)) {
                throw new YamlParseException(sprintf('Unable to parse "%s" as the file is not readable.', $input));
            }

            $file = $input;
            $input = file_get_contents($file);
        }

        $yaml = new YamlParser();

        try {
            return $yaml->parse($input, $exceptionOnInvalidType, $objectSupport);
        } catch (YamlParseException $e) {
            if ($file) {
                $e->setParsedFile($file);
            }

            throw $e;
        }
    }

    /**
     * Dumps a PHP array to a YAML string.
     *
     * The dump method, when supplied with an array, will do its best
     * to convert the array into friendly YAML.
     *
     * @param array   $array                  PHP array
     * @param integer $inline                 The level where you switch to inline YAML
     * @param integer $indent                 The amount of spaces to use for indentation of nested nodes.
     * @param Boolean $exceptionOnInvalidType true if an exception must be thrown on invalid types (a PHP resource or object), false otherwise
     * @param Boolean $objectSupport          true if object support is enabled, false otherwise
     *
     * @return string A YAML string representing the original PHP array
     *
     * @api
     */
    public static function dump($array, $inline = 2, $indent = 4, $exceptionOnInvalidType = false, $objectSupport = false)
    {
        $yaml = new YamlDumper();
        $yaml->setIndentation($indent);

        return $yaml->dump($array, $inline, 0, $exceptionOnInvalidType, $objectSupport);
    }
}

class Yaml_Parser
{
    public static function parse($s)
    {
        return Yaml::parse( $s/*, false, true*/ );
    }
    // alias
    public static function fromString($s)
    {
        return Yaml::parse( $s/*, false, true*/ );
    }
}
