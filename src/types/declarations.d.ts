declare module '@react-native-community/netinfo' {
    export interface NetInfoState {
        isConnected: boolean | null;
        isInternetReachable: boolean | null;
        descriptions?: string;
    }
    export function fetch(): Promise<NetInfoState>;
    export function addEventListener(handler: (state: NetInfoState) => void): () => void;
}
