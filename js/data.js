/* =====================================================================
   ASI-402 · MRT Drone Team — project data
   ---------------------------------------------------------------------
   Every number shown on the site lives in this file, so it can be updated
   after bench and flight tests without touching the page logic.
   Sources: interim presentation (2 Nov 2026), interim report, sizing
   calculator, part-selection workbook, Gantt chart and wiring diagram.
   ===================================================================== */
window.DRONE = {

  /* ---- Evidence levels used by the coloured tags across the site ---- */
  evidence: {
    calc:    { label: 'Calculated',        hint: 'From our own model or hand calculation' },
    mfr:     { label: 'Manufacturer data', hint: 'From a supplier datasheet or test table' },
    bench:   { label: 'Bench-tested',      hint: 'Measured by the team on hardware' },
    pending: { label: 'Test pending',      hint: 'Planned; no measurement yet' },
    rule:    { label: 'URC rule',          hint: 'Competition requirement or guideline' }
  },

  /* ---- Headline numbers under the hero ---- */
  headline: [
    { value: '4.86', unit: 'kg',  label: 'Design take-off mass', note: 'URC cap 5.0 kg',  ev: 'calc' },
    { value: '21.7', unit: 'min', label: 'Predicted hover',      note: 'Target ≥ 20 min', ev: 'calc' },
    { value: '23.4', unit: 'dB',  label: 'Relay link margin',    note: 'At 1.2 km · target ≥ 20 dB', ev: 'calc' },
    { value: '3.0',  unit: ': 1', label: 'Thrust-to-weight',     note: 'At 5 kg · target ≥ 2.0', ev: 'mfr' }
  ],

  /* ---- 01 Mission ---- */
  missions: [
    { id: 'delivery', name: 'Delivery', points: 100, drone: true,
      rover: 'Find scattered equipment of up to 5 kg and deliver it to field astronauts or cache boxes inside tight drop zones, sometimes behind a hill.',
      roles: [
        ['Relay', 'Hover over, or land on, the hill to hold two-way radio between the C2 station and the rover.'],
        ['Recon', 'Fly ahead to scout drive paths and locate objects spread over wide search radii.']
      ] },
    { id: 'autonomy', name: 'Autonomy', points: 100, drone: true,
      rover: 'Two 50-point sub-missions: assist an astronaut, then navigate waypoints marked by ArUco posts or GNSS coordinates with no teleoperation (25 points per post).',
      roles: [
        ['Relay', 'Keep the rover linked to C2 when a post lies behind terrain.'],
        ['Recon', 'Give the operators an overhead view while the rover assists the astronaut.']
      ] },
    { id: 'astro', name: 'Astrobiology', points: 100, drone: false,
      rover: 'Science mission: soil sampling and sample testing by the rover alone.', roles: [] },
    { id: 'service', name: 'Equipment servicing', points: 100, drone: false,
      rover: 'Rover-only mission.', roles: [] }
  ],

  requirements: [
    { group: 'Mass', items: [
      ['Take-off mass', '≤ 5.0 kg', 'rule'],
      ['Dummy mass', 'Inert mass equal to battery mass, carried at all times', 'rule'],
      ['Remote ID', 'Mandatory module, about 20 g', 'rule'],
      ['Field staging', 'Launch and land from field pads', 'rule']
    ] },
    { group: 'Desert operation', items: [
      ['Wind', 'Withstand sustained 48 km/h winds (strongly recommended)', 'rule'],
      ['Top speed', 'At least 36 km/h with the dummy mass on board', 'rule'],
      ['Ambient temperature', '35–40 °C', 'rule'],
      ['Altitude', '≤ 120 m above ground level', 'rule'],
      ['Operating area', 'About one mile square around the research station', 'rule']
    ] }
  ],

  targets: [
    { goal: 'Hover endurance at take-off mass', target: '≥ 20 min', now: '21.7 min', ev: 'calc', ok: true,
      basis: 'Endurance model on manufacturer thrust data; hover test pending.' },
    { goal: 'Take-off mass with 1:1 dummy', target: '≤ 5,000 g', now: '4,864 g', ev: 'calc', ok: true,
      basis: 'Itemised budget plus 5% growth; parts to be weighed.' },
    { goal: 'Relay coverage radius', target: '1 km', now: '23.4 dB margin at 1.2 km', ev: 'calc', ok: true,
      basis: 'Free-space link budget; short-range ping test passed.' },
    { goal: 'Control link over 2 km recon radius', target: '≥ 20 dB margin', now: '35.4 dB at 1.2 km (2.4 GHz)', ev: 'calc', ok: true,
      basis: '20 dB margin holds to about 7 km in free space.' },
    { goal: 'Video link over 2 km recon radius', target: '≥ 20 dB margin', now: '13.7 dB at 1.2 km', ev: 'calc', ok: false,
      basis: 'Limiting link: antenna upgrade and range test planned.' },
    { goal: 'Thrust reserve for wind', target: 'T/W ≥ 2.0', now: '3.0', ev: 'mfr', ok: true,
      basis: '3,797 gf tested maximum per motor; thrust stand pending.' }
  ],

  /* ---- 02 Background: predecessor findings and our responses ---- */
  predecessor: {
    mass: 2654,
    thrust: { bench: 1900, delivered: 1385, sagLoss: 395, washLoss: 120 },
    lessons: [
      { issue: 'Single camera payload',
        found: 'FPV feed only. No relay electronics, no dual-band telemetry.',
        response: 'Three independent links: dual-band control, gimballed HD video and an on-board 2.4 GHz repeater.',
        link: '#comms' },
      { issue: 'Battery voltage sag',
        found: 'Sag under a 39.7 A load cut thrust by 20.8% and shortened flight time.',
        response: 'High-energy 6S 16 Ah pack, short 10 AWG main leads on XT90 connectors, and a sag term in the endurance model.',
        link: '#propulsion' },
      { issue: 'Weight limit under-used',
        found: 'Flew at 2.7 kg, leaving 2.3 kg of the 5 kg allowance unused.',
        response: 'Design to the cap: 4,864 g, with battery mass maximised inside it.',
        link: '#concept' },
      { issue: 'Prop-wash interference',
        found: 'Tight rotor spacing cut thrust a further 7.9% and drove motor temperature spikes.',
        response: 'Larger symmetric frame for 18-inch props; clearance and thrust interaction are test items.',
        link: '#airframe' }
    ]
  },

  /* ---- 03 Concept: methodology and 3 kg vs 5 kg study ---- */
  methodology: [
    { step: 'Mission requirements', sub: '5 kg MTOW · hover and terrain survey',
      text: 'The relay and survey roles set the take-off mass ceiling, the hover-dominated flight profile and the payload kit.' },
    { step: 'Propulsion sizing', sub: 'Required thrust · disk loading · propeller diameter',
      text: 'Hover thrust per motor, a 2:1 thrust-to-weight target and a 75 N/m² disk loading give the propeller class.' },
    { step: 'Motor and airframe selection', sub: 'Motor · propeller · layout',
      text: 'Candidate motor–propeller pairs are compared at the hover point using manufacturer test tables.' },
    { step: 'Mass budget', sub: 'Components + battery + dummy < 5 kg',
      text: 'Itemised masses plus a 5% growth allowance fix how much battery fits.', loop: 'Any change in mass loops back to propulsion sizing.' },
    { step: 'Battery and endurance', sub: 'Usable energy · predicted flight time',
      text: 'A battery-mass sweep trades stored energy against the extra power needed to lift battery and dummy.' }
  ],

  concepts: {
    limit: 5000,
    parts: [
      { key: 'kit',     label: 'Mission kit + wiring',   series: 1 },
      { key: 'air',     label: 'Airframe + propulsion',  series: 2 },
      { key: 'battery', label: 'Battery',                series: 3 },
      { key: 'dummy',   label: 'Dummy mass',             series: 4 },
      { key: 'growth',  label: 'Growth allowance (5%)',  series: 5 }
    ],
    rows: [
      { id: 'A', name: '3 kg, today’s parts', kit: 616.8, air: 1536, battery: 352.2, dummy: 352.2, growth: 142.8, hover: 10.6 },
      { id: 'B', name: '3 kg, resized airframe', kit: 616.8, air: 921.6, battery: 659.4, dummy: 659.4, growth: 142.8, hover: 17.4 },
      { id: 'C', name: '5 kg design', kit: 616.8, air: 1536, battery: 1240, dummy: 1240, growth: 231.6, hover: 21.7, selected: true }
    ],
    /* "Resized airframe, same kit" model behind the endurance curve */
    model: { kit: 616.8, airAt5kg: 1536, growth: 0.05, gfPerW: 1250 / 124.87 }
  },

  /* ---- 04 Propulsion ---- */
  sizing: { mass: 5.0, motors: 4, tw: 2.0, diskLoading: 75, g: 9.81,
            selectedPropIn: 18, motorMaxGf: 3797 },

  diskLoadingOptions: [
    { dl: 50,  d: '22.0 in', note: 'Lower induced power, but a larger frame and more wind-exposed area.' },
    { dl: 75,  d: '18.0 in', note: 'Balanced hover efficiency and frame size.', selected: true },
    { dl: 100, d: '15.6 in', note: 'Compact frame, higher induced power, weaker endurance.' }
  ],

  motors: {
    cols: ['T-Motor MN501-S KV360', 'MAD 5008 EEE 340KV'],
    rows: [
      ['Propeller', 'P18×6.1', 'Fluxer Pro 18×6.1'],
      ['Motor mass', '175 g', '127 g'],
      ['Hover throttle', '~47%', '~50%'],
      ['Input power per motor', '139.0 W', '124.9 W'],
      ['Thrust efficiency', '9.0 gf/W', '10.0 gf/W'],
      ['Maximum tested thrust', '4,644 gf', '3,797 gf']
    ],
    gains: [
      { value: '−10%', label: 'Hover input power' },
      { value: '+11%', label: 'Thrust efficiency' },
      { value: '−27%', label: 'Motor mass' }
    ],
    rival: { thrust: 1250, power: 139.0, name: 'T-Motor MN501-S' }
  },

  props: [
    { size: '17×5.8', power: 126.2, throttle: 54.0, max: 3365 },
    { size: '18×6.1', power: 124.9, throttle: 49.8, max: 3797, selected: true },
    { size: '19×5.7', power: 121.2, throttle: 48.1, max: 3924 }
  ],

  /* MAD 5008 EEE 340KV + Fluxer Pro 18×6.1 on 6S (manufacturer test table)
     [throttle, thrust gf, current A, input power W, test voltage V] */
  motorTest: [
    [0.30,  439,  1.36,  32.6, 24.15],
    [0.35,  589,  1.96,  46.7, 24.13],
    [0.40,  803,  2.91,  69.6, 24.12],
    [0.45, 1013,  3.95,  94.5, 24.10],
    [0.50, 1258,  5.25, 125.9, 24.08],
    [0.55, 1483,  6.60, 158.4, 24.05],
    [0.60, 1719,  8.10, 193.9, 24.03],
    [0.65, 1901,  9.60, 229.7, 24.00],
    [0.70, 2138, 11.45, 273.8, 23.96],
    [0.75, 2383, 13.30, 317.9, 23.93],
    [0.80, 2609, 15.43, 368.4, 23.90],
    [0.85, 2885, 17.76, 423.1, 23.86],
    [0.90, 3140, 20.30, 483.0, 23.81],
    [0.95, 3402, 23.01, 546.1, 23.76],
    [1.00, 3797, 27.44, 649.5, 23.69]
  ],

  /* Hover-endurance model (reproduces the calculator's 21.69 min) */
  endurance: {
    emptyMass: 2384.44,     // g, everything except battery and dummy, incl. 5% growth
    motors: 4,
    selectedBattery: 1240,  // g
    limit: 5000,            // g MTOW
    defaults: { specificEnergy: 287, dod: 80, esc: 90, wiring: 90, reserve: 15, aux: 60 }
  },

  battery: [
    ['Model', 'MAD 6S 16 Ah semi-solid-state Li-ion'],
    ['Nominal voltage', '22.2 V (6S)'],
    ['Capacity', '16 Ah'],
    ['Nominal energy', '355.2 Wh'],
    ['Mass', '1,240 g'],
    ['Specific energy', '≈ 286.5 Wh/kg'],
    ['Continuous discharge', '48 A (3C)'],
    ['Peak discharge', '80 A (5C)']
  ],

  /* ---- 05 Airframe: hotspot positions are % of each image ---- */
  anatomy: {
    iso: { src: 'assets/img/cad-iso.jpg', alt: 'Isometric CAD view of the quadcopter', w: 765, h: 613, spots: [
      { x: 48, y: 39, key: 'upper' }, { x: 50, y: 60, key: 'lower' }, { x: 48, y: 66, key: 'camera' },
      { x: 24, y: 22, key: 'rotor' }, { x: 63, y: 81, key: 'gear' } ] },
    front: { src: 'assets/img/cad-front.jpg', alt: 'Front CAD view of the quadcopter', w: 1400, h: 915, spots: [
      { x: 48, y: 33, key: 'upper' }, { x: 48, y: 51, key: 'lower' }, { x: 49, y: 63, key: 'camera' },
      { x: 21, y: 27, key: 'rotor' }, { x: 67, y: 81, key: 'gear' } ] },
    top: { src: 'assets/img/cad-top.jpg', alt: 'Top CAD view of the quadcopter', w: 837, h: 734, spots: [
      { x: 47, y: 50, key: 'upper' }, { x: 25, y: 26, key: 'rotor' }, { x: 47, y: 23, key: 'gap' } ] },
    notes: {
      upper:  { title: 'Upper electronics platform', text: 'The flight controller and communications electronics sit on the top deck, above the vented centre cage.' },
      lower:  { title: 'Lower section', text: 'The battery is mounted centrally to minimise its centre-of-gravity offset. The full mass-weighted CG, including the dummy mass, is still to be calculated.' },
      camera: { title: 'Underslung camera and gimbal', text: 'The Avatar HD Pro camera hangs on the GM3 gimbal for downward terrain survey.' },
      rotor:  { title: 'Motors and 18-inch propellers', text: 'Four MAD 5008 motors with Fluxer Pro 18×6.1 propellers on a symmetric four-arm layout for balanced thrust.' },
      gear:   { title: 'Landing gear', text: 'Fixed legs and skids provide ground clearance for the underslung camera.' },
      gap:    { title: 'Propeller clearance', text: 'A 680 mm motor diagonal puts adjacent motors 480.8 mm apart. Two 457.2 mm discs leave 23.6 mm between tips, assuming rigid, coplanar blades.' }
    }
  },

  frame: [
    ['Frame', 'Tarot TL680A, non-folding'],
    ['Motor diagonal', '680 mm'],
    ['Adjacent motor spacing', '480.8 mm'],
    ['Centre plates', '170 × 170 mm'],
    ['Catalogue mass', '880 g'],
    ['Tip gap, 18-inch props', '23.6 mm']
  ],

  /* ---- 06 Electrical ---- */
  arch: {
    blocks: [
      { id: 'power', n: '01', title: 'Power distribution', sub: 'MAD 6S 16 Ah → PM08-CAN → three supplies',
        inside: ['Battery to PM08-CAN through XT90S; the module measures voltage and current.',
                 'Main bus on 10 AWG to the ESC.',
                 '18 AWG tap through a 5 A fuse (F1) to the Matek BEC, set to 12 V, 5 A.',
                 'Regulated 5.3 V and battery data over CAN to the Pixhawk.'],
        why: ['Propulsion current never passes through the flight controller.',
              'Video equipment never sees full battery voltage.'] },
      { id: 'prop', n: '02', title: 'Propulsion', sub: 'Tekko32 4-in-1 ESC · 4 × MAD 5008 340KV',
        inside: ['4-in-1 ESC, 65 A per channel, no BEC.',
                 '1000 µF capacitor on the battery pads.',
                 '14 AWG phase extensions, each ≤ 500 mm.',
                 'Factory 8-pin signal cable; only four signals and ground are used.'],
        why: ['One board weighs less than four separate ESCs and needs fewer mounts.',
              'Each 65 A channel comfortably covers our motors.',
              'Supports DShot, is known to work with the flight controller and is easy to source if it fails.',
              'Trade-off: heat is concentrated, and one failed channel means a new board.'] },
      { id: 'fc', n: '03', title: 'Flight control', sub: 'Pixhawk 6X on Mini Baseboard',
        inside: ['Pixhawk 6X Rev 8 on the Mini Baseboard, 58 g.',
                 'TELEM1: receiver (CRSF). TELEM2: video on-screen display.',
                 'FMU outputs: four DShot300 motor commands.',
                 'GPS2: 5 V feed for the relay router only.'],
        why: ['The Mini Baseboard saves mass and mounting space over the standard baseboard.',
              'A separate controller module keeps later integration changes flexible.',
              'DShot-capable outputs avoid throttle-range calibration.'] },
      { id: 'rc', n: '04', title: 'RC command link', sub: 'RadioMaster DBR4, dual-band ELRS',
        inside: ['Dual-band ExpressLRS receiver with two antenna pairs (2.4 GHz and 900 MHz).',
                 'CRSF serial to TELEM1 on four 26 AWG wires (R01–R04).',
                 'Powered at 5 V from the Pixhawk.'],
        why: ['Pilot commands travel on a path separate from the rover relay.',
              'The 900 MHz band gives a redundant backup link.'] },
      { id: 'video', n: '05', title: 'FPV video and gimbal', sub: 'GT2 VTX + HD camera on a GM3 gimbal',
        inside: ['GT2 transmitter and GM3 gimbal on the 12 V rail (20 AWG).',
                 'UART2: flight data for the on-screen display. UART3: gimbal control.',
                 'Camera power and video over the factory coax.',
                 '5.8 GHz to Goggles X on the ground.'],
        why: ['The operator can redirect the camera without turning the aircraft, so the drone holds its relay position.',
              'Supports the mission need to find specific targets.',
              'Better situational awareness when troubleshooting the rover.'] },
      { id: 'relay', n: '06', title: 'NVLOS relay', sub: 'GL.iNet 2.4 GHz router, 5 V from GPS2',
        inside: ['GL-AR300M16-Ext router with two 2.4 GHz omni antennas.',
                 'Power only: 5 V from the GPS2 port on 22 AWG. No flight-controller data.',
                 'Bridges the command station and rover Wi-Fi radios.'],
        why: ['The router shares no data lines with the flight controller, so the relay stays independent of flight control.',
              'Open check: confirm GPS2 can supply the router current.'] }
    ],
    links: [
      { from: 'power', to: 'video', kind: 'power',  label: '12 V', wires: 'P10–P15 · 18/20 AWG' },
      { from: 'power', to: 'fc',    kind: 'power',  label: '5.3 V + CAN', wires: 'F01–F08 · 24/26 AWG' },
      { from: 'power', to: 'prop',  kind: 'power',  label: '6S main feed', wires: 'P03/P04 · 10 AWG · XT90' },
      { from: 'fc',    to: 'prop',  kind: 'signal', label: 'DShot300', wires: 'S01–S05 · 26 AWG' },
      { from: 'fc',    to: 'video', kind: 'signal', label: 'OSD UART', wires: 'V01–V03 · 26 AWG' },
      { from: 'fc',    to: 'rc',    kind: 'both',   label: 'CRSF + 5 V', wires: 'R01–R04 · 26 AWG' },
      { from: 'fc',    to: 'relay', kind: 'power',  label: '5 V', wires: 'G01/G02 · 22 AWG' }
    ]
  },

  wiring: {
    full: 'assets/img/wiring-diagram-full.png',
    preview: 'assets/img/wiring-diagram-preview.jpg',
    size: [4012, 4131],
    /* Regions of the full diagram, in image pixels [x, y, width, height] */
    zones: [
      { label: 'Whole diagram', box: [0, 0, 4012, 4131] },
      { label: 'Battery and power module', box: [1150, 380, 1400, 480] },
      { label: 'Flight controller', box: [600, 930, 2080, 1040] },
      { label: 'ESC and motors', box: [2680, 370, 1330, 1040] },
      { label: 'Relay router', box: [2940, 1360, 1070, 700] },
      { label: 'Video and gimbal', box: [620, 2050, 3300, 1220] }
    ],
    gauges: [
      ['10 AWG', 'Main battery feed', 'power'],
      ['14 AWG', 'Motor phase extensions', 'phase'],
      ['18 AWG', 'Fused accessory tap and 12 V trunk', 'power'],
      ['20 AWG', 'GT2 and GM3 power', 'power'],
      ['22 AWG', 'Router power', 'power'],
      ['24 AWG', 'Flight-controller supply and returns', 'power'],
      ['26 AWG', 'UART, CAN and DShot signals', 'signal']
    ],
    prefixes: [['P', 'Power'], ['F', 'FC supply / CAN'], ['S', 'DShot'], ['R', 'Receiver'], ['V', 'Video UART'], ['G', 'Router power']],
    checks: [
      'Battery is rated 48 A continuous and 80 A for under 10 s; the cable plan allows 40 A continuous.',
      'Confirm the motor KV before first spin.',
      'A full pack can reach 25.8 V: confirm the Tekko32 accepts it.',
      'GT2 and GM3 run only from regulated 12 V.',
      'Verify that GPS2 can power the router.',
      'Keep the main battery disconnected while building harnesses.'
    ]
  },

  ports: [
    ['POWER1', 'PM08-CAN', '5.3 V supply', 'power'],
    ['CAN1', 'PM08-CAN', 'DroneCAN battery data', 'can'],
    ['TELEM1', 'DBR4 receiver', 'CRSF, plus 5 V out', 'signal'],
    ['TELEM2', 'GT2 VTX', 'MSP on-screen display', 'signal'],
    ['FMU OUT 1–4', 'Tekko32 ESC', 'DShot300, motors 1–4', 'signal'],
    ['GPS2', 'GL.iNet router', '5 V power only', 'power'],
    ['GPS1', 'Reserved', 'GNSS / compass, not yet selected', 'open'],
    ['POWER2', 'Unused', 'Capped', 'open']
  ],

  software: [
    { device: 'TX16S MK3', runs: 'EdgeTX + ExpressLRS', does: 'Sticks → 16 channels', via: 'ELRS radio' },
    { device: 'DBR4 receiver', runs: 'ExpressLRS 3.x', does: 'RF → CRSF frames', via: 'CRSF' },
    { device: 'Pixhawk 6X', runs: 'ArduPilot Copter (proposed)', does: 'Attitude control, failsafes', via: 'DShot300 · MSP · DroneCAN', core: true },
    { device: 'Tekko32 ESC', runs: 'Factory firmware', does: 'Drives the four motors', via: '' },
    { device: 'PM08-CAN', runs: 'DroneCAN node', does: 'Battery voltage and current', via: 'DroneCAN' },
    { device: 'GT2 VTX → Goggles X', runs: 'Walksnail Avatar', does: 'HD video + OSD', via: '5.8 GHz' }
  ],

  /* ---- 07 Communications ---- */
  links: {
    hop: 1.2,           // km, conservative design distance per hop
    marginTarget: 20,   // dB
    loss: 2,            // dB, connectors and implementation losses
    options: [
      { id: 'rc24', group: 'rc', name: 'RC control · 2.4 GHz', short: 'RC 2.4 GHz', f: 2400, ptx: 30, gtx: 2, grx: 2, sens: -105,
        gear: 'TX16S MK3 → DBR4', cable: 4.36,
        note: 'Primary control band. The 20 dB margin holds to about 7 km in free space.' },
      { id: 'rc900', group: 'rc', name: 'RC control · 900 MHz', short: 'RC 900 MHz', f: 900, ptx: 30, gtx: 2, grx: 2, sens: -112,
        gear: 'TX16S MK3 → DBR4', cable: 2.56,
        note: 'Backup band with lower path loss. Use depends on local frequency rules and on rover radios sharing the band.' },
      { id: 'fpv', group: 'fpv', name: 'FPV video · 5.8 GHz', short: 'FPV stock', f: 5800, ptx: 33, gtx: 0, grx: 2, sens: -90,
        gear: 'Avatar GT2 → Goggles X', cable: 0,
        note: 'Highest path loss of the three. With the stock antenna the 20 dB margin ends near 0.6 km.' },
      { id: 'fpv8', group: 'fpv', name: 'FPV video · 8 dBi antenna', short: 'FPV 8 dBi', f: 5800, ptx: 33, gtx: 0, grx: 8, sens: -90,
        gear: 'Avatar GT2 → Goggles X, directional antenna', cable: 0,
        note: 'A directional ground antenna lifts the margin to 19.7 dB at 1.2 km. To be confirmed by range test before purchase.' },
      { id: 'relay', group: 'relay', name: 'Rover relay · 2.4 GHz', short: 'Relay', f: 2400, ptx: 20, gtx: 12, grx: 5, sens: -90,
        gear: 'Rocket M2 ↔ GL-AR300M-Ext', cable: 0,
        note: 'Same budget in both directions, and for each hop: base to drone, drone to rover.' }
    ],
    table: [
      ['Radio control', '2.4 GHz (900 MHz backup)', 'RadioMaster TX16S MK3 + DBR4', 'Flight commands and receiver telemetry'],
      ['FPV video', '5.8 GHz', 'Walksnail Avatar GT2 + Goggles X', '1080p, 60 Hz video for reconnaissance'],
      ['Rover relay', '2.4 GHz Wi-Fi', 'Rocket M2 + GL-AR300M-Ext', 'Base-station link extended to the rover']
    ]
  },

  /* ---- 08 Testing ---- */
  progress: [
    { stage: 'Design', state: 'done', items: ['Design requirements', 'Payload selection', 'Mass estimation', 'Propulsion system', 'Battery selection', 'Frame selection', 'Flight-time estimate'] },
    { stage: 'Preliminary testing', state: 'done', items: ['2.4 GHz repeater compatibility'] },
    { stage: 'Parts ordering', state: 'done', items: ['Electrical, payload and mechanical components ordered'] },
    { stage: 'Component testing', state: 'next', items: ['Motor thrust validation', 'Battery performance', 'Frame measurements', 'Flight-controller checks', 'Payload performance'] }
  ],

  ping: {
    extender: { title: 'Wi-Fi extender mode', verdict: 'Failed', ok: false, lines: [
      '> ping 192.168.1.20', '',
      'Pinging 192.168.1.20 with 32 bytes of data:',
      'Request timed out.', 'Request timed out.', 'Request timed out.', 'Request timed out.', '',
      'Ping statistics for 192.168.1.20:',
      '    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)' ] },
    router: { title: 'Router mode', verdict: 'Passed', ok: true, lines: [
      '> ping 192.168.1.20', '',
      'Pinging 192.168.1.20 with 32 bytes of data:',
      'Reply from 192.168.1.20: bytes=32 time=30ms TTL=64',
      'Reply from 192.168.1.20: bytes=32 time=2ms TTL=64',
      'Reply from 192.168.1.20: bytes=32 time=3ms TTL=64',
      'Reply from 192.168.1.20: bytes=32 time=2ms TTL=64', '',
      'Ping statistics for 192.168.1.20:',
      '    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)' ] }
  },

  validation: [
    ['Repeater ↔ Rocket M2 connectivity', 'Short-range ping, router mode', 'bench'],
    ['Repeater long-range and throughput', 'Outdoor ping, packet loss and throughput logs', 'pending'],
    ['Motor and propeller thrust', 'Thrust stand at hover and maximum throttle', 'pending'],
    ['Battery performance', 'Mass, discharge curve, usable capacity, sag', 'pending'],
    ['Flight controller and ESC', 'Bench power-up, DShot spin without propellers', 'pending'],
    ['FPV range', 'Range test, then select the replacement antenna', 'pending'],
    ['Frame measurements', 'Mounting pattern, propeller clearance, CG', 'pending']
  ],

  /* ---- 09 Challenges, risk and plan ---- */
  margins: [
    ['Mass growth', '5%'], ['Wiring loss', '10%'], ['ESC loss', '10%'],
    ['Battery reserve', '15%'], ['Usable depth of discharge', '80%'], ['Minimum RF link margin', '20 dB']
  ],

  cableLoss: [
    { band: '900 MHz', alpha: 12.8, loss: 2.56 },
    { band: '2.4 GHz', alpha: 21.8, loss: 4.36 }
  ],

  risks: [
    { id: 1, hazard: 'Mid-flight connection loss',
      cause: 'Telemetry or controller link drops during an NVLOS relay.',
      before: { l: 'Likely', s: 'Severe', level: 'High' },
      action: 'ArduPilot return-to-launch failsafe on board, plus a redundant 900 MHz backup link.',
      after: { l: 'Unlikely', s: 'Minor', level: 'Low' } },
    { id: 2, hazard: 'Premature flight crash',
      cause: 'Untested flight parameters cause a crash on first launch.',
      before: { l: 'Possible', s: 'Critical', level: 'Medium' },
      action: 'Three-stage progressive testing: motors without propellers, tethered hover, then free flight.',
      after: { l: 'Unlikely', s: 'Minor', level: 'Low' } },
    { id: 3, hazard: 'Thermal overheating',
      cause: '35–40 °C ambient causes ESC throttling or battery sag.',
      before: { l: 'Likely', s: 'Critical', level: 'High' },
      action: 'ESC mounted in the prop wash with heatsinks, RPM filtering, and an 80 °C telemetry threshold.',
      after: { l: 'Unlikely', s: 'Moderate', level: 'Low' } }
  ],
  riskAxes: { likelihood: ['Unlikely', 'Possible', 'Likely'], severity: ['Minor', 'Moderate', 'Severe', 'Critical'] },

  phases: [
    { n: 1, name: 'Design', when: 'Semester 1', state: 'done',
      text: 'System requirements, communication hardware, mass and power budgets, initial CAD.' },
    { n: 2, name: 'Subsystem testing', when: 'Semester 1', state: 'active',
      text: 'Repeater hardware tested with the GNSS-Comms team; component specifications reviewed.' },
    { n: 3, name: 'Component testing', when: 'Winter – Semester 2', state: 'next',
      text: 'Final CAD and FEA; performance validation of every component.' },
    { n: 4, name: 'Integration', when: 'Semester 2', state: 'next',
      text: 'Electrical and mechanical assembly; flight-controller and payload programming.' },
    { n: 5, name: 'Flight testing', when: 'Semester 2', state: 'next',
      text: 'PID tuning, hover endurance, range tests, mission planning.' },
    { n: 6, name: 'CV integration', when: 'Semester 2', state: 'next',
      text: 'Benchmark detection models and run integrated mission tests.' }
  ],

  /* Gantt chart (dates are Excel serial numbers from the team workbook; week 1 starts at 46245).
     reportDate marks when this status was recorded: 46340 = 14 Nov 2026. */
  gantt: {
    origin: 46245, weeks: 44, reportDate: 46340,
    bands: [ ['Semester 1', 17], ['Winter', 5], ['Semester 2', 17], ['Summer', 5] ],
    tasks: [
      [1, 'Planning', 'Confirm requirements and design baseline', 'Team', 46247, 46259, 1],
      [2, 'Design', 'Compare UAV configurations', 'Payloads', 46247, 46259, 1],
      [3, 'Design', 'Payload selections', 'Payloads', 46247, 46294, 1],
      [4, 'Design', 'Estimate MTOW and component mass budget', 'Airframe', 46266, 46308, 1],
      [5, 'Design', 'Motor and propeller sizing and selection', 'Propulsion', 46266, 46308, 1],
      [6, 'Design', 'Battery selection', 'Propulsion', 46266, 46308, 1],
      [7, 'Build', 'CAD assembly and payload mounting design', 'Airframe', 46301, 46308, 1],
      [8, 'Design', 'Final design specifications check', 'Team', 46301, 46308, 1],
      [9, 'Comms', 'Configure Rocket M2 / GL.iNet network', 'Payloads', 46280, 46345, 0.6],
      [10, 'Comms', 'Repeater long-range connectivity testing', 'Payloads', 46336, 46347, 0],
      [11, 'Build', 'Ordering of components', 'Team', 46315, 46321, 1],
      [12, 'Build', 'Receive and inspect components', 'Team', 46315, 46329, 0.8],
      [13, 'Testing', 'Motor and propeller thrust validation', 'Propulsion', 46336, 46343, 0],
      [14, 'Testing', 'Battery performance validation', 'Propulsion', 46336, 46343, 0],
      [15, 'Testing', 'FC and ESC validation', 'Flight systems', 46336, 46343, 0],
      [16, 'Testing', 'FPV component validation', 'Payloads', 46336, 46343, 0],
      [17, 'Testing', 'Frame measurements check', 'Airframe', 46336, 46343, 0],
      [18, 'Milestone', 'Interim presentation', 'Team', 46328, 46328, 1],
      [19, 'Milestone', 'Interim report submission', 'Team', 46342, 46342, 0],
      [20, 'Design', 'Literature review and design of new CV model', 'Payloads', 46364, 46441, 0],
      [21, 'Testing', 'Frame FEA analysis', 'Airframe', 46364, 46406, 0],
      [22, 'Testing', 'CFD heat-transfer analysis', 'Propulsion', 46364, 46406, 0],
      [23, 'Design', 'Component mounting designs', 'Airframe', 46364, 46406, 0],
      [24, 'Build', 'Mechanical and electrical integration', 'Team', 46406, 46412, 0],
      [25, 'Testing', 'Flight-controller PID tuning', 'Flight systems', 46399, 46426, 0],
      [26, 'Testing', 'Controlled flight and hover testing', 'Flight systems', 46420, 46447, 0],
      [27, 'Testing', 'Limit testing of CV script', 'Payloads', 46441, 46468, 0],
      [28, 'Comms', 'Airborne network integration and range tests', 'Communications', 46427, 46468, 0],
      [29, 'Milestone', 'SAR submission', 'Team', 46476, 46476, 0],
      [30, 'Testing', 'Final requirements validation', 'Team', 46455, 46496, 0],
      [31, 'Milestone', 'Final report', 'Team', 46476, 46476, 0],
      [32, 'Milestone', 'Final presentation', 'Team', 46490, 46490, 0],
      [33, 'Milestone', 'EDIC showcase', 'Team', 46493, 46493, 0],
      [34, 'Testing', 'Mission planning and challenge preparation', 'Team', 46490, 46538, 0],
      [35, 'Milestone', 'Competition week', 'Team', 46539, 46543, 0]
    ]
  },

  /* ---- 10 Team ---- */
  team: [
    { id: 'julian', name: 'Julian Cheah Ming Feng', short: 'Julian', role: 'Project lead · Communication systems', track: 'Robotics specialisation',
      photo: 'assets/img/team-julian.jpg',
      work: ['RF communication architecture', 'RF component selection', 'CAD assembly modelling', 'CV model testing and integration', 'Project coordination and timeline'],
      sections: ['comms', 'testing'] },
    { id: 'joel', name: 'Joel Jesukumar William', short: 'Joel', role: 'Electrical and control systems', track: 'Robotics specialisation',
      photo: 'assets/img/team-joel.jpg',
      work: ['Wiring architecture', 'Flight-controller and ESC selection', 'CAD assembly modelling', 'Controller software integration', 'PID tuning'],
      sections: ['electrical'] },
    { id: 'benedict', name: 'Benedict Lim Wei Chen', short: 'Benedict', role: 'Propulsion and power systems', track: 'Aeronautical specialisation',
      photo: 'assets/img/team-benedict.png',
      work: ['Motor–propeller selection', 'Battery sizing and modelling', 'Thrust testing and validation', "CAD assembly modelling"],
      sections: ['concept', 'propulsion'] },
    { id: 'zihann', name: 'Looi Zi Hann', short: 'Zi Hann', role: 'Mechanical and structural systems', track: 'Aeronautical specialisation',
      photo: 'assets/img/team-zihann.jpg',
      work: ['Structural FEA', 'CAD assembly modelling', 'Mechanical integration and testing'],
      sections: ['airframe'] }
  ],

  workstreams: {
    phases: ['Design', 'Subsystem testing', 'Component testing', 'Integration', 'Flight testing'],
    rows: [
      ['Julian', 'RF selection', 'Repeater testing', 'FPV and signal testing', 'CV research and software', 'CV and range testing'],
      ['Joel', 'FC / ESC selection', 'Wiring architecture', 'FC / ESC testing', 'Electrical assembly and software', 'PID tuning'],
      ['Benedict', 'Mass and power budget', 'Motor and battery sizing', 'Motor thrust testing', 'Mechanical assembly', 'Endurance and hover testing'],
      ['Zi Hann', 'Frame selection', 'Frame selection', 'CAD design', 'FEA and frame build', 'Fine-tune component fits']
    ]
  },

  subsystems: [
    ['Chassis Electrical', 'All electrical systems on board the rover.'],
    ['Chassis Mechanical', 'Chassis design and fabrication for other subsystems.'],
    ['Auto-Navigation', 'Autonomous navigation algorithms and tuning.'],
    ['Arm', 'Main manipulator and end-effector.'],
    ['Astrobiology', 'Soil sampling and sample testing.'],
    ['Command & Control (C2)', 'Base-station logistics and mission planning.'],
    ['GNSS-Comms', 'Antennas, radio links and GPS for rover, drone and base.'],
    ['Drone', 'A quadcopter that assists the rover in the Delivery and Autonomy missions.']
  ],

  /* ---- Appendices ---- */
  bom: [
    /* [group, item, part, qty, unit g, mean W, peak W] */
    ['Payload', '2.4 GHz repeater', 'GL.iNet GL-AR300M16-Ext', 1, 39, 2, 10],
    ['Payload', 'Repeater antenna', '2.4 GHz 3 dBi omni, RP-SMA', 2, 6, null, null],
    ['Payload', 'RC receiver (budget allowance)', 'RadioMaster DBR4 dual-band ELRS', 1, 27, 0.5, 1.5],
    ['Payload', 'Camera, VTX and antennas', 'Walksnail Avatar GT2 kit', 1, 180, 12, 16],
    ['Payload', 'Camera gimbal', 'Walksnail GM3 V2', 1, 48, 3, 18],
    ['Avionics', 'ESC', 'Holybro Tekko32 F4 Metal 4-in-1 65 A', 1, 15.8, null, null],
    ['Avionics', 'Flight controller', 'Holybro Pixhawk 6X Rev 8 + Mini Baseboard', 1, 58, 5, 8],
    ['Avionics', 'Power module', 'Holybro PM08-CAN', 1, 185, 2, 4],
    ['Avionics', 'Buck converter', 'Matek BEC12S-PRO', 1, 30, 1, 3],
    ['Avionics', 'Fuse holder and fuse', 'Inline MINI blade, 5 A', 1, 2, null, null],
    ['Avionics', 'Wiring allowance', 'Estimated harness mass', 1, 20, null, null],
    ['Airframe', 'Frame', 'Tarot TL680A', 1, 880, null, null],
    ['Propulsion', 'Motor', 'MAD 5008 EEE 340KV', 4, 127, null, null],
    ['Propulsion', 'Propeller', 'Fluxer Pro 18×6.1', 4, 37, null, null],
    ['Energy', 'Battery', 'MAD 6S 16 Ah semi-solid-state', 1, 1240, null, null],
    ['Energy', 'Dummy mass', 'Inert, equal to battery mass', 1, 1240, null, null]
  ],
  bomGrowth: 0.05,

  ground: [
    ['Radio controller', 'RadioMaster TX16S MK3 (ELRS)'],
    ['FPV goggles', 'Walksnail Avatar HD Goggles X'],
    ['Base-station radio', 'Rocket M2 (operated with GNSS-Comms)'],
    ['Antenna extension', '20 m LMR400 coaxial cable'],
    ['Video extension', 'HDMI cable from goggles to monitor']
  ],

  fc: {
    cols: ['Controller', 'Processor', 'Mass (g)', 'IMUs', 'Baros', 'UARTs', 'CAN', 'DShot outs', 'Power inputs', 'Assessment'],
    rows: [
      ['Holybro Pixhawk 6X Rev 8 + Mini Baseboard', 'STM32H753', 57.8, 3, 2, 4, 2, 8, 2, 'Best sensor isolation and expansion; the Mini Baseboard cuts airborne mass.', true],
      ['Holybro Pixhawk 6C', 'STM32H743', 34.6, 2, 1, 3, 2, 8, 2, 'Good value and light, but less sensor redundancy.'],
      ['CubePilot Cube Orange+ (Mini Carrier)', 'STM32H757', 53, 3, 2, 3, 1, 6, 2, 'Strong redundancy; the mini carrier exposes fewer interfaces.'],
      ['CUAV Nora+', 'STM32H743', 80, 3, 2, 5, 2, 12, 2, 'Very capable, but heavier and costlier.'],
      ['Holybro Durandal', 'STM32H743', 68.8, 2, 1, 5, 2, 5, 2, 'Solid I/O; older sensors and fewer DShot outputs.'],
      ['Holybro Kakute H7 V2', 'STM32H743', 8, 1, 1, 6, 0, 8, 1, 'Reference only: no redundant IMUs or power inputs.']
    ]
  },

  abbreviations: [
    ['AGL', 'Above ground level'], ['AWG', 'American wire gauge'], ['BEC', 'Battery eliminator circuit'],
    ['C2', 'Command and control'], ['CAD', 'Computer-aided design'], ['CAN', 'Controller area network'],
    ['CG', 'Centre of gravity'], ['CRSF', 'Crossfire serial protocol'], ['CV', 'Computer vision'],
    ['DoD', 'Depth of discharge'], ['ELRS', 'ExpressLRS radio-control link'], ['ESC', 'Electronic speed controller'],
    ['FC', 'Flight controller'], ['FEA', 'Finite element analysis'], ['FPV', 'First-person view'],
    ['FSPL', 'Free-space path loss'], ['GNSS', 'Global navigation satellite system'], ['LOS', 'Line of sight'],
    ['MDRS', 'Mars Desert Research Station'], ['MRT', 'Mars Rover Team'], ['MTOW', 'Maximum take-off weight'],
    ['NVLOS', 'Non-visual line of sight'], ['OSD', 'On-screen display'], ['PID', 'Proportional–integral–derivative'],
    ['RC', 'Radio control'], ['RF', 'Radio frequency'], ['RTL', 'Return to launch'],
    ['SAR', 'System Acceptance Review'], ['T/W', 'Thrust-to-weight ratio'], ['UART', 'Universal asynchronous receiver-transmitter'],
    ['URC', 'University Rover Challenge'], ['VTX', 'Video transmitter']
  ],

  references: [
    ['The Mars Society', 'University Rover Challenge 2027: requirements and guidelines', 'https://urc.marssociety.org/home/requirements-guidelines'],
    ['PX4 Autopilot', 'Holybro Pixhawk 6X flight controller', 'https://docs.px4.io/main/en/flight_controller/pixhawk6x'],
    ['ArduPilot', 'Copter documentation', 'https://ardupilot.org/copter/'],
    ['RadioMaster', 'DBR4 dual-band Xross Gemini ExpressLRS receiver', 'https://radiomasterrc.com/collections/dual-band-expresslrs-receivers/products/dbr4-dual-band-xross-gemini-expresslrs-receiver'],
    ['RadioMaster', 'TX16S MK3 radio controller', 'https://radiomasterrc.com/products/tx16s-mk3-radio-controller'],
    ['Caddx FPV', 'Walksnail Avatar GT2 kit', 'https://www.caddxfpv.com/products/walksnail-avatar-gt2-kit'],
    ['Caddx FPV', 'Walksnail GM3 V2 gimbal', 'https://www.caddxfpv.com/products/caddxfpv-gimbal-gm3-v2'],
    ['Tarot RC', 'TL680A quadcopter frame', 'http://www.tarotrc.com/Product/Detail.aspx?Lang=en&Id=d75355bf-3ce7-4a2d-9850-638836ae450d'],
    ['Manufacturer test data', 'MAD 5008 EEE 340KV with Fluxer Pro 18×6.1 on 6S: thrust-test table supplied to the team', ''],
    ['NUS Mars Rover Team', 'URC 2026 drone team design review (internal)', '']
  ]
};
