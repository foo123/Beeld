import re

def beeld_plugin_inc(beelder):
    beelder.addAction('inc', beeld_plugin_action_inc)

def beeld_plugin_action_inc(evt):
    params = evt.data
    data = params.data
    current = params.current
    inc = current.action_cfg
    if inc:
        p = str(inc['prefix'] if 'prefix' in inc else '')
        s = str(inc['suffix'] if 'suffix' in inc else '')
        defined = list(map(lambda i: i.strip(), str(inc['define'] if 'define' in inc else '').split(',')))
        rex = re.compile(r'^' + re.escape(p) + r'#(ifn?def)\(([^\(\)]+)\)' + re.escape(s), re.M)
        e = p + '#endif' + s
        el = len(e)
        src = data.src
        slen = len(src)
        out = ''
        offset = 0
        # extract conditional include blocks
        m = rex.search(src, offset)
        while m:
            out += src[offset:m.start(0)]
            start = m.start(0) + len(m.group(0))
            end = src.find(e, start)
            offset = slen if -1 == end else end+el
            if -1 == end: end = slen
            param = m.group(2).strip()
            if (('ifndef' == m.group(1)) and (param not in defined)) or (('ifdef' == m.group(1)) and (param in defined)): out += src[start:end]
            m = rex.search(src, offset)

        if offset < slen: out += src[offset:slen]
        data.src = out

    evt.next()

