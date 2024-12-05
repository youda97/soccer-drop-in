import { Timestamp, GeoPoint } from "firebase/firestore";

export interface User {
  uid: string;
  email: string | null;
  isAdmin: boolean;
}

export interface Event {
    id: string;
    title: string;
    startDate: Timestamp | null;
    endDate: Timestamp | null;
    location: GeoPoint;
    locationName: string;
    field?: string;
    cost: number;
    maxPlayers: number;
    includeGoalkeepers: boolean;
    goalkeeperCost: number;
    maxGoalkeepers: number;
    status: string;
    players: string[];
    goalkeepers: string[];
    playerWaitList: string[];
    goalkeeperWaitList: string[];
    refundedUsers: string[];
    organizer: User
  }