import * as THREE from 'three';
import { PlayerStats } from '../types/game';
import { VehicleSystem, ActiveVehicle } from './VehicleController';
import { soundFX } from '../audio/SoundFx';

export interface CivilianNPC {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  targetPos: THREE.Vector3;
  isPanicked: boolean;
  health: number;
}

export interface PoliceUnit {
  mesh: THREE.Group;
  vehicle?: ActiveVehicle;
  type: 'patrol' | 'knight_pursuit' | 'rook_swat';
  health: number;
  attackCooldown: number;
}

export class AIPoliceAndCivilianSystem {
  public scene: THREE.Scene;
  public civilians: CivilianNPC[] = [];
  public policeUnits: PoliceUnit[] = [];
  public cashPickups: { mesh: THREE.Group; value: number }[] = [];

  private vehicleSystem: VehicleSystem;
  private roadNodes: THREE.Vector3[];
  private policeSpawnTimer: number = 0;

  constructor(scene: THREE.Scene, vehicleSystem: VehicleSystem, roadNodes: THREE.Vector3[]) {
    this.scene = scene;
    this.vehicleSystem = vehicleSystem;
    this.roadNodes = roadNodes;
  }

  public initCrowd(count: number = 20) {
    for (let i = 0; i < count; i++) {
      this.spawnCivilian();
    }
  }

