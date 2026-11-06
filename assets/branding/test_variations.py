# Let's create:
# Concept B: The Isometric Room (Hexagonal Room Cube carving S)
# Top face, Left face, Right face
# Or an architectural geometric monogram.

def make_architectural_s():
    # Crisp geometric sans S composed of 2 offset interlocking brackets
    # Outer corners rounded (R=28), inner corners square, uniform 36px stroke
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Architectural S</title>
  <path d="M 196 68 
           L 196 60 
           C 196 42.3 181.7 28 164 28 
           L 92 28 
           C 65.5 28 44 49.5 44 76 
           L 44 96 
           C 44 122.5 65.5 144 92 144 
           L 164 144 
           C 172.8 144 180 151.2 180 160 
           L 180 180 
           C 180 188.8 172.8 196 164 196 
           L 60 196 
           L 60 188" 
        fill="none" 
        stroke="#000000" 
        stroke-width="36" 
        stroke-linecap="round" 
        stroke-linejoin="round" />
</svg>'''
    return svg

def make_converging_nodes():
    # Concept C: The Handoff / Turn Nodes
    # Two offset circular nodes with sweeping tails meeting in the center
    # Like two speech/turn bubbles or agent presence indicators connecting
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Handoff</title>
  <g fill="#000000">
    <!-- Top-left to center gesture: Human node -->
    <circle cx="84" cy="74" r="30" />
    <path d="M 84 104 C 84 124 100 140 120 140 L 172 140 C 183 140 192 131 192 120 C 192 109 183 100 172 100 L 120 100 C 111.2 100 104 92.8 104 84 L 104 74 Z" />
    <!-- Bottom-right to center gesture: Agent node -->
    <circle cx="172" cy="182" r="30" />
    <path d="M 172 152 C 172 132 156 116 136 116 L 84 116 C 73 116 64 125 64 136 C 64 147 73 156 84 156 L 136 156 C 144.8 156 152 163.2 152 172 L 152 182 Z" />
  </g>
</svg>'''
    return svg

with open("assets/branding/test-arch.svg", "w") as f:
    f.write(make_architectural_s())

with open("assets/branding/test-handoff.svg", "w") as f:
    f.write(make_converging_nodes())

