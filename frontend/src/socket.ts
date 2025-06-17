import io from 'socket.io-client';

const url = "http://localhost:3001";

const socket = io(url, {autoConnect: false});

export default socket;