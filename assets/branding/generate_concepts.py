import math

def make_concept_a_symbol():
    # Concept A: Symbiotic S
    # Two identical interlocking curved paths rotated 180 degrees.
    # Canvas: 256x256, center at 128, 128
    # Top arm sweeps from (190, 52) around top arc to center (128, 112)
    # With clean stroke width 36 and round caps, or filled compound path.
    # Filled compound path is cleaner for SVG audits.
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Symbiotic S</title>
  <!-- Top lobe / Human gesture -->
  <path d="M 188 56 C 188 42.7 177.3 32 164 32 C 105 32 60 77 60 136 C 60 149.3 70.7 160 84 160 C 97.3 160 108 149.3 108 136 C 108 103.5 131.5 80 164 80 C 177.3 80 188 69.3 188 56 Z" fill="#000000" />
  <!-- Bottom lobe / Agent companion (180deg rotation of top) -->
  <path d="M 68 200 C 68 213.3 78.7 224 92 224 C 151 224 196 179 196 120 C 196 106.7 185.3 96 172 96 C 158.7 96 148 106.7 148 120 C 148 152.5 124.5 176 92 176 C 78.7 176 68 186.7 68 200 Z" fill="#000000" />
  <!-- Center bridge node / shared turn token -->
  <circle cx="128" cy="128" r="18" fill="#000000" />
</svg>'''
    return svg

def make_concept_b_symbol():
    # Concept B: The Turn Chamber / Quad Room
    # 4 curved petals/segments circulating around an open central chamber
    # Canvas 256x256, center (128, 128)
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Turn Chamber</title>
  <g fill="#000000">
    <!-- Top-Right quadrant petal -->
    <path d="M 148 36 C 187.8 36 220 68.2 220 108 C 220 120.2 210.2 130 198 130 C 185.8 130 176 120.2 176 108 C 176 92.5 163.5 80 148 80 C 135.8 80 126 70.2 126 58 C 126 45.8 135.8 36 148 36 Z" />
    <!-- Bottom-Right quadrant petal -->
    <path d="M 220 148 C 220 187.8 187.8 220 148 220 C 135.8 220 126 210.2 126 198 C 126 185.8 135.8 176 148 176 C 163.5 176 176 163.5 176 148 C 176 135.8 185.8 126 198 126 C 210.2 126 220 135.8 220 148 Z" />
    <!-- Bottom-Left quadrant petal -->
    <path d="M 108 220 C 68.2 220 36 187.8 36 148 C 36 135.8 45.8 126 58 126 C 70.2 126 80 135.8 80 148 C 80 163.5 92.5 176 108 176 C 120.2 176 130 185.8 130 198 C 130 210.2 120.2 220 108 220 Z" />
    <!-- Top-Left quadrant petal -->
    <path d="M 36 108 C 36 68.2 68.2 36 108 36 C 120.2 36 130 45.8 130 58 C 130 70.2 120.2 80 108 80 C 92.5 80 80 92.5 80 108 C 80 120.2 70.2 130 58 130 C 45.8 130 36 120.2 36 108 Z" />
  </g>
</svg>'''
    return svg

def make_concept_c_symbol():
    # Concept C: Dual Canvas S / Isometric Step
    # Sharp, clean architectural S composed of two interlocking folded canvas planes
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Dual Canvas</title>
  <g fill="#000000" fill-rule="evenodd">
    <!-- Upper folded canvas plane -->
    <path d="M 72 40 L 196 40 C 202.6 40 208 45.4 208 52 L 208 104 C 208 110.6 202.6 116 196 116 L 128 116 L 164 80 L 112 80 L 72 120 L 72 52 C 72 45.4 77.4 40 84 40 Z" />
    <!-- Lower folded canvas plane -->
    <path d="M 184 216 L 60 216 C 53.4 216 48 210.6 48 204 L 48 152 C 48 145.4 53.4 140 60 140 L 128 140 L 92 176 L 144 176 L 184 136 L 184 204 C 184 210.6 178.6 216 172 216 Z" />
  </g>
</svg>'''
    return svg

with open("assets/branding/concept-a-symbol.svg", "w") as f:
    f.write(make_concept_a_symbol())

with open("assets/branding/concept-b-symbol.svg", "w") as f:
    f.write(make_concept_b_symbol())

with open("assets/branding/concept-c-symbol.svg", "w") as f:
    f.write(make_concept_c_symbol())

print("Saved raw concepts")
