import * as THREE from 'three';
import { PlayerStats, ChessPower, ChessPieceType, ChessPowerId } from '../types/game';
import { soundFX } from '../audio/SoundFx';
import { BuildingCollider } from './ChessCityBuilder';

export const CHESS_POWERS: Record<ChessPowerId, ChessPower> = {
  fist: {
    id: 'fist',
    name: 'Pawn Fist / Crowbar',
    icon: '👊',
    pieceType: 'pawn',
    description: 'Melee attack. Deals close quarters physical damage to rivals.',
    cooldown: 0.3,
    damage: 35,
    color: '#94a3b8',
  },
  en_passant: {
    id: 'en_passant',
    name: 'En Passant Dash',
    icon: '⚡',
    pieceType: 'pawn',
    description: 'Instant forward sonic warp through enemy ranks, dealing shockwave damage.',
    cooldown: 3.5,
    damage: 60,
    color: '#facc15',
  },
  bishop_ray: {
    id: 'bishop_ray',
    name: 'Bishop Diagonal Beam',
    icon: '✨',
    pieceType: 'bishop',
    description: 'Fires high-frequency diagonal laser beams piercing targets.',
    cooldown: 2.5,
    damage: 85,
    color: '#818cf8',
  },
  knight_leap: {
    id: 'knight_leap',
    name: 'Knight L-Jump Slam',
    icon: '🐴',
    pieceType: 'knight',
    description: 'Launches into the sky in an L-trajectory and slams down with shockwave.',
    cooldown: 5.0,
    damage: 120,
    color: '#10b981',
  },
  rook_ram: {
    id: 'rook_ram',
    name: 'Rook Citadel Ram',
    icon: '🏰',
    pieceType: 'rook',
    description: 'Fortifies with invulnerable iron armor and charges through roadblocks.',
    cooldown: 8.0,
    damage: 150,
    color: '#38bdf8',
  },
  queen_gambit: {
    id: 'queen_gambit',
    name: 'Queen Royal Gambit',
    icon: '👑',
    pieceType: 'queen',
    description: 'Triggers bullet-time overdrive and homing royal dart blasts in all 8 directions.',
    cooldown: 12.0,
    damage: 220,
    color: '#ec4899',
  },
};

export class PlayerController {
  public mesh: THREE.Group;
  public camera: THREE.PerspectiveCamera;
  public colliders: BuildingCollider[] = [];

  public stats: PlayerStats = {
    health: 100,
    maxHealth: 100,
    armor: 100,
    maxArmor: 100,
    stamina: 100,
    maxStamina: 100,
    specialAbility: 100,
    maxSpecial: 100,
    cash: 5000,
    elo: 1200,
    wantedLevel: 0,
    wantedTimer: 0,
    isPursued: false,
    promotion: 'pawn',
    kills: 0,
    stuntsCompleted: 0,
  };

  public selectedPower: ChessPowerId = 'fist';
  public powerCooldowns: Record<ChessPowerId, number> = {
    fist: 0,
    en_passant: 0,
    bishop_ray: 0,
    knight_leap: 0,
    rook_ram: 0,
    queen_gambit: 0,
  };

  // Camera angles
  public camYaw: number = 0;
  public camPitch: number = 0.25;
  public camDistance: number = 5.5;
  public isAiming: boolean = false;

  // Animation & Physics
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private isGrounded: boolean = true;
  private walkTime: number = 0;
  private headMesh!: THREE.Mesh;
  private bodyMesh!: THREE.Mesh;
  private leftArm!: THREE.Mesh;
  private rightArm!: THREE.Mesh;
  private leftLeg!: THREE.Mesh;
  private rightLeg!: THREE.Mesh;
  private crownMesh!: THREE.Mesh;

  // Active power effects
  public activeEffects: { mesh: THREE.Object3D; ttl: number; update?: (dt: number) => void }[] = [];

  constructor(camera: THREE.PerspectiveCamera, colliders: BuildingCollider[]) {
    this.camera = camera;
    this.colliders = colliders;
    this.mesh = new THREE.Group();
    this.buildCharacterMesh();
  }

