export type ChessPieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';

export interface PlayerStats {
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  stamina: number;
  maxStamina: number;
  specialAbility: number;
  maxSpecial: number;
  cash: number;
  elo: number;
  wantedLevel: number; // 0 to 5
  wantedTimer: number; // seconds left to lose police
  isPursued: boolean;
  promotion: ChessPieceType;
  kills: number;
  stuntsCompleted: number;
}

export type ChessPowerId = 'fist' | 'en_passant' | 'bishop_ray' | 'knight_leap' | 'rook_ram' | 'queen_gambit';

export interface ChessPower {
  id: ChessPowerId;
  name: string;
  icon: string;
  pieceType: ChessPieceType;
  description: string;
  cooldown: number; // max seconds
  damage: number;
  color: string;
}

export type VehicleModel = 'pawn_hatchback' | 'knight_chopper' | 'bishop_gt' | 'rook_apc' | 'queen_hypercar';

export interface VehicleData {
  id: string;
  model: VehicleModel;
  name: string;
  topSpeed: number;
  acceleration: number;
  handling: number;
  durability: number;
  color: string;
  secondaryColor?: string;
  isPolice?: boolean;
}

export interface RadioStation {
  id: string;
  name: string;
  genre: string;
  frequency: string;
  trackName: string;
  artist: string;
  bpm: number;
}

export interface Mission {
  id: string;
  title: string;
  client: string;
  rewardCash: number;
  rewardElo: number;
  description: string;
  instruction: string;
  type: 'heist' | 'chase' | 'defense' | 'checkmate' | 'taxi';
  targetPos?: { x: number; z: number };
  targetSquare?: string;
  isCompleted?: boolean;
}

export interface MapBlip {
  id: string;
  x: number;
  z: number;
  type: 'player' | 'vehicle' | 'police' | 'mission' | 'shop' | 'stunt' | 'outpost';
  label?: string;
  color?: string;
}
