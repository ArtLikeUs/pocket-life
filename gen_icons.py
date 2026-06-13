"""Generate Pocket Life app icons (plumbob-style diamond) using only the stdlib."""
import zlib, struct

def write_png(path, w, h, rows):
    raw = b''.join(b'\x00' + b''.join(struct.pack('BBB', *p) for p in row) for row in rows)
    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c))
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw))
           + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)

def icon(size):
    bg = (33, 32, 58)
    cx = size / 2
    y0, ym, y1 = size * 0.16, size * 0.50, size * 0.86
    hw_max = size * 0.24
    rows = []
    for y in range(size):
        row = []
        if y0 <= y < ym:
            hw = hw_max * (y - y0) / (ym - y0)
        elif ym <= y < y1:
            hw = hw_max * (1 - (y - ym) / (y1 - ym))
        else:
            hw = 0
        for x in range(size):
            if hw > 1 and abs(x - cx) < hw:
                t = (y - y0) / (y1 - y0)            # vertical gradient
                side = 0.82 if x < cx else 1.0      # left facet darker
                r = int((94 + 40 * (1 - t)) * side)
                g = int((224 - 60 * t) * side)
                b = int((122 + 30 * (1 - t)) * side)
                row.append((min(r, 255), min(g, 255), min(b, 255)))
            else:
                row.append(bg)
        rows.append(row)
    return rows

write_png('icon-512.png', 512, 512, icon(512))
write_png('icon-180.png', 180, 180, icon(180))
print('icons written')