  private buildCharacterMesh() {
    // GTA Style Street Pawn: Spherical head, pawn collar, conical body, streetwear jacket
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Polished white marble pawn
      roughness: 0.3,
      metalness: 0.1,
    });
    const jacketMat = new THREE.MeshStandardMaterial({
      color: 0x15803d, // Grove Street green / Pawn streetwear jacket
      roughness: 0.8,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark denim jeans
      roughness: 0.9,
    });

    // 1. Pawn Spherical Head
    const headGeo = new THREE.SphereGeometry(0.38, 16, 16);
    this.headMesh = new THREE.Mesh(headGeo, skinMat);
    this.headMesh.position.y = 1.75;
    this.headMesh.castShadow = true;
    this.mesh.add(this.headMesh);

    // Dark Sunglasses
    const glasses = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.12, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1, metalness: 0.9 })
    );
    glasses.position.set(0, 1.78, 0.32);
    this.mesh.add(glasses);

    // Streetwear Cap
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.42, 0.15, 12),
      new THREE.MeshStandardMaterial({ color: 0x15803d })
    );
    cap.position.set(0, 2.05, -0.05);
    this.mesh.add(cap);
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.04, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x166534 })
    );
    visor.position.set(0, 2.02, 0.35);
    this.mesh.add(visor);

    // Pawn Collar Ring
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.48, 0.1, 16),
      skinMat
    );
    ring.position.y = 1.45;
    this.mesh.add(ring);

    // Torso / Jacket
    const torsoGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.8, 12);
    this.bodyMesh = new THREE.Mesh(torsoGeo, jacketMat);
    this.bodyMesh.position.y = 1.05;
    this.bodyMesh.castShadow = true;
    this.mesh.add(this.bodyMesh);

    // Gold Chain / Medallion
    const chain = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.03, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.2 })
    );
    chain.position.set(0, 1.3, 0.25);
    chain.rotation.x = Math.PI / 3;
    this.mesh.add(chain);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.65, 8);
    this.leftArm = new THREE.Mesh(armGeo, jacketMat);
    this.leftArm.position.set(-0.52, 1.05, 0);
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, jacketMat);
    this.rightArm.position.set(0.52, 1.05, 0);
    this.mesh.add(this.rightArm);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.7, 8);
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.position.set(-0.22, 0.35, 0);
    this.leftLeg.castShadow = true;
    this.mesh.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.position.set(0.22, 0.35, 0);
    this.rightLeg.castShadow = true;
    this.mesh.add(this.rightLeg);

    // Optional Promotion Crown (hidden initially)
    const crownGeo = new THREE.CylinderGeometry(0.42, 0.3, 0.3, 6, 1, true);
    this.crownMesh = new THREE.Mesh(
      crownGeo,
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.1 })
    );
    this.crownMesh.position.set(0, 2.25, 0);
    this.crownMesh.visible = false;
    this.mesh.add(this.crownMesh);
  }

  public updatePromotion(newPiece: ChessPieceType) {
    this.stats.promotion = newPiece;
    if (newPiece === 'queen' || newPiece === 'king') {
      this.crownMesh.visible = true;
      (this.bodyMesh.material as THREE.MeshStandardMaterial).color.setHex(0xb91c1c); // Royal red coat
    } else if (newPiece === 'knight') {
      (this.bodyMesh.material as THREE.MeshStandardMaterial).color.setHex(0x059669); // Emerald
    } else if (newPiece === 'bishop') {
      (this.bodyMesh.material as THREE.MeshStandardMaterial).color.setHex(0x4338ca); // Violet
    } else if (newPiece === 'rook') {
      (this.bodyMesh.material as THREE.MeshStandardMaterial).color.setHex(0x334155); // Slate armor
    }
  }

  public jump() {
    if (this.isGrounded) {
      this.velocity.y = 8.5;
      this.isGrounded = false;
    }
  }

  public punch(): boolean {
    return this.executePower('fist');
  }

  public update(
    delta: number,
    keys: Record<string, boolean>,
    mouseDelta: { x: number; y: number },
    isInVehicle: boolean,
    vehiclePos?: THREE.Vector3,
    joystickVector?: { x: number; y: number },
    forceSprint?: boolean
  ) {
    // 1. Update Cooldowns
    Object.keys(this.powerCooldowns).forEach(k => {
      const key = k as ChessPowerId;
      if (this.powerCooldowns[key] > 0) {
        this.powerCooldowns[key] = Math.max(0, this.powerCooldowns[key] - delta);
      }
    });

    // 2. Update Wanted Level Timer
    if (this.stats.wantedLevel > 0) {
      if (this.stats.isPursued) {
        // Police actively chasing
      } else {
        // Line of sight broken: cool down stars
        this.stats.wantedTimer -= delta;
        if (this.stats.wantedTimer <= 0) {
          this.stats.wantedLevel = Math.max(0, this.stats.wantedLevel - 1);
          this.stats.wantedTimer = this.stats.wantedLevel > 0 ? 12 : 0;
          if (this.stats.wantedLevel === 0) {
            soundFX.setSirenState(false);
          }
        }
      }
    }

    // 3. Update Camera Orbit from mouse movement
    this.camYaw -= mouseDelta.x * 0.003;
    this.camPitch = Math.max(-0.4, Math.min(1.1, this.camPitch - mouseDelta.y * 0.003));

    if (isInVehicle && vehiclePos) {
      // In Vehicle: Smooth chase cam following car
      this.mesh.position.copy(vehiclePos);
      this.mesh.visible = false;

      const camDist = 9.5;
      const camHeight = 3.8;
      const cx = vehiclePos.x - Math.sin(this.camYaw) * camDist * Math.cos(this.camPitch);
      const cz = vehiclePos.z - Math.cos(this.camYaw) * camDist * Math.cos(this.camPitch);
      const cy = vehiclePos.y + camHeight + Math.sin(this.camPitch) * camDist;

      this.camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.15);
      this.camera.lookAt(vehiclePos.x, vehiclePos.y + 1.2, vehiclePos.z);
      return;
    }

    // On-Foot Movement & Controls
    this.mesh.visible = true;
    const isSprint = forceSprint || !!keys['ShiftLeft'] || !!keys['ShiftRight'];
    let moveSpeed = isSprint ? 10.5 : 5.5;
    if (this.isAiming) moveSpeed = 3.0;

    // Movement input relative to camera yaw
    let forwardInput = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 0.7 : 0);
    let sideInput = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);

    // Apply Analog Joystick input if active
    if (joystickVector && (Math.abs(joystickVector.x) > 0.05 || Math.abs(joystickVector.y) > 0.05)) {
      forwardInput = -joystickVector.y; // Up on joystick is forward
      sideInput = joystickVector.x;      // Right on joystick is strafe right
    }

    const moveDir = new THREE.Vector3();
    if (Math.abs(forwardInput) > 0.05 || Math.abs(sideInput) > 0.05) {
      const forward = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw)).normalize();
      const right = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw)).normalize();

      moveDir.addScaledVector(forward, forwardInput);
      moveDir.addScaledVector(right, sideInput);
      if (moveDir.lengthSq() > 0.001) {
        moveDir.normalize();
        const targetRotation = Math.atan2(moveDir.x, moveDir.z);
        this.mesh.rotation.y = targetRotation;
        this.mesh.position.addScaledVector(moveDir, moveSpeed * delta);
      }

      // Running animation
      this.walkTime += delta * (isSprint ? 16 : 9);
      this.leftLeg.rotation.x = Math.sin(this.walkTime) * 0.7;
      this.rightLeg.rotation.x = -Math.sin(this.walkTime) * 0.7;
      this.leftArm.rotation.x = -Math.sin(this.walkTime) * 0.6;
      this.rightArm.rotation.x = Math.sin(this.walkTime) * 0.6;
    } else {
      // Idle pose
      this.leftLeg.rotation.x *= 0.8;
      this.rightLeg.rotation.x *= 0.8;
      this.leftArm.rotation.x *= 0.8;
      this.rightArm.rotation.x *= 0.8;
    }

    // Jump Physics (Keyboard Space or touch jump)
    if (keys['Space'] && this.isGrounded) {
      this.jump();
    }

    // Apply gravity
    if (!this.isGrounded) {
      this.velocity.y -= 24 * delta;
      this.mesh.position.y += this.velocity.y * delta;
      if (this.mesh.position.y <= 0) {
        this.mesh.position.y = 0;
        this.velocity.y = 0;
        this.isGrounded = true;
      }
    }

    // Check collisions with city structures
    this.checkCollisions();

    // Camera Chase Positioning for On-Foot
    const targetDist = this.isAiming ? 3.0 : this.camDistance;
    const targetHeight = this.isAiming ? 1.6 : 2.0;

    const camX = this.mesh.position.x - Math.sin(this.camYaw) * targetDist * Math.cos(this.camPitch);
    const camZ = this.mesh.position.z - Math.cos(this.camYaw) * targetDist * Math.cos(this.camPitch);
    const camY = this.mesh.position.y + targetHeight + Math.sin(this.camPitch) * targetDist;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(
      this.mesh.position.x,
      this.mesh.position.y + 1.4,
      this.mesh.position.z
    );

    // Update active visual fx (projectiles, lasers, shockwaves)
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const fx = this.activeEffects[i];
      fx.ttl -= delta;
      if (fx.update) fx.update(delta);
      if (fx.ttl <= 0) {
        this.mesh.parent?.remove(fx.mesh);
        this.activeEffects.splice(i, 1);
      }
    }
  }

  private checkCollisions() {
    const pos = this.mesh.position;
    for (const col of this.colliders) {
      if (col.box.containsPoint(pos)) {
        const center = new THREE.Vector3();
        col.box.getCenter(center);
        const pushDir = pos.clone().sub(center).setY(0);
        if (pushDir.lengthSq() > 0.0001) {
          pushDir.normalize();
          pos.add(pushDir.multiplyScalar(0.5));
        } else {
          pos.x += 0.5;
        }
        break;
      }
    }
  }

  // --- Attack / Power Triggers ---

  public executePower(powerId: ChessPowerId): boolean {
    if (this.powerCooldowns[powerId] > 0) return false;

    const power = CHESS_POWERS[powerId];
    this.powerCooldowns[powerId] = power.cooldown;

    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);

    switch (powerId) {
      case 'fist':
        soundFX.playPunch();
        this.rightArm.rotation.x = -Math.PI / 2;
        setTimeout(() => {
          if (this.rightArm) this.rightArm.rotation.x = 0;
        }, 180);
        break;

      case 'en_passant':
        soundFX.playEnPassant();
        // Warp forward 18 units
        const startPos = this.mesh.position.clone();
        this.mesh.position.addScaledVector(forward, 18);
        this.spawnLaserStreak(startPos, this.mesh.position, 0xfacc15);
        break;

      case 'bishop_ray':
        soundFX.playBishopBeam();
        this.spawnBishopBeam();
        break;

      case 'knight_leap':
        soundFX.playKnightLeap();
        this.spawnKnightShockwave();
        break;

      case 'rook_ram':
        soundFX.playRookRam();
        this.spawnRookShield();
        break;

      case 'queen_gambit':
        soundFX.playQueenGambit();
        this.spawnQueenRadialBursts();
        break;
    }

    return true;
  }

  private spawnLaserStreak(from: THREE.Vector3, to: THREE.Vector3, color: number) {
    const geom = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineBasicMaterial({ color, linewidth: 4 });
    const line = new THREE.Line(geom, mat);
    this.mesh.parent?.add(line);
    this.activeEffects.push({ mesh: line, ttl: 0.35 });
  }

  private spawnBishopBeam() {
    const parent = this.mesh.parent;
    if (!parent) return;

    // Diagonal ray
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    const beamGeo = new THREE.CylinderGeometry(0.18, 0.18, 40, 8);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x818cf8 });
    const beam = new THREE.Mesh(beamGeo, beamMat);

    const beamPos = this.mesh.position.clone().addScaledVector(forward, 20).add(new THREE.Vector3(0, 1.4, 0));
    beam.position.copy(beamPos);
    beam.rotation.x = Math.PI / 2;
    beam.rotation.z = -this.mesh.rotation.y;

    parent.add(beam);
    this.activeEffects.push({
      mesh: beam,
      ttl: 0.4,
      update: dt => {
        beam.scale.multiplyScalar(0.9);
      },
    });
  }

  private spawnKnightShockwave() {
    const parent = this.mesh.parent;
    if (!parent) return;

    // Expanding shockwave ring on ground
    const ringGeo = new THREE.RingGeometry(0.5, 1.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(this.mesh.position).setY(0.2);

    parent.add(ring);
    this.activeEffects.push({
      mesh: ring,
      ttl: 0.6,
      update: dt => {
        ring.scale.addScalar(dt * 30);
      },
    });
  }

  private spawnRookShield() {
    const shieldGeo = new THREE.SphereGeometry(1.6, 16, 16);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.position.set(0, 1.0, 0);
    this.mesh.add(shield);

    this.activeEffects.push({
      mesh: shield,
      ttl: 3.0,
      update: dt => {
        shield.rotation.y += dt * 4;
      },
    });
  }

  private spawnQueenRadialBursts() {
    const parent = this.mesh.parent;
    if (!parent) return;

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dartGeo = new THREE.ConeGeometry(0.3, 1.5, 6);
      const dartMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
      const dart = new THREE.Mesh(dartGeo, dartMat);
      dart.position.copy(this.mesh.position).setY(1.4);
      dart.rotation.y = angle;
      dart.rotation.x = Math.PI / 2;

      parent.add(dart);
      const dir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
      this.activeEffects.push({
        mesh: dart,
        ttl: 0.8,
        update: dt => {
          dart.position.addScaledVector(dir, dt * 45);
        },
      });
    }
  }

  public takeDamage(amount: number) {
    if (this.stats.armor > 0) {
      const armorAbsorb = Math.min(this.stats.armor, amount);
      this.stats.armor -= armorAbsorb;
      amount -= armorAbsorb;
    }
    this.stats.health = Math.max(0, this.stats.health - amount);
  }

  public triggerCrime(starIncrease: number = 1) {
    this.stats.wantedLevel = Math.min(5, Math.max(1, this.stats.wantedLevel + starIncrease));
    this.stats.wantedTimer = 25; // 25 seconds of heat
    this.stats.isPursued = true;
    soundFX.setSirenState(true);
  }
}
