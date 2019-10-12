import { computed, observable } from "mobx";
import { Audio } from "expo-av";
import socket, { Result } from "../utils/socket";

export interface ReadyCheckState {
    timer: number;
    state: "Invalid" | "InProgress";
    playerResponse: "Accepted" | "Declined";
}

const queuePop = new Audio.Sound();
const queuePopLoadPromise = queuePop.loadAsync(require("../assets/queue-pop.mp3"));

export class ReadyCheckStore {
    @observable
    state: ReadyCheckState | null = null;

    constructor() {
        socket.observe("/lol-matchmaking/v1/ready-check", this.handleReadyCheckChange);
    }

    private handleReadyCheckChange = (result: Result) => {
        if (result.status !== 200) {
            this.state = null;
            return;
        }

        // Check if we just had ready check pop.
        const newState: ReadyCheckState = result.content;
        if ((!this.state || this.state.state === "Invalid") && newState.state === "InProgress") {
            // Play the queue pop sound.
            queuePopLoadPromise.then(() => {
                queuePop.playAsync().then(() =>{});
            });
        }

        this.state = newState;
    };

    /**
     * Accepts the ready check.
     */
    accept() {
        socket.request("/lol-matchmaking/v1/ready-check/accept", "POST");
    }

    /**
     * Declines the ready check.
     */
    decline() {
        socket.request("/lol-matchmaking/v1/ready-check/decline", "POST");
    }

    /**
     * @returns whether or not a ready check is currently ongoing
     */
    @computed
    get shouldShow(): boolean {
        return !!(this.state && this.state.state === "InProgress");
    }

    /**
     * Computes the width of the countdown progress bar and returns it as a css property.
     */
    @computed
    get progressAnimationTarget() {
        if (!this.state) return 0;
        return Math.max(0, (12 - this.state.timer - 1) * (100 / 12));
    }

    /**
     * Checks whether or not the user has already responded to the current ready check.
     */
    @computed
    get hasResponded(): boolean {
        return !!(this.state && (this.state.playerResponse === "Accepted" || this.state.playerResponse === "Declined"));
    }
}

const instance = new ReadyCheckStore();
export default instance;