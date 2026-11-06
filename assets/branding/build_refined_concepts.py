import math

def build_concept_a():
    # Concept A: The Interlocking S-Ribbon (Symbiotic S)
    # Built from two interlocking smooth sweeping ribbons.
    # Uniform stroke thickness 34px, rounded terminals.
    # A diagonal cut of 22px separating them across the center.
    # Total footprint: W=160, H=200, centered in 256x256
    # viewBox="0 0 256 256"
    # Lobe 1 (Top / Human): starts at (186, 56), curves around top (128, 28) to left (70, 78),
    # then sweeps inward to (140, 134) with rounded cap.
    # Lobe 2 (Bottom / Agent): 180-deg rotational symmetry around (128, 128).
    # Center (128, 128)
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Interlocking S</title>
  <g fill="none" stroke="#000000" stroke-width="34" stroke-linecap="round" stroke-linejoin="round">
    <!-- Top ribbon -->
    <path d="M 184 62 C 184 42 162 28 132 28 C 94 28 66 58 66 94 C 66 122 86 138 120 148 L 138 153" />
    <!-- Bottom ribbon (rotated 180) -->
    <path d="M 72 194 C 72 214 94 228 124 228 C 162 228 190 198 190 162 C 190 134 170 118 136 108 L 118 103" />
  </g>
</svg>'''
    return svg

def build_concept_b():
    # Concept B: The Turn Chamber (Quad Pinwheel Nodes)
    # 4 clean rounded pills (capsules) rotating around a central room chamber (128, 128).
    # Each capsule is L=88, W=32, rx=16.
    # Perfectly separated with 20px clean negative space gap.
    # Total diameter = 208px, centered in 256x256.
    # Rotations: 0, 90, 180, 270 deg around (128, 128).
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Turn Chamber</title>
  <g fill="#000000">
    <!-- Top-Right horizontal arm -->
    <rect x="136" y="38" width="76" height="34" rx="17" />
    <!-- Bottom-Right vertical arm -->
    <rect x="184" y="136" width="34" height="76" rx="17" />
    <!-- Bottom-Left horizontal arm -->
    <rect x="44" y="184" width="76" height="34" rx="17" />
    <!-- Top-Left vertical arm -->
    <rect x="38" y="44" width="34" height="76" rx="17" />
    <!-- Inner orbiting agent nodes / turn ring -->
    <circle cx="128" cy="74" r="13" />
    <circle cx="182" cy="128" r="13" />
    <circle cx="128" cy="182" r="13" />
    <circle cx="74" cy="128" r="13" />
  </g>
</svg>'''
    return svg

def build_concept_c():
    # Concept C: The Canvas Monogram (Architectural Geometric S)
    # Solid geometric ribbon with clean 90-degree and 45-degree transitions.
    # Uniform width of 34px, rounded external corners (rx=20),
    # forming an unmistakable, razor-sharp architectural S.
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Canvas S</title>
  <path d="M 194 62 
           C 194 42 178 28 156 28 
           L 100 28 
           C 76 28 58 46 58 70 
           L 58 98 
           C 58 122 76 138 100 138 
           L 156 138 
           C 180 138 198 154 198 178 
           L 198 194 
           C 198 218 180 228 156 228 
           L 96 228 
           C 74 228 58 214 58 194" 
        fill="none" 
        stroke="#000000" 
        stroke-width="36" 
        stroke-linecap="round" 
        stroke-linejoin="round" />
  <!-- Collaborative turn indicator dot in the upper and lower counter -->
  <circle cx="106" cy="83" r="11" fill="#000000" />
  <circle cx="150" cy="173" r="11" fill="#000000" />
</svg>'''
    return svg

with open("assets/branding/concept-a-symbol.svg", "w") as f:
    f.write(build_concept_a())

with open("assets/branding/concept-b-symbol.svg", "w") as f:
    f.write(build_concept_b())

with open("assets/branding/concept-c-symbol.svg", "w") as f:
    f.write(build_concept_c())

print("Updated refined concepts")
