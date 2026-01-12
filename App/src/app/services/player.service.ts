import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Player {
  id: number;
  buttonIdentifier: string; // Unique identifier for the button
  name: string;
  isConnected: boolean;
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

  // Register a button by its unique identifier
  registerButton(buttonIdentifier: string): Player {
    // Check if this button already exists
    const existingPlayer = this.players.find(p => p.buttonIdentifier === buttonIdentifier);
    if (existingPlayer) {
      existingPlayer.isConnected = true;
      this.emitPlayers();
      return existingPlayer;
    }

    const playerNumber = this.players.length + 1;
    const player: Player = {
      id: this.nextPlayerId++,
      buttonIdentifier: buttonIdentifier,
      name: `Spelare ${playerNumber}`,
      isConnected: true
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

  // Get player by button identifier
  getPlayerByButtonIdentifier(buttonIdentifier: string): Player | undefined {
    return this.players.find(p => p.buttonIdentifier === buttonIdentifier);
  }

  // Get all connected players
  getConnectedPlayers(): Player[] {
    return this.players.filter(p => p.isConnected);
  }

  // Get all players
  getAllPlayers(): Player[] {
    return [...this.players];
  }

  // Mark all players as disconnected
  disconnectAll(): void {
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
  handleButtonPress(buttonIdentifier: string): Player | undefined {
    return this.getPlayerByButtonIdentifier(buttonIdentifier);
  }

  private emitPlayers(): void {
    this.playersSubject.next([...this.players]);
  }
}
