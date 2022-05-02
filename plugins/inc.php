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
        $p = (string)(isset($inc['prefix']) ? $inc['prefix'] : '');
        $s = (string)(isset($inc['suffix']) ? $inc['suffix'] : '');
        $defined = array_map('trim', explode(',', (string)(isset($inc['define']) ? $inc['define'] : '')));
        $rex = '/^' . preg_quote($p, '/') . '#(ifn?def)\\(([^\\(\\)]+)\\)' . preg_quote($s, '/') . '/um';
        $e = $p . '#endif' . $s;
        $el = strlen($e);
        $src = $data->src;
        $slen = strlen($src);
        $out = '';
        $offset = 0;
        // extract conditional include blocks
        while (preg_match($rex, $src, $m, PREG_OFFSET_CAPTURE, $offset))
        {
            $out .= substr($src, $offset, $m[0][1]-$offset);
            $start = $m[0][1] + strlen($m[0][0]);
            $end = strpos($src, $e, $start);
            $offset = false === $end ? $slen : $end+$el;
            if (false === $end) $end = $slen;
            $param = trim($m[2][0]);
            if (
                ('ifndef' === $m[1][0] && !in_array($param, $defined)) ||
                ('ifdef' === $m[1][0] && in_array($param, $defined))
            ) $out .= substr($src, $start, $end-$start);
        }
        if ($offset < $slen) $out .= substr($src, $offset, $slen-$offset);
        $data->src = $out;
    }
    $evt->next();
}

