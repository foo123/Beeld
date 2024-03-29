<?php
function beeld_plugin_doc($beelder)
{
    $beelder->addAction('doc', 'beeld_plugin_action_doc');
}
function beeld_plugin_action_doc($evt)
{
    $params =& $evt->data;
    $options =& $params->options;
    $data =& $params->data;
    $current =& $params->current;
    $doc = $current->action_cfg;
    if ($doc && isset($doc['output']))
    {
        $doc['output'] = BeeldUtils::xpresion($doc['output'], $evt); // parse xpresion if any
        $docFile = BeeldUtils::get_real_path(BeeldUtils::evaluate($doc['output'], array()), $options->basePath);
        $startDoc = $doc['startdoc'];
        $endDoc = $doc['enddoc'];
        $isRegex = 0;
        $_trim = null;
        $_trimlen = 0;
        $docs = array();
        $sep = isset($doc['separator']) ? $doc['separator'] : "\n\n";

        if (isset($doc['trim']))
        {
            $_trim = BeeldUtils::regex($doc['trim'], $evt);
            if (false === $_trim)
            {
                $_trim = $doc['trim'];
                $_trimlen = strlen($_trim);
                $isRegex = 0;
            }
            else
            {
                $isRegex = 1;
            }
        }

        // extract doc blocks
        $blocks = explode($startDoc, $data->src);
        foreach ($blocks as $b => $block)
        {
            $tmp = explode($endDoc, $block);
            if (isset($tmp[1]))
            {
                $docs[] = $tmp[0];
            }
        }
        $blocks = null;

        // trim start of each doc block line
        if ($_trim)
        {
            foreach ($docs as $i => $d)
            {
                $tmp = explode("\n", $d);
                foreach ($tmp as $j => $t)
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
                $docs[$i] = implode("\n", $tmp);
            }
        }
        BeeldUtils::write($docFile, implode($sep, $docs));
    }
    $evt->next();
}