  private spawnCivilian() {
    const group = new THREE.Group();

    const colors = [0x3b82f6, 0xef4444, 0x10b981, 0x8b5cf6, 0xf59e0b, 0xec4899];
    const jacketColor = colors[Math.floor(Math.random() * colors.length)];

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
    const clothesMat = new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.7 });

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), skinMat);
    head.position.y = 1.6;
    group.add(head);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 0.75, 10), clothesMat);
    body.position.y = 1.05;
    group.add(body);

    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    legs.position.set(0, 0.35, 0);
    group.add(legs);

    const randNode = this.roadNodes[Math.floor(Math.random() * this.roadNodes.length)] || new THREE.Vector3(0, 0.5, 0);
    const spawnX = randNode.x + (Math.random() - 0.5) * 40;
    const spawnZ = randNode.z + (Math.random() - 0.5) * 40;
    group.position.set(spawnX, 0, spawnZ);

    this.scene.add(group);

    this.civilians.push({
      mesh: group,
      velocity: new THREE.Vector3(),
      targetPos: this.getRandomSidewalkPoint(group.position),
      isPanicked: false,
      health: 40,
    });
  }

  private getRandomSidewalkPoint(origin: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      origin.x + (Math.random() - 0.5) * 60,
      0,
      origin.z + (Math.random() - 0.5) * 60
    );
  }

  public update(delta: number, playerPos: THREE.Vector3, stats: PlayerStats, onPlayerDamage: (amount: number) => void) {
    this.updateCivilians(delta, playerPos);
    this.updatePolice(delta, playerPos, stats, onPlayerDamage);
    this.updateCashPickups(delta, playerPos, stats);
  }

  private updateCivilians(delta: number, playerPos: THREE.Vector3) {
    for (let i = this.civilians.length - 1; i >= 0; i--) {
      const civ = this.civilians[i];
      const distToPlayer = civ.mesh.position.distanceTo(playerPos);

      if (distToPlayer < 12 && statsIsHighWantedOrFast(distToPlayer)) {
        civ.isPanicked = true;
      }

      const dir = civ.targetPos.clone().sub(civ.mesh.position).setY(0);
      const dist = dir.length();

      if (dist < 1.5) {
        civ.targetPos = this.getRandomSidewalkPoint(civ.mesh.position);
      } else if (dist > 0.05) {
        dir.divideScalar(dist); // Safe normalize
        const speed = civ.isPanicked ? 6.5 : 2.2;
        civ.mesh.position.addScaledVector(dir, speed * delta);
        civ.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }
  }

  private updatePolice(
    delta: number,
    playerPos: THREE.Vector3,
    stats: PlayerStats,
    onPlayerDamage: (amount: number) => void
  ) {
    if (stats.wantedLevel === 0) {
      if (this.policeUnits.length > 0) {
        this.policeUnits.forEach(p => this.scene.remove(p.mesh));
        this.policeUnits = [];
      }
      return;
    }

    const maxPolice = Math.min(stats.wantedLevel * 2 + 1, 8);
    this.policeSpawnTimer += delta;

    if (this.policeUnits.length < maxPolice && this.policeSpawnTimer > 4.0) {
      this.policeSpawnTimer = 0;
      this.spawnPoliceUnit(playerPos, stats.wantedLevel);
    }

    let playerInSight = false;

    for (let i = this.policeUnits.length - 1; i >= 0; i--) {
      const police = this.policeUnits[i];
      const distToPlayer = police.mesh.position.distanceTo(playerPos);

      if (distToPlayer < 75) {
        playerInSight = true;
      }

      const dir = playerPos.clone().sub(police.mesh.position).setY(0);
      const len = dir.length();

      if (len > 0.05) {
        dir.divideScalar(len); // Safe normalize
        const speed = 7.0;
        police.mesh.position.addScaledVector(dir, speed * delta);
        police.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      }

      police.attackCooldown -= delta;
      if (distToPlayer < 3.2 && police.attackCooldown <= 0) {
        police.attackCooldown = 1.2;
        soundFX.playPunch();
        onPlayerDamage(12 + stats.wantedLevel * 3);
      }
    }

    stats.isPursued = playerInSight;
  }

  private spawnPoliceUnit(playerPos: THREE.Vector3, wantedLevel: number) {
    const group = new THREE.Group();

    const uniformMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9 });

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), skinMat);
    head.position.y = 1.6;
    group.add(head);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 12), uniformMat);
    cap.position.set(0, 1.88, 0);
    group.add(cap);

    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.05), badgeMat);
    badge.position.set(0.15, 1.25, 0.3);
    group.add(badge);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.8, 10), uniformMat);
    body.position.y = 1.1;
    group.add(body);

    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.7, 8), uniformMat);
    legs.position.set(0, 0.35, 0);
    group.add(legs);

    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = 45;
    group.position.set(
      playerPos.x + Math.cos(spawnAngle) * spawnDist,
      0,
      playerPos.z + Math.sin(spawnAngle) * spawnDist
    );

    this.scene.add(group);

    this.policeUnits.push({
      mesh: group,
      type: wantedLevel >= 4 ? 'rook_swat' : wantedLevel >= 2 ? 'knight_pursuit' : 'patrol',
      health: 80,
      attackCooldown: 1.0,
    });
  }

  public dropCash(pos: THREE.Vector3, amount: number = 350) {
    const group = new THREE.Group();
    const billGeo = new THREE.BoxGeometry(0.8, 0.2, 0.5);
    const billMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.3 });
    const bill = new THREE.Mesh(billGeo, billMat);
    bill.position.y = 0.5;
    group.add(bill);

    group.position.copy(pos);
    this.scene.add(group);

    this.cashPickups.push({ mesh: group, value: amount });
  }

  private updateCashPickups(delta: number, playerPos: THREE.Vector3, stats: PlayerStats) {
    for (let i = this.cashPickups.length - 1; i >= 0; i--) {
      const item = this.cashPickups[i];
      item.mesh.rotation.y += delta * 3;
      item.mesh.position.y = 0.5 + Math.sin(performance.now() * 0.005) * 0.15;

      if (item.mesh.position.distanceTo(playerPos) < 2.2) {
        soundFX.playCashSound();
        stats.cash += item.value;
        this.scene.remove(item.mesh);
        this.cashPickups.splice(i, 1);
      }
    }
  }

  public checkPlayerAttackOnNPCs(playerPos: THREE.Vector3, range: number, damage: number): number {
    let hits = 0;

    for (let i = this.civilians.length - 1; i >= 0; i--) {
      const civ = this.civilians[i];
      if (civ.mesh.position.distanceTo(playerPos) < range) {
        civ.health -= damage;
        civ.isPanicked = true;
        hits++;
        if (civ.health <= 0) {
          this.dropCash(civ.mesh.position, 200 + Math.floor(Math.random() * 300));
          this.scene.remove(civ.mesh);
          this.civilians.splice(i, 1);
          setTimeout(() => this.spawnCivilian(), 6000);
        }
      }
    }

    for (let i = this.policeUnits.length - 1; i >= 0; i--) {
      const pol = this.policeUnits[i];
      if (pol.mesh.position.distanceTo(playerPos) < range) {
        pol.health -= damage;
        hits++;
        if (pol.health <= 0) {
          this.dropCash(pol.mesh.position, 600 + Math.floor(Math.random() * 500));
          this.scene.remove(pol.mesh);
          this.policeUnits.splice(i, 1);
        }
      }
    }

    return hits;
  }
}

function statsIsHighWantedOrFast(dist: number): boolean {
  return dist < 8;
}
