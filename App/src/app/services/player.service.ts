import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Player {
  id: number;
  buttonId: number; // The ESP-NOW button ID (0 = master, 1+ = clients)
  name: string;
  isConnected: boolean;
  isMaster: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  private players: Player[] = [];
  private nextPlayerId = 1;
  
  private playersSubject = new BehaviorSubject<Player[]>([]);
  public players$ = this.playersSubject.asObservable();

  constructor() {}

  // Called when master button connects
  registerMasterButton(): Player {
    // Check if master already exists
    const existingMaster = this.players.find(p => p.isMaster);
    if (existingMaster) {
      existingMaster.isConnected = true;
      this.emitPlayers();
      return existingMaster;
    }

    const player: Player = {
      id: this.nextPlayerId++,
      buttonId: 0, // Master is always button 0
      name: `Spelare 1`,
      isConnected: true,
      isMaster: true
    };
    
    this.players.push(player);
    this.emitPlayers();
    return player;
  }

  // Called when a client button is detected via ESP-NOW
  registerClientButton(buttonId: number): Player {
    // Check if this button already exists
    const existingPlayer = this.players.find(p => p.buttonId === buttonId);
    if (existingPlayer) {
      existingPlayer.isConnected = true;
      this.emitPlayers();
      return existingPlayer;
    }

    const playerNumber = this.players.length + 1;
    const player: Player = {
      id: this.nextPlayerId++,
      buttonId: buttonId,
      name: `Spelare ${playerNumber}`,
      isConnected: true,
      isMaster: false
    };
    
    this.players.push(player);
    this.emitPlayers();
    return player;
  }

  // Rename a player
  renamePlayer(playerId: number, newName: string): void {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.name = newName;
      this.emitPlayers();
    }
  }

  // Get player by button ID
  getPlayerByButtonId(buttonId: number): Player | undefined {
    return this.players.find(p => p.buttonId === buttonId);
  }

  // Get all connected players
  getConnectedPlayers(): Player[] {
    return this.players.filter(p => p.isConnected);
  }

  // Get all players
  getAllPlayers(): Player[] {
    return [...this.players];
  }

  // Mark master as disconnected
  disconnectMaster(): void {
    this.players.forEach(p => p.isConnected = false);
    this.emitPlayers();
  }

  // Clear all players (for new game session)
  clearPlayers(): void {
    this.players = [];
    this.nextPlayerId = 1;
    this.emitPlayers();
  }

  // Handle button press - returns the player who pressed
  handleButtonPress(buttonId: number): Player | undefined {
    return this.getPlayerByButtonId(buttonId);
  }

  private emitPlayers(): void {
    this.playersSubject.next([...this.players]);
  }
}
