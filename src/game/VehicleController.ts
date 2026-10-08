import * as THREE from 'three';
import { VehicleData, VehicleModel } from '../types/game';
import { soundFX } from '../audio/SoundFx';
import { BuildingCollider } from './ChessCityBuilder';

export interface ActiveVehicle {
  data: VehicleData;
  mesh: THREE.Group;
  speed: number;
  steering: number;
  gear: number;
  health: number;
  isEngineOn: boolean;
  wheels: THREE.Mesh[];
  frontWheels: THREE.Mesh[];
  headlights: THREE.SpotLight[];
  sirenLights?: THREE.PointLight[];
  isAirborne: boolean;
  verticalVelocity: number;
}

export class VehicleSystem {
  public scene: THREE.Scene;
  public vehicles: ActiveVehicle[] = [];
  public currentVehicle: ActiveVehicle | null = null;
  private colliders: BuildingCollider[] = [];

  constructor(scene: THREE.Scene, colliders: BuildingCollider[]) {
    this.scene = scene;
    this.colliders = colliders;
  }

  public spawnVehicle(
    model: VehicleModel,
    position: THREE.Vector3,
    rotationY: number = 0,
    isPolice: boolean = false
  ): ActiveVehicle {
    const group = new THREE.Group();
    group.position.copy(position);
    group.rotation.y = rotationY;

    const wheels: THREE.Mesh[] = [];
    const frontWheels: THREE.Mesh[] = [];
    const headlights: THREE.SpotLight[] = [];
    let sirenLights: THREE.PointLight[] | undefined;

    let vehicleData: VehicleData;

    switch (model) {
      case 'knight_chopper':
        vehicleData = {
          id: `veh_${Math.random().toString(36).substring(2, 7)}`,
          model,
          name: 'Knight Cavalry Chopper',
          topSpeed: 42,
          acceleration: 28,
          handling: 3.2,
          durability: 180,
          color: '#10b981',
          isPolice,
        };
        this.buildMotorcycleMesh(group, wheels, frontWheels, headlights);
        break;

      case 'bishop_gt':
        vehicleData = {
          id: `veh_${Math.random().toString(36).substring(2, 7)}`,
          model,
          name: 'Bishop Grand Tourer',
          topSpeed: 48,
          acceleration: 24,
          handling: 2.5,
          durability: 250,
          color: '#6366f1',
          secondaryColor: '#1e1b4b',
          isPolice,
        };
        this.buildCarMesh(group, wheels, frontWheels, headlights, 0x6366f1, false, false);
        break;

      case 'rook_apc':
        vehicleData = {
          id: `veh_${Math.random().toString(36).substring(2, 7)}`,
          model,
          name: isPolice ? 'Checkmate Enforcer APC' : 'Rook Fortress Cruiser',
          topSpeed: 34,
          acceleration: 18,
          handling: 1.8,
          durability: 500,
          color: isPolice ? '#1e293b' : '#334155',
          isPolice,
        };
        sirenLights = this.buildCarMesh(group, wheels, frontWheels, headlights, isPolice ? 0x0f172a : 0x475569, true, isPolice);
        break;

      case 'queen_hypercar':
        vehicleData = {
          id: `veh_${Math.random().toString(36).substring(2, 7)}`,
          model,
          name: 'Queen Regal V12',
          topSpeed: 60,
          acceleration: 38,
          handling: 3.0,
          durability: 200,
          color: '#f59e0b',
          secondaryColor: '#ec4899',
          isPolice,
        };
        this.buildHypercarMesh(group, wheels, frontWheels, headlights);
        break;

      case 'pawn_hatchback':
      default:
        vehicleData = {
          id: `veh_${Math.random().toString(36).substring(2, 7)}`,
          model: 'pawn_hatchback',
          name: 'Pawn Taxi / Hatchback',
          topSpeed: 36,
          acceleration: 20,
          handling: 2.2,
          durability: 220,
          color: isPolice ? '#1e293b' : '#eab308',
          isPolice,
        };
        sirenLights = this.buildCarMesh(group, wheels, frontWheels, headlights, isPolice ? 0x0f172a : 0xeab308, false, isPolice);
        break;
    }

    this.scene.add(group);

    const activeVehicle: ActiveVehicle = {
      data: vehicleData,
      mesh: group,
      speed: 0,
      steering: 0,
      gear: 1,
      health: vehicleData.durability,
      isEngineOn: false,
      wheels,
      frontWheels,
      headlights,
      sirenLights,
      isAirborne: false,
      verticalVelocity: 0,
    };

    this.vehicles.push(activeVehicle);
    return activeVehicle;
  }

