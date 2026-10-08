import * as THREE from 'three';

export interface CitySquare {
  file: string; // 'A' - 'H'
  rank: number; // 1 - 8
  isDark: boolean;
  x: number;
  z: number;
  districtName: string;
  pieceTheme: 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king' | 'plaza';
}

export interface BuildingCollider {
  box: THREE.Box3;
  type: string;
}

export interface StuntRamp {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  mesh: THREE.Mesh;
}

export class ChessCityBuilder {
  public scene: THREE.Scene;
  public colliders: BuildingCollider[] = [];
  public squares: CitySquare[] = [];
  public stuntRamps: StuntRamp[] = [];
  public spawnPoints: THREE.Vector3[] = [];
  public vehicleSpawns: { position: THREE.Vector3; rotationY: number; type: string }[] = [];

  // Street network for AI pathing
  public roadNodes: THREE.Vector3[] = [];

  private squareSize = 64; // Size of each chess square
  private roadWidth = 14;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public buildCity() {
    this.createSkyAndAtmosphere();
    this.createOceanAndTerrain();
    this.createChessBoardGrid();
    this.createRoadNetwork();
    this.createDistrictArchitecture();
    this.createStuntRamps();
    this.createStreetFurniture();
    this.populateSpawnPoints();
  }

  private createSkyAndAtmosphere() {
    // Dynamic Los Angeles / Los Caissas golden sunset / smog atmosphere
    this.scene.background = new THREE.Color(0xf2994a);
    this.scene.fog = new THREE.FogExp2(0xe67e22, 0.0035);

    // Warm Key Directional Sunlight
    const sunLight = new THREE.DirectionalLight(0xfff3d6, 1.8);
    sunLight.position.set(200, 350, 150);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 800;
    const d = 300;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.scene.add(sunLight);

    // Cool sky fill light
    const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x334466, 0.9);
    this.scene.add(hemiLight);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffe0b2, 0.4);
    this.scene.add(ambientLight);
  }

  private createOceanAndTerrain() {
    // Surrounding coastal water and landscape base
    const waterGeo = new THREE.PlaneGeometry(1600, 1600);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1a365d,
      roughness: 0.1,
      metalness: 0.8,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -1.2;
    this.scene.add(water);

    // Sandy coastal shore & mountain silhouettes
    const islandGeo = new THREE.BoxGeometry(600, 1.5, 600);
    const islandMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.9,
    });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.y = -0.75;
    island.receiveShadow = true;
    this.scene.add(island);

    // Background Mountain Ridge (like Vinewood Hills)
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.95 });
    for (let i = 0; i < 12; i++) {
      const hillGeo = new THREE.ConeGeometry(50 + Math.random() * 40, 60 + Math.random() * 50, 6);
      const hill = new THREE.Mesh(hillGeo, hillMat);
      const angle = (i / 12) * Math.PI * 2;
      const radius = 380 + Math.random() * 50;
      hill.position.set(Math.cos(angle) * radius, 15, Math.sin(angle) * radius);
      this.scene.add(hill);
    }
  }

  private createChessBoardGrid() {
    const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const totalHalf = 4 * this.squareSize;

    for (let r = 1; r <= 8; r++) {
      for (let f = 0; f < 8; f++) {
        const fileChar = files[f];
        const isDark = (f + r) % 2 === 0;
        const cx = (f - 3.5) * this.squareSize;
        const cz = (r - 4.5) * this.squareSize;

        let pieceTheme: CitySquare['pieceTheme'] = 'pawn';
        let districtName = `Square ${fileChar}${r}`;

        if (r === 1 || r === 8) {
          if (f === 0 || f === 7) {
            pieceTheme = 'rook';
            districtName = `${fileChar}${r} - Rook Fortress`;
          } else if (f === 1 || f === 6) {
            pieceTheme = 'knight';
            districtName = `${fileChar}${r} - Knight Arena`;
          } else if (f === 2 || f === 5) {
            pieceTheme = 'bishop';
            districtName = `${fileChar}${r} - Bishop Spires`;
          } else if (f === 3) {
            pieceTheme = 'queen';
            districtName = `${fileChar}${r} - Queen's Promenade`;
          } else {
            pieceTheme = 'king';
            districtName = `${fileChar}${r} - King's High Court`;
          }
        } else if ((r === 4 || r === 5) && (f === 3 || f === 4)) {
          pieceTheme = 'plaza';
          districtName = `Grand Caissa Central Plaza (${fileChar}${r})`;
        } else if (r === 2) {
          districtName = `White Pawn Suburbs (${fileChar}${r})`;
        } else if (r === 7) {
          districtName = `Black Syndicate Slums (${fileChar}${r})`;
        } else {
          districtName = `Avenue ${fileChar} - Rank ${r}`;
        }

        this.squares.push({
          file: fileChar,
          rank: r,
          isDark,
          x: cx,
          z: cz,
          districtName,
          pieceTheme,
        });

        // Sidewalk / Plaza tile for this square
        const tileInnerSize = this.squareSize - this.roadWidth;
        const tileGeo = new THREE.BoxGeometry(tileInnerSize, 0.4, tileInnerSize);
        const tileMat = new THREE.MeshStandardMaterial({
          color: isDark ? 0x222225 : 0xe2e8f0,
          roughness: 0.6,
          metalness: 0.2,
        });
        const tileMesh = new THREE.Mesh(tileGeo, tileMat);
        tileMesh.position.set(cx, 0.2, cz);
        tileMesh.receiveShadow = true;
        this.scene.add(tileMesh);

        // Marble curb border
        const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 });
        const curbNorth = new THREE.Mesh(new THREE.BoxGeometry(tileInnerSize, 0.5, 0.6), curbMat);
        curbNorth.position.set(cx, 0.25, cz - tileInnerSize / 2);
        this.scene.add(curbNorth);
      }
    }
  }

  private createRoadNetwork() {
    const halfGrid = 4 * this.squareSize;
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x18181b, // Dark fresh asphalt
      roughness: 0.8,
      metalness: 0.1,
    });

    // Main asphalt ground layer
    const groundGeo = new THREE.PlaneGeometry(halfGrid * 2 + 30, halfGrid * 2 + 30);
    const ground = new THREE.Mesh(groundGeo, roadMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Yellow double center lines on all road corridors
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let i = -4; i <= 4; i++) {
      const coord = i * this.squareSize;

      // North-South yellow road line
      const nsLine = new THREE.Mesh(new THREE.PlaneGeometry(0.3, halfGrid * 2), lineMat);
      nsLine.rotation.x = -Math.PI / 2;
      nsLine.position.set(coord, 0.02, 0);
      this.scene.add(nsLine);

      // East-West yellow road line
      const ewLine = new THREE.Mesh(new THREE.PlaneGeometry(halfGrid * 2, 0.3), lineMat);
      ewLine.rotation.x = -Math.PI / 2;
      ewLine.position.set(0, 0.02, coord);
      this.scene.add(ewLine);

      // Save intersection nodes for traffic and GPS
      for (let j = -4; j <= 4; j++) {
        this.roadNodes.push(new THREE.Vector3(coord, 0.5, j * this.squareSize));
      }
    }

    // Zebra Crossings at intersections
    for (let i = -3; i <= 3; i++) {
      for (let j = -3; j <= 3; j++) {
        const x = (i + 0.5) * this.squareSize;
        const z = (j + 0.5) * this.squareSize;
        // White stripes
        for (let s = -2; s <= 2; s++) {
          const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.4), whiteLineMat);
          stripe.rotation.x = -Math.PI / 2;
          stripe.position.set(x + s * 1.8, 0.02, z);
          this.scene.add(stripe);
        }
      }
    }
  }

  private createDistrictArchitecture() {
    this.squares.forEach(sq => {
      const cx = sq.x;
      const cz = sq.z;

      switch (sq.pieceTheme) {
        case 'queen':
          this.buildQueenCitadel(cx, cz);
          break;
        case 'king':
          this.buildKingPalace(cx, cz);
          break;
        case 'rook':
          this.buildRookFortress(cx, cz);
          break;
        case 'bishop':
          this.buildBishopCathedral(cx, cz);
          break;
        case 'knight':
          this.buildKnightArena(cx, cz);
          break;
        case 'plaza':
          this.buildGrandPlaza(cx, cz);
          break;
        case 'pawn':
        default:
          this.buildPawnSuburbs(cx, cz, sq.isDark);
          break;
      }
    });
  }

  // --- 3D Chess Themed Architecture Builders ---

  private buildQueenCitadel(x: number, z: number) {
    // Tallest luxury glass skyscraper with golden crown finial
    const height = 110;
    const bodyGeo = new THREE.CylinderGeometry(14, 18, height, 12);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.1,
      metalness: 0.9,
    });
    const tower = new THREE.Mesh(bodyGeo, bodyMat);
    tower.position.set(x, height / 2 + 0.5, z);
    tower.castShadow = true;
    tower.receiveShadow = true;
    this.scene.add(tower);
    this.addCollider(tower, 36, height, 36, 'queen_citadel');

    // Golden Queen Crown Balcony
    const crownGeo = new THREE.CylinderGeometry(18, 12, 14, 8, 1, true);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.95,
      emissive: 0x78350f,
    });
    const crown = new THREE.Mesh(crownGeo, goldMat);
    crown.position.set(x, height + 7, z);
    this.scene.add(crown);

    // Glowing Crown Spikes
    for (let i = 0; i < 8; i++) {
      const spikeGeo = new THREE.ConeGeometry(2, 6, 6);
      const spike = new THREE.Mesh(spikeGeo, goldMat);
      const angle = (i / 8) * Math.PI * 2;
      spike.position.set(x + Math.cos(angle) * 15, height + 16, z + Math.sin(angle) * 15);
      this.scene.add(spike);

      // Glowing orb on crown
      const orbGeo = new THREE.SphereGeometry(1.2, 8, 8);
      const orbMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(x + Math.cos(angle) * 15, height + 19, z + Math.sin(angle) * 15);
      this.scene.add(orb);
    }

    // Helipad / Rooftop
    const heliGeo = new THREE.CylinderGeometry(10, 10, 1, 16);
    const heliMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const heli = new THREE.Mesh(heliGeo, heliMat);
    heli.position.set(x, height + 14, z);
    this.scene.add(heli);

    // Neon signage at entrance: "THE REGAL QUEEN"
    const signMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(16, 2.5, 1), signMat);
    sign.position.set(x, 7, z + 19);
    this.scene.add(sign);

    // Vehicle Spawn: Queen Hypercar
    this.vehicleSpawns.push({
      position: new THREE.Vector3(x + 22, 1, z),
      rotationY: Math.PI / 2,
      type: 'queen_hypercar',
    });
  }

  private buildKingPalace(x: number, z: number) {
    // Grand Domed Palace with Cross Finial and Portico
    const height = 45;
    const palaceGeo = new THREE.BoxGeometry(38, height, 38);
    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3,
      metalness: 0.2,
    });
    const palace = new THREE.Mesh(palaceGeo, marbleMat);
    palace.position.set(x, height / 2 + 0.5, z);
    palace.castShadow = true;
    palace.receiveShadow = true;
    this.scene.add(palace);
    this.addCollider(palace, 38, height, 38, 'king_palace');

    // Grand Dome
    const domeGeo = new THREE.SphereGeometry(15, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const goldDomeMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.3,
      metalness: 0.9,
    });
    const dome = new THREE.Mesh(domeGeo, goldDomeMat);
    dome.position.set(x, height + 0.5, z);
    this.scene.add(dome);

    // Cross Finial on top of dome
    const crossVert = new THREE.Mesh(new THREE.BoxGeometry(1.5, 7, 1.5), goldDomeMat);
    crossVert.position.set(x, height + 18, z);
    this.scene.add(crossVert);
    const crossHoriz = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.5, 1.5), goldDomeMat);
    crossHoriz.position.set(x, height + 19, z);
    this.scene.add(crossHoriz);

    // Columns
    for (let c = -2; c <= 2; c++) {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.4, 18, 12),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      col.position.set(x + c * 7, 9, z + 21);
      this.scene.add(col);
    }
  }

  private buildRookFortress(x: number, z: number) {
    // Heavy Bastion / Federal Bank with crenellated parapets
    const height = 55;
    const rookGeo = new THREE.CylinderGeometry(16, 18, height, 16);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.85,
      metalness: 0.15,
    });
    const rook = new THREE.Mesh(rookGeo, stoneMat);
    rook.position.set(x, height / 2 + 0.5, z);
    rook.castShadow = true;
    this.scene.add(rook);
    this.addCollider(rook, 36, height, 36, 'rook_fortress');

    // Crenellated Parapets (Battlement teeth)
    const crenelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    for (let i = 0; i < 8; i++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 3), crenelMat);
      const angle = (i / 8) * Math.PI * 2;
      tooth.position.set(x + Math.cos(angle) * 16, height + 2.5, z + Math.sin(angle) * 16);
      tooth.rotation.y = -angle;
      this.scene.add(tooth);
    }

    // Heavy Bank Vault Door Sign
    const vaultDoorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const vaultDoor = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 1, 16), vaultDoorMat);
    vaultDoor.rotation.x = Math.PI / 2;
    vaultDoor.position.set(x, 5, z + 18.2);
    this.scene.add(vaultDoor);

    // Spawn Rook Armored Cruiser
    this.vehicleSpawns.push({
      position: new THREE.Vector3(x + 22, 1, z),
      rotationY: 0,
      type: 'rook_apc',
    });
  }

  private buildBishopCathedral(x: number, z: number) {
    // Sharp diagonal gothic spires with glowing mitre
    const height = 75;
    const baseGeo = new THREE.BoxGeometry(26, height * 0.6, 26);
    const darkMarble = new THREE.MeshStandardMaterial({
      color: 0x312e81,
      roughness: 0.4,
      metalness: 0.4,
    });
    const base = new THREE.Mesh(baseGeo, darkMarble);
    base.position.set(x, (height * 0.6) / 2 + 0.5, z);
    base.castShadow = true;
    this.scene.add(base);
    this.addCollider(base, 26, height * 0.6, 26, 'bishop_cathedral');

    // Tall Pointed Mitre Spire
    const spireGeo = new THREE.ConeGeometry(12, height * 0.5, 8);
    const goldSpire = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x1e1b4b,
    });
    const spire = new THREE.Mesh(spireGeo, goldSpire);
    spire.position.set(x, height * 0.6 + (height * 0.5) / 2, z);
    this.scene.add(spire);

    // Stained Glass Diagonal Window
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x818cf8 });
    const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 22), glassMat);
    windowMesh.position.set(x, 18, z + 13.1);
    this.scene.add(windowMesh);

    // Spawn Bishop Grand Tourer
    this.vehicleSpawns.push({
      position: new THREE.Vector3(x - 22, 1, z),
      rotationY: -Math.PI / 2,
      type: 'bishop_gt',
    });
  }

  private buildKnightArena(x: number, z: number) {
    // Curved stadium with stylized Horse Head Monument
    const height = 30;
    const arenaGeo = new THREE.CylinderGeometry(20, 22, height, 20);
    const arenaMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.7,
      metalness: 0.3,
    });
    const arena = new THREE.Mesh(arenaGeo, arenaMat);
    arena.position.set(x, height / 2 + 0.5, z);
    arena.castShadow = true;
    this.scene.add(arena);
    this.addCollider(arena, 40, height, 40, 'knight_arena');

    // Stylized Horse Head on Arena Roof
    const horseBody = new THREE.Mesh(
      new THREE.BoxGeometry(8, 14, 16),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.7 })
    );
    horseBody.position.set(x, height + 8, z);
    this.scene.add(horseBody);

    const horseSnout = new THREE.Mesh(
      new THREE.BoxGeometry(7, 8, 10),
      new THREE.MeshStandardMaterial({ color: 0x059669 })
    );
    horseSnout.position.set(x, height + 6, z + 10);
    horseSnout.rotation.x = 0.25;
    this.scene.add(horseSnout);

    // Spawn Knight Chopper (Motorcycle)
    this.vehicleSpawns.push({
      position: new THREE.Vector3(x, 1, z + 24),
      rotationY: 0,
      type: 'knight_chopper',
    });
  }

  private buildGrandPlaza(x: number, z: number) {
    // Central reflecting pool, palm trees, obelisk, and stunt ramp
    const poolGeo = new THREE.BoxGeometry(28, 0.4, 28);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.9,
    });
    const pool = new THREE.Mesh(poolGeo, waterMat);
    pool.position.set(x, 0.3, z);
    this.scene.add(pool);

    // Grand Obelisk in Center
    const obeliskGeo = new THREE.CylinderGeometry(1.5, 3.5, 36, 4);
    const obeliskMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.2,
      metalness: 0.3,
    });
    const obelisk = new THREE.Mesh(obeliskGeo, obeliskMat);
    obelisk.position.set(x, 18, z);
    obelisk.rotation.y = Math.PI / 4;
    obelisk.castShadow = true;
    this.scene.add(obelisk);
    this.addCollider(obelisk, 7, 36, 7, 'obelisk');

    // Surrounding Palm Trees
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const px = x + Math.cos(angle) * 18;
      const pz = z + Math.sin(angle) * 18;
      this.createPalmTree(px, pz);
    }
  }

  private buildPawnSuburbs(x: number, z: number, isDark: boolean) {
    // Pawn Row commercial & residential buildings: 2 to 4 buildings per block
    const buildingColors = isDark
      ? [0x334155, 0x1e293b, 0x475569, 0x0f172a]
      : [0xe2e8f0, 0xcfd8dc, 0xdfe6e9, 0xb0bec5];

    const offsets = [
      { dx: -11, dz: -11, w: 16, d: 16, h: 22 + Math.random() * 20 },
      { dx: 11, dz: -11, w: 16, d: 16, h: 26 + Math.random() * 25 },
      { dx: -11, dz: 11, w: 16, d: 16, h: 18 + Math.random() * 15 },
      { dx: 11, dz: 11, w: 16, d: 16, h: 24 + Math.random() * 20 },
    ];

    offsets.forEach((b, idx) => {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const mat = new THREE.MeshStandardMaterial({
        color: buildingColors[idx % buildingColors.length],
        roughness: 0.8,
        metalness: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const bx = x + b.dx;
      const bz = z + b.dz;
      mesh.position.set(bx, b.h / 2 + 0.4, bz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.addCollider(mesh, b.w, b.h, b.d, 'suburb_building');

      // Windows grid texture / luminous rectangles on surface
      const winMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.4 ? 0xfef08a : 0x0284c7 });
      const win = new THREE.Mesh(new THREE.PlaneGeometry(b.w * 0.7, b.h * 0.7), winMat);
      win.position.set(bx, b.h / 2 + 0.4, bz + b.d / 2 + 0.05);
      this.scene.add(win);
    });

    // Parked civilian car
    if (Math.random() > 0.35) {
      this.vehicleSpawns.push({
        position: new THREE.Vector3(x, 1, z + 22),
        rotationY: Math.PI / 2,
        type: 'pawn_hatchback',
      });
    }
  }

  private createPalmTree(x: number, z: number) {
    const trunkGeo = new THREE.CylinderGeometry(0.5, 0.9, 14, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 7, z);
    trunk.castShadow = true;
    this.scene.add(trunk);

    const leavesGeo = new THREE.ConeGeometry(5, 4, 7);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.set(x, 14, z);
    leaves.castShadow = true;
    this.scene.add(leaves);
  }

  private createStuntRamps() {
    // GTA V Stunt Ramps placed around highway corridors & arenas
    const rampLocations = [
      { x: -64, z: -64, rotY: 0 },
      { x: 64, z: -64, rotY: Math.PI / 2 },
      { x: -64, z: 64, rotY: -Math.PI / 2 },
      { x: 64, z: 64, rotY: Math.PI },
      { x: 0, z: -128, rotY: 0 },
      { x: 0, z: 128, rotY: Math.PI },
    ];

    const rampMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Red stunt ramp
      roughness: 0.5,
      metalness: 0.3,
    });

    rampLocations.forEach(loc => {
      // Wedge geometry for ramp
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(10, 0);
      shape.lineTo(10, 3.5);
      shape.closePath();

      const extrudeSettings = { depth: 6, bevelEnabled: false };
      const rampGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const rampMesh = new THREE.Mesh(rampGeo, rampMat);
      rampMesh.position.set(loc.x - 5, 0.1, loc.z - 3);
      rampMesh.rotation.y = loc.rotY;
      this.scene.add(rampMesh);

      this.stuntRamps.push({
        position: new THREE.Vector3(loc.x, 1, loc.z),
        rotation: new THREE.Euler(0, loc.rotY, 0),
        mesh: rampMesh,
      });

      // Chevron warning stripe
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 1.5),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      stripe.position.set(loc.x, 1.5, loc.z);
      this.scene.add(stripe);
    });
  }

  private createStreetFurniture() {
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // Street Lamps along roads
    for (let i = -3; i <= 3; i++) {
      for (let j = -3; j <= 3; j++) {
        const lx = i * this.squareSize + 8;
        const lz = j * this.squareSize + 8;

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 9, 8), lampMat);
        pole.position.set(lx, 4.5, lz);
        this.scene.add(pole);

        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), bulbMat);
        bulb.position.set(lx, 9, lz);
        this.scene.add(bulb);

        // Night streetlight source
        const light = new THREE.PointLight(0xffedd5, 1.5, 30);
        light.position.set(lx, 8.5, lz);
        this.scene.add(light);
      }
    }
  }

  private addCollider(mesh: THREE.Mesh, width: number, height: number, depth: number, type: string) {
    const halfW = width / 2;
    const halfH = height / 2;
    const halfD = depth / 2;
    const min = new THREE.Vector3(mesh.position.x - halfW, mesh.position.y - halfH, mesh.position.z - halfD);
    const max = new THREE.Vector3(mesh.position.x + halfW, mesh.position.y + halfH, mesh.position.z + halfD);
    this.colliders.push({
      box: new THREE.Box3(min, max),
      type,
    });
  }

  private populateSpawnPoints() {
    // Player spawn at Central Plaza (Square E4)
    this.spawnPoints.push(new THREE.Vector3(0, 1.2, 32));
    this.spawnPoints.push(new THREE.Vector3(-64, 1.2, 0));
    this.spawnPoints.push(new THREE.Vector3(64, 1.2, 0));
  }
}
