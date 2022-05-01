import re

Beeld = None
beeld_plugin_action_inc_re = re.compile(r'/\*#ifdef\(([^\(\)]+)\)\*/', re.M)

def beeld_plugin_inc(beelder):
    global Beeld
    Beeld = beelder.getClass() #BeeldClass
    beelder.addAction('inc', beeld_plugin_action_inc)

def beeld_plugin_action_inc(evt):
    global Beeld
    global beeld_plugin_action_inc_re
    params = evt.data
    data = params.data
    current = params.current
    inc = current.action_cfg
    if inc and len(inc):
        included = list(map(lambda i: i.strip(), str(inc).split(',')))
        # extract conditional include blocks
        src = data.src
        slen = len(src)
        out = ''
        offset = 0
        m = beeld_plugin_action_inc_re.search(src, offset)
        while m:
            out += src[offset:m.start(0)]
            start = m.start(0) + len(m.group(0))
            end = src.find('/*#endif*/', start)
            offset = end+10 if -1 != end else slen
            if -1 == end: end = slen
            param = m.group(1).strip()
            if param in included: out += src[start:end]
            m = beeld_plugin_action_inc_re.search(src, offset)

        if offset < slen: out += src[offset:slen]
        data.src = out

    evt.next()

