<?php
function beeld_plugin_inc($beelder)
{
    $beelder->addAction('inc', 'beeld_plugin_action_inc');
}
function beeld_plugin_action_inc($evt)
{
    $params =& $evt->data;
    $data =& $params->data;
    $current =& $params->current;
    $inc = $current->action_cfg;
    if (!empty($inc))
    {
        $included = array_map('trim', explode(',', $inc));
        // extract conditional include blocks
        $src = $data->src;
        $len = strlen($src);
        $out = '';
        $offset = 0;
        while (preg_match('#/\\*\\#ifdef\(([^\(\)]+)\)\\*/#sum', $src, $m, PREG_OFFSET_CAPTURE, $offset))
        {
            $out .= substr($src, $offset, $m[0][1]-$offset);
            $start = $m[0][1] + strlen($m[0][0]);
            $end = strpos($src, '/*#endif*/', $start);
            $offset = false !== $end ? $end+10 : $len;
            if (false === $end) $end = $len;
            $param = trim($m[1][0]);
            if (in_array($param, $included)) $out .= substr($src, $start, $end-$start);
        }
        if ($offset < $len) $out .= substr($src, $offset, $len-$offset);
        $data->src = $out;
    }
    $evt->next();
}