  // --- 3D Procedural Vehicle Mesh Builders ---

  private buildCarMesh(
    group: THREE.Group,
    wheels: THREE.Mesh[],
    frontWheels: THREE.Mesh[],
    headlights: THREE.SpotLight[],
    bodyColor: number,
    isHeavy: boolean,
    hasSiren: boolean
  ): THREE.PointLight[] | undefined {
    const length = isHeavy ? 5.4 : 4.4;
    const width = isHeavy ? 2.3 : 2.0;
    const height = isHeavy ? 1.9 : 1.35;

    // Car Body / Chassis
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.3,
      metalness: 0.7,
    });
    const bodyGeo = new THREE.BoxGeometry(width, height * 0.55, length);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    // Cabin / Roof
    const cabinWidth = width * 0.85;
    const cabinHeight = height * 0.5;
    const cabinLength = length * 0.52;
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
    });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength), glassMat);
    cabin.position.set(0, 0.55 + (height * 0.55) / 2 + cabinHeight / 2 - 0.05, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    // Chess Piece Emblem on Hood (Rook or Pawn insignia)
    const insigniaGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.6, 8);
    const insigniaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9 });
    const insignia = new THREE.Mesh(insigniaGeo, insigniaMat);
    insignia.position.set(0, 0.85, length / 2 - 0.5);
    group.add(insignia);

    // 4 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });

    const wheelPositions = [
      { x: -width / 2 - 0.05, z: length * 0.32, front: true },
      { x: width / 2 + 0.05, z: length * 0.32, front: true },
      { x: -width / 2 - 0.05, z: -length * 0.32, front: false },
      { x: width / 2 + 0.05, z: -length * 0.32, front: false },
    ];

    wheelPositions.forEach(wp => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(wp.x, 0.42, wp.z);

      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Rim
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.34, 8), rimMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      group.add(wheelGroup);
      wheels.push(tire);
      if (wp.front) {
        frontWheels.push(wheelGroup as unknown as THREE.Mesh);
      }
    });

    // Headlights
    [-width * 0.35, width * 0.35].forEach(x => {
      const spot = new THREE.SpotLight(0xfffbeb, 2.5, 45, Math.PI / 6, 0.5);
      spot.position.set(x, 0.6, length / 2);
      spot.target.position.set(x, 0, length / 2 + 15);
      group.add(spot);
      group.add(spot.target);
      headlights.push(spot);

      // Light lens mesh
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      lens.position.set(x, 0.6, length / 2 + 0.05);
      group.add(lens);
    });

    // Taillights
    [-width * 0.35, width * 0.35].forEach(x => {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.1), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      tail.position.set(x, 0.6, -length / 2 - 0.02);
      group.add(tail);
    });

    // Police Siren Lightbar
    let sirenLightsArray: THREE.PointLight[] | undefined;
    if (hasSiren) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.6, 0.15, 0.3), new THREE.MeshStandardMaterial({ color: 0x111827 }));
      bar.position.set(0, height + 0.1, -0.2);
      group.add(bar);

      const redLight = new THREE.PointLight(0xef4444, 2, 18);
      redLight.position.set(-width * 0.22, height + 0.22, -0.2);
      group.add(redLight);

      const blueLight = new THREE.PointLight(0x3b82f6, 2, 18);
      blueLight.position.set(width * 0.22, height + 0.22, -0.2);
      group.add(blueLight);

      sirenLightsArray = [redLight, blueLight];
    }

    return sirenLightsArray;
  }

  private buildHypercarMesh(
    group: THREE.Group,
    wheels: THREE.Mesh[],
    frontWheels: THREE.Mesh[],
    headlights: THREE.SpotLight[]
  ) {
    const length = 4.8;
    const width = 2.15;
    const height = 1.05;

    // Aerodynamic Low Body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Golden Queen Amber
      roughness: 0.15,
      metalness: 0.85,
    });
    const bodyGeo = new THREE.BoxGeometry(width, 0.45, length);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    body.castShadow = true;
    group.add(body);

    // Cockpit Canopy
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1, metalness: 0.95 })
    );
    canopy.scale.set(0.9, 0.6, 1.6);
    canopy.position.set(0, 0.5, -0.2);
    group.add(canopy);

    // Rear Carbon Wing
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.95, 0.08, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.2 })
    );
    wing.position.set(0, 0.95, -length / 2 + 0.2);
    group.add(wing);

    // Underglow Neon (Magenta)
    const underglow = new THREE.PointLight(0xec4899, 2.5, 5);
    underglow.position.set(0, 0.15, 0);
    group.add(underglow);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.35, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b });

    const wheelPositions = [
      { x: -width / 2, z: length * 0.32, front: true },
      { x: width / 2, z: length * 0.32, front: true },
      { x: -width / 2, z: -length * 0.32, front: false },
      { x: width / 2, z: -length * 0.32, front: false },
    ];

    wheelPositions.forEach(wp => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(wp.x, 0.38, wp.z);
      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.rotation.z = Math.PI / 2;
      wheelGroup.add(tire);
      group.add(wheelGroup);
      wheels.push(tire);
      if (wp.front) frontWheels.push(wheelGroup as unknown as THREE.Mesh);
    });

    // Hypercar LED headlights
    [-width * 0.35, width * 0.35].forEach(x => {
      const spot = new THREE.SpotLight(0x67e8f9, 3, 50, Math.PI / 6, 0.5);
      spot.position.set(x, 0.45, length / 2);
      spot.target.position.set(x, 0, length / 2 + 20);
      group.add(spot);
      group.add(spot.target);
      headlights.push(spot);
    });
  }

  private buildMotorcycleMesh(
    group: THREE.Group,
    wheels: THREE.Mesh[],
    frontWheels: THREE.Mesh[],
    headlights: THREE.SpotLight[]
  ) {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.7 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.1, metalness: 0.95 });

    // Bike Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 2.2), frameMat);
    frame.position.y = 0.75;
    group.add(frame);

    // Knight Mane / Gas Tank
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.8), frameMat);
    tank.position.set(0, 1.1, 0.2);
    group.add(tank);

    // Chrome Handlebars
    const handle = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), chromeMat);
    handle.position.set(0, 1.25, 0.65);
    group.add(handle);

    // 2 Wheels (Front & Rear)
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.18, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b });

    const frontWheel = new THREE.Mesh(wheelGeo, wheelMat);
    frontWheel.rotation.z = Math.PI / 2;
    frontWheel.position.set(0, 0.42, 1.2);
    group.add(frontWheel);
    wheels.push(frontWheel);
    frontWheels.push(frontWheel);

    const rearWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rearWheel.rotation.z = Math.PI / 2;
    rearWheel.position.set(0, 0.42, -1.0);
    group.add(rearWheel);
    wheels.push(rearWheel);

    // Front Headlight
    const spot = new THREE.SpotLight(0xfef08a, 2.5, 40, Math.PI / 5, 0.5);
    spot.position.set(0, 0.85, 1.3);
    spot.target.position.set(0, 0, 15);
    group.add(spot);
    group.add(spot.target);
    headlights.push(spot);
  }

  // --- Vehicle Physics & Control ---

  public update(
    delta: number,
    keys: Record<string, boolean>,
    playerPos: THREE.Vector3,
    joystickVector?: { x: number; y: number },
    forceHandbrake?: boolean
  ) {
    if (!this.currentVehicle) {
      // Idle engine sound off if not in car
      return;
    }

    const v = this.currentVehicle;
    let accelInput = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 0.7 : 0);
    let steerInput = (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0) - (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0);

    // Apply joystick steering and acceleration
    if (joystickVector && (Math.abs(joystickVector.x) > 0.05 || Math.abs(joystickVector.y) > 0.05)) {
      accelInput = -joystickVector.y; // Forward throttle is negative y
      steerInput = -joystickVector.x; // Left turns left
    }

    const isHandbrake = forceHandbrake || !!keys['Space'];

    // Engine acceleration
    if (accelInput > 0) {
      v.speed += v.data.acceleration * accelInput * delta;
      if (v.speed > v.data.topSpeed) v.speed = v.data.topSpeed;
    } else if (accelInput < 0) {
      v.speed += v.data.acceleration * accelInput * delta;
      if (v.speed < -v.data.topSpeed * 0.4) v.speed = -v.data.topSpeed * 0.4;
    } else {
      // Friction / coasting deceleration
      v.speed *= Math.pow(0.92, delta * 60);
    }

    // Handbrake Drifting
    if (isHandbrake) {
      v.speed *= Math.pow(0.85, delta * 60);
      if (Math.abs(v.speed) > 10 && Math.random() > 0.4) {
        soundFX.playTireSkid();
      }
    }

    // Steering with speed sensitivity
    const speedRatio = Math.abs(v.speed) / v.data.topSpeed;
    const steerFactor = 1.0 - Math.min(speedRatio * 0.5, 0.5);
    const targetSteering = steerInput * v.data.handling * steerFactor;
    v.steering += (targetSteering - v.steering) * Math.min(delta * 8, 1);

    // Apply rotation only when moving
    if (Math.abs(v.speed) > 0.2) {
      const turnDir = v.speed >= 0 ? 1 : -1;
      v.mesh.rotation.y += v.steering * delta * turnDir;

      // Motorcycle leaning visual effect
      if (v.data.model === 'knight_chopper') {
        v.mesh.rotation.z = -v.steering * 0.35;
      }
    }

    // Move forward in local Z orientation (Three.js front is +Z)
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), v.mesh.rotation.y);
    const deltaMove = forward.clone().multiplyScalar(v.speed * delta);
    v.mesh.position.add(deltaMove);

    // Rotate wheels
    v.wheels.forEach(w => {
      w.rotation.x += (v.speed * delta) / 0.4;
    });

    // Front wheels steering visual angle
    v.frontWheels.forEach(fw => {
      fw.rotation.y = v.steering * 0.5;
    });

    // Audio Engine Modulation
    const normalizedSpeed = Math.abs(v.speed) / v.data.topSpeed;
    soundFX.updateEngineRPM(normalizedSpeed, accelInput > 0);

    // Siren flashing if police
    if (v.sirenLights) {
      const time = performance.now() * 0.008;
      v.sirenLights[0].intensity = Math.sin(time) > 0 ? 3 : 0;
      v.sirenLights[1].intensity = Math.sin(time) <= 0 ? 3 : 0;
    }

    // Collision Detection with City Buildings
    this.checkCollisions(v);

    // Keep ground clamped or ramp jumping
    if (v.mesh.position.y > 0.8) {
      v.verticalVelocity -= 22 * delta;
      v.mesh.position.y += v.verticalVelocity * delta;
      if (v.mesh.position.y <= 0.8) {
        v.mesh.position.y = 0.8;
        v.verticalVelocity = 0;
        v.isAirborne = false;
      }
    }
  }

  private checkCollisions(v: ActiveVehicle) {
    const pos = v.mesh.position;
    for (const col of this.colliders) {
      if (col.box.containsPoint(pos)) {
        // Bounce recoil
        v.speed = -v.speed * 0.4;
        soundFX.playRookRam();
        v.health -= 15;
        // Push out
        const center = new THREE.Vector3();
        col.box.getCenter(center);
        const pushDir = pos.clone().sub(center).setY(0);
        if (pushDir.lengthSq() > 0.0001) {
          pushDir.normalize();
          pos.add(pushDir.multiplyScalar(1.5));
        } else {
          pos.x += 1.5;
        }
        break;
      }
    }
  }

  public getNearestVehicle(playerPos: THREE.Vector3, maxDistance: number = 5.0): ActiveVehicle | null {
    let nearest: ActiveVehicle | null = null;
    let minDist = maxDistance;

    for (const v of this.vehicles) {
      const dist = v.mesh.position.distanceTo(playerPos);
      if (dist < minDist) {
        minDist = dist;
        nearest = v;
      }
    }
    return nearest;
  }

  public enterVehicle(vehicle: ActiveVehicle) {
    this.currentVehicle = vehicle;
    vehicle.isEngineOn = true;
    soundFX.startEngine();
    if (vehicle.data.isPolice) {
      soundFX.setSirenState(true);
    }
  }

  public exitVehicle(): THREE.Vector3 {
    if (!this.currentVehicle) return new THREE.Vector3(0, 1, 0);

    const v = this.currentVehicle;
    v.speed = 0;
    v.isEngineOn = false;
    soundFX.stopEngine();
    soundFX.setSirenState(false);

    // Position player to the left of the car
    const left = new THREE.Vector3(-2.2, 0.5, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), v.mesh.rotation.y);
    const exitPos = v.mesh.position.clone().add(left);

    this.currentVehicle = null;
    return exitPos;
  }
}
