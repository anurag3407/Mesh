import math

def build_concept_a():
    # Concept A: The Symbiotic S (Dual Interlocking Ribbon)
    # Refined for optimal optical balance and stroke curvature.
    # W=164, H=204, centered in 256x256
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Symbiotic S</title>
  <g fill="none" stroke="#000000" stroke-width="36" stroke-linecap="round" stroke-linejoin="round">
    <!-- Human Ribbon: starts at top right, curves over top to left, then inward -->
    <path d="M 186 64 C 186 44 164 28 132 28 C 92 28 64 58 64 96 C 64 124 84 140 120 150 L 138 155" />
    <!-- Agent Ribbon: starts at bottom left, curves under bottom to right, then inward -->
    <path d="M 70 192 C 70 212 92 228 124 228 C 164 228 192 198 192 160 C 192 132 172 116 136 106 L 118 101" />
  </g>
</svg>'''
    return svg

def build_concept_b():
    # Concept B: The Continuous Loop / Turn-Taking Node
    # A 45-degree angled infinity loop / continuous turn track.
    # Represents "Human and AI in an endless, seamless loop".
    # Built from two interlocking circular eyes connected by a diagonal crossover.
    # Uses smooth cubic beziers for a uniform monoline track (stroke 34px).
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Turn Loop</title>
  <!-- Single continuous loop forming S and Infinity -->
  <path d="M 128 128 
           C 166 86 196 66 196 48 
           C 196 30 178 18 156 18 
           C 126 18 96 46 96 82 
           C 96 114 128 142 128 128
           C 128 114 160 142 160 174 
           C 160 210 130 238 100 238 
           C 78 238 60 226 60 208 
           C 60 190 90 170 128 128 Z" 
        fill="none" 
        stroke="#000000" 
        stroke-width="36" 
        stroke-linecap="round" 
        stroke-linejoin="round" />
</svg>'''
    return svg

def build_concept_c():
    # Concept C: The Dual Canvas Tiles (Architectural Layering)
    # Two offset rounded canvas tiles representing human canvas and agent canvas,
    # with an interlocking S-shaped negative channel.
    # Clean, modern, highly developer-native (Linear / Supabase feel).
    # Tile 1: Top-right offset
    # Tile 2: Bottom-left offset
    # Negative space: A clean diagonal 45-degree slice and horizontal shelves.
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Dual Canvas</title>
  <g fill="#000000">
    <!-- Top Canvas Tile (Human workspace) -->
    <path d="M 96 32 L 180 32 C 204.3 32 224 51.7 224 76 L 224 108 C 224 123.5 211.5 136 196 136 L 140 136 C 126.7 136 116 125.3 116 112 L 116 80 C 116 66.7 105.3 56 92 56 L 76 56 C 69.4 56 64 50.6 64 44 C 64 37.4 69.4 32 76 32 Z" />
    <!-- Bottom Canvas Tile (Agent workspace) -->
    <path d="M 160 224 L 76 224 C 51.7 224 32 204.3 32 180 L 32 148 C 32 132.5 44.5 120 60 120 L 116 120 C 129.3 120 140 130.7 140 144 L 140 176 C 140 189.3 150.7 200 164 200 L 180 200 C 186.6 200 192 205.4 192 212 C 192 218.6 186.6 224 180 224 Z" />
    <!-- Center synchronization node -->
    <circle cx="128" cy="128" r="16" />
  </g>
</svg>'''
    return svg

with open("assets/branding/concept-a-symbol.svg", "w") as f:
    f.write(build_concept_a())

with open("assets/branding/concept-b-symbol.svg", "w") as f:
    f.write(build_concept_b())

with open("assets/branding/concept-c-symbol.svg", "w") as f:
    f.write(build_concept_c())

print("Saved candidate concepts")
