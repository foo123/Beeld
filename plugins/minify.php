<?php
function beeld_plugin_minify( $beelder )
{
    if ( !defined('BEELD_COMPILERS') )
        define('BEELD_COMPILERS', BEELD_ROOT . 'compilers' . DIRECTORY_SEPARATOR);
    $beelder->addAction('minify', 'beeld_plugin_action_minify');
}

function beeld_plugin_action_minify( $evt )
{
    $compilers = array(
    'cssmin' => Beeld::Compiler(
        'CSS Minifier',
        'php -f ${COMPILERS}cssmin.php -- ${EXTRA} ${OPTIONS} --input=${IN}  --output=${OUT}'
    ),
    'uglifyjs' => Beeld::Compiler(
        'Node UglifyJS Compiler',
        'uglifyjs ${IN} ${OPTIONS} -o ${OUT}'
    ),
    'closure' => Beeld::Compiler(
        'Java Closure Compiler',
        'java -jar ${COMPILERS}closure.jar ${EXTRA} ${OPTIONS} --js ${IN} --js_output_file ${OUT}'
    ),
    'yui' => Beeld::Compiler(
        'Java YUI Compressor Compiler',
        'java -jar ${COMPILERS}yuicompressor.jar ${EXTRA} ${OPTIONS} --type js -o ${OUT}  ${IN}'
    )
    );
    $params =& $evt->data;
    $options =& $params->options;
    $data =& $params->data;
    $current =& $params->current;
    $minify = $current->action_cfg;
    if ( $minify && !empty($data->src) )
    {
        // fix compiler selection
        $selected = isset($params->cmd_opts['compiler']) ? strtolower(strval($params->cmd_opts['compiler'])) : null;
        if ( $selected && !isset($compilers[ $selected ]) ) $selected = 'uglifyjs';

        $minify = (array)$minify;

        if (isset($minify['uglifyjs']))
        {
            $compilers['uglifyjs']->option(implode(" ", (array)$minify['uglifyjs']));
            if ( !$selected ) $selected = 'uglifyjs';
        }
        if (isset($minify['closure']))
        {
            $compilers['closure']->option(implode(" ", (array)$minify['closure']));
            if ( !$selected ) $selected = 'closure';
        }
        if (isset($minify['yui']))
        {
            $compilers['yui']->option(implode(" ", (array)$minify['yui']));
            if ( !$selected ) $selected = 'yui';
        }
        if (isset($minify['cssmin']))
        {
            $compilers['cssmin']->option(implode(" ", (array)$minify['cssmin']));
            if ( !$selected ) $selected = 'cssmin';
        }

        BeeldUtils::write($data->tmp_in, $data->src);

        $extra = '';
        // use the selected compiler
        $compiler = $compilers[$selected];
        if ('cssmin' === $selected && false === strpos($compiler->options, "--basepath"))
        {
            $extra = "--basepath=".$options->basePath;
        }
        elseif ('yui' === $selected || 'closure' === $selected)
        {
            $extra = "--charset ".$options->encoding;
        }

        $cmd = $compiler->compiler(array(
         array('${COMPILERS}',       BEELD_COMPILERS)
        ,array('${EXTRA}',           $extra)
        ,array('${OPTIONS}',         $compiler->options)
        ,array('${IN}',              $data->tmp_in)
        ,array('${OUT}',             $data->tmp_out)
        ));

        //$cmd = escapeshellcmd( $cmd );
        $out = array(); $err = 0;
        exec($cmd . ' 2>&1', $out, $err);

        // some error occured
        if ( $err )
        {
            $data->err = 'Error executing "'.$cmd.'"';
            BeeldUtils::echo_stderr(implode(PHP_EOL, (array)$out));
            $evt->abort( );
            return;
        }
        else
        {
            $data->src = BeeldUtils::read($data->tmp_out);
        }
    }
    $evt->next( );
}

