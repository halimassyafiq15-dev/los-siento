import { Mission } from '../types/game';
import { soundFX } from '../audio/SoundFx';

export const STORY_MISSIONS: Mission[] = [
  {
    id: 'mis_sicilian',
    title: 'The Sicilian Hijack',
    client: 'Big Smoke Pawn',
    rewardCash: 8000,
    rewardElo: 150,
    type: 'heist',
    description: 'A rival syndicate Bishop has parked a tuned GT sports car near St. Caissa Cathedral. Hijack the ride, shake off the Checkmate Police, and stash it at Pawnbroker Yard.',
    instruction: 'Hijack the Bishop GT at Square C1 and escape the 2-Star heat!',
    targetPos: { x: -96, z: -192 },
    targetSquare: 'Square C1',
  },
  {
    id: 'mis_castling',
    title: 'Castling the Vault',
    client: 'Lester the Bishop',
    rewardCash: 18000,
    rewardElo: 250,
    type: 'defense',
    description: 'The Rook Fortress Federal Reserve on Square H1 holds bullion from the Grandmaster vault. Crack the courtyard defenses and extract the bullion safe.',
    instruction: 'Infiltrate Rook Fortress at H1 and eliminate the vault guards!',
    targetPos: { x: 192, z: -192 },
    targetSquare: 'Square H1',
  },
  {
    id: 'mis_velocity',
    title: 'En Passant Velocity',
    client: 'Franklin Knight',
    rewardCash: 14000,
    rewardElo: 200,
    type: 'chase',
    description: 'High-speed diagonal sprint through the avenues of Los Caissas. Race across the board from A1 to H8 hitting all waypoints before the clock runs out.',
    instruction: 'Race through the diagonal waypoints from A1 to H8!',
    targetPos: { x: 0, z: 0 },
    targetSquare: 'Square D4',
  },
  {
    id: 'mis_checkmate',
    title: 'Grandmaster Checkmate Heist',
    client: 'The White Queen',
    rewardCash: 50000,
    rewardElo: 500,
    type: 'checkmate',
    description: 'The Black King is holding a clandestine meeting atop the Queen Citadel. Infiltrate the luxury skyscraper, defeat the Royal Guard, and deliver the final Checkmate.',
    instruction: 'Infiltrate Queen Citadel at D8 and capture the Black King!',
    targetPos: { x: -32, z: 192 },
    targetSquare: 'Square D8',
  },
];

export interface ActiveMissionState {
  mission: Mission;
  stage: number;
  timeRemaining?: number;
  progressText: string;
  isComplete: boolean;
}

export class MissionManager {
  public activeMission: ActiveMissionState | null = null;
  public completedMissions: string[] = [];

  public startMission(missionId: string): ActiveMissionState | null {
    const template = STORY_MISSIONS.find(m => m.id === missionId);
    if (!template) return null;

    soundFX.playClick();
    this.activeMission = {
      mission: { ...template },
      stage: 1,
      progressText: template.instruction,
      isComplete: false,
      timeRemaining: template.id === 'mis_velocity' ? 65 : undefined,
    };

    return this.activeMission;
  }

  public startTaxiJob(): ActiveMissionState {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const rF = letters[Math.floor(Math.random() * letters.length)];
    const rR = Math.floor(Math.random() * 8) + 1;
    const fIdx = letters.indexOf(rF);
    const targetX = (fIdx - 3.5) * 64;
    const targetZ = (rR - 4.5) * 64;

    const taxiMission: Mission = {
      id: `taxi_${Date.now()}`,
      title: 'Pawn Taxi Fare',
      client: 'Downtown Pedestrian',
      rewardCash: 2500,
      rewardElo: 50,
      type: 'taxi',
      description: `Deliver the passenger pawn safely to ${rF}${rR}. Watch out for crazy drivers!`,
      instruction: `Drive passenger to Square ${rF}${rR}`,
      targetPos: { x: targetX, z: targetZ },
      targetSquare: `Square ${rF}${rR}`,
    };

    this.activeMission = {
      mission: taxiMission,
      stage: 1,
      progressText: taxiMission.instruction,
      isComplete: false,
      timeRemaining: 90,
    };

    return this.activeMission;
  }

  public update(delta: number, playerPos: { x: number; z: number }): { completed: boolean; reward?: { cash: number; elo: number; title: string } } {
    if (!this.activeMission || this.activeMission.isComplete) {
      return { completed: false };
    }

    const state = this.activeMission;

    if (state.timeRemaining !== undefined) {
      state.timeRemaining -= delta;
      if (state.timeRemaining <= 0) {
        // Mission Failed
        this.activeMission = null;
        return { completed: false };
      }
    }

    // Check if player reached target position
    if (state.mission.targetPos) {
      const dx = playerPos.x - state.mission.targetPos.x;
      const dz = playerPos.z - state.mission.targetPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 18) {
        state.isComplete = true;
        this.completedMissions.push(state.mission.id);
        soundFX.playMissionPassed();

        const reward = {
          cash: state.mission.rewardCash,
          elo: state.mission.rewardElo,
          title: state.mission.title,
        };

        return { completed: true, reward };
      }
    }

    return { completed: false };
  }

  public cancelMission() {
    this.activeMission = null;
  }
}
