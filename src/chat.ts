import { config } from './config';
import { Listen, Listenable, Listener, Unlisten } from './listen';

//
// The <App> UI is bound to a property which implements this interface.
//
export interface AppState {
  rooms: Room[];
  currentRoom: Room | null;
}

export interface App extends Listenable<AppState> {
  createRoom: ((name: string) => Room);
  selectRoom: (room: Room) => void;
}

export interface Room {
  name: string;
  messages: Message[];

  sendMessage: (message: string) => void;
}

export interface Message {
  from: string;
  when: number;
  message: string;
};

//
// Implementation of Application using Firebase.
//
export class AppOnFirebase implements App {
  state: AppState;
  uid: string;
  listener: Listener<AppState>;

  private fbApp: firebase.app.App;
  private pendingUpdate = false;

  constructor() {
    console.log("Application startup ...");
    if (typeof firebase === 'undefined') {
      console.error("Firebase script not loaded - offline?");
    } else {
      this.fbApp = firebase.initializeApp(config);
    }
    this.uid = 'mike';
    this.state = {
      rooms: [],
      currentRoom: null
    };
  }

  listen(listener: Listener<AppState>): Unlisten {
    this.listener = listener;
    this.updateListeners();
    return (() => {
      delete this.listener;
    });
  }

  updateListeners() {
    if (this.pendingUpdate) {
      return;
    }
    this.pendingUpdate = true;
    Promise.resolve()
      .then(() => {
        this.pendingUpdate = false;
        if (this.listener) {
          this.listener(this.state);
        }
      });
  }

  selectRoom(room: Room) {
    console.log('select', room.name);
    this.state.currentRoom = room;
    this.updateListeners();
  }

  createRoom(name: string): Room {
    let room = new RoomImpl(this, name);

    this.state.rooms.push(room);
    this.state.currentRoom = room;

    this.updateListeners();

    return room;
  }
}

export class RoomImpl implements Room {
  messages: Message[] = [];

  constructor(private app: AppOnFirebase,
              public name: string) {/*_*/}

  sendMessage(message: string) {
    this.messages.push({
      from: this.app.uid,
      when: Date.now(),
      message: message
    });
    this.app.updateListeners();
  }
}