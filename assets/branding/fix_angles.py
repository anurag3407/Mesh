# Fix straight line segment to continuous smooth curve
svg_a = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Symbiotic S</title>
  <g fill="none" stroke="#000000" stroke-width="36" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 186 64 C 186 44 164 28 132 28 C 92 28 64 58 64 96 C 64 124 84 140 120 150 C 128 152.2 136 154.5 140 155" />
    <path d="M 70 192 C 70 212 92 228 124 228 C 164 228 192 198 192 160 C 192 132 172 116 136 106 C 128 103.8 120 101.5 116 101" />
  </g>
</svg>'''

with open("assets/branding/concept-a-symbol.svg", "w") as f:
    f.write(svg_a)

