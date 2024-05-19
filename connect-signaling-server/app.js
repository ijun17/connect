/*
signaling server
node js
*/



const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

class RoomManager{
    MAX_SIZE;
    rooms;
    emptyRooms;
    constructor(){
        this.MAX_SIZE=1000;
        this.rooms=new Array(this.MAX_SIZE);
        this.emptyRooms=new Queue(this.MAX_SIZE);
        for(let i=0; i<this.MAX_SIZE; i++){
            this.rooms[i] = new Room(i);
            this.emptyRooms.push(i);
        }
    }
    createRoom(ws) {
        if (!this.emptyRooms.isEmpty()) {
            const id = this.emptyRooms.pop();
            this.rooms[id].setHost(ws)
            ws.onclose = () => { this.closeRoom(id) };
        } else {
            ws.send(JSON.stringify({ type: "hostid", id: -1 }));
            ws.close();
        }
    }
    enterRoom(ws, id){
        if(this.isValidId(id) && this.rooms[id].canEnter()){
            this.rooms[id].setGuest(ws);
        }else {
            ws.close();
        }
    }
    
    closeRoom(id){
        if(this.isValidId(id) && this.rooms[id].isOpen()){
            this.rooms[id].reset();
            this.emptyRooms.push(id);
        }
    }
    isValidId(id){return id % 1 === 0 && id>=0 && id<this.MAX_SIZE}
}







class Room {
    id;
    host;//host ws
    host_sdp
    host_ice=[]
    host_ice_i=0;

    guest;//guest ws
    constructor(id) {
        this.id=id;
    }
    setHost(ws) {
        console.log(`<Room ${this.id}> created`);
        this.host = ws;
        ws.send(JSON.stringify({ type: "hostid", id: this.id }))
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch(data.type){
                case "wait"   : break;
                case "sdp"    : this.host_sdp=data.sdp; break;
                case "ice"    : this.addHostIce(data.ice); break;
                case "log"    : console.log(`<Room ${this.id}> HOST: ${data.log}`); break;
                default       : ws.close(); break;
            }
        }
    }
    setGuest(ws) {
        console.log(`<Room ${this.id}> entered`);
        this.guest = ws;
        ws.send(JSON.stringify({type:"sdp", sdp:this.host_sdp})); //호스트 sdp 전송
        this.addHostIce(false);
        ws.onmessage = (event) => { 
            if (!this.host) return;
            const data = JSON.parse(event.data);
            switch(data.type){
                case "sdp"    : this.host.send(event.data.toString("utf-8")); break;
                case "ice"    : this.host.send(event.data.toString("utf-8")); break;
                case "log"    : console.log(`<Room ${this.id}> GUEST: ${data.log}`);break;
                default       : this.resetGuset();  break;
            }
        }
        ws.onclose=()=>{this.resetGuset();};
    }
    addHostIce(ice){
        if(ice)this.host_ice.push(ice);
        if(this.guest)
            for(; this.host_ice_i<this.host_ice.length; this.host_ice_i++){
                this.guest.send(JSON.stringify({type:"ice", ice:this.host_ice[this.host_ice_i]}));
                console.log(`<Room ${this.id}> sendIceToGuest(${this.host_ice_i+1}/${this.host_ice.length})`)
            }
                

    }
    isOpen() {return this.host instanceof WebSocket;}
    canEnter() {return this.isOpen() && this.host_sdp && !this.guest}
    resetGuset(){
        if (this.guest) this.guest.close();
        this.guest=null;
        this.host_ice_i=0;
    }
    reset() {
        console.log('Room Closed: '+this.id);
        this.resetGuset();
        if (this.host) this.host.close();
        this.host = null;
        this.host_sdp=null;
        this.host_ice=[];
    }
}

// class Stack {
//     arr;
//     MAX_SIZE;
//     t;
//     constructor(MAX_SIZE = 1000) {
//         this.MAX_SIZE = MAX_SIZE;
//         this.arr = new Array(this.MAX_SIZE);
//         this.t = -1;
//     }
//     push(e) { if (!this.isFull()) this.arr[++this.t] = e; }
//     pop() { if (!this.isEmpty()) return this.arr[this.t--]; }
//     top() { if (!this.isEmpty()) return this.arr[this.t]; }
//     isFull() { return (this.t + 1 == this.MAX_SIZE); }
//     isEmpty() { this.t == -1; }
// }

class Queue {
    arr;
    MAX_SIZE;
    f;
    b;
    size;
    constructor(MAX_SIZE = 1000) {
        this.MAX_SIZE = MAX_SIZE;
        this.arr = new Array(this.MAX_SIZE);
        this.f = 0;
        this.b = 0;
        this.size=0;
    }
    push(e) {
        if (!this.isFull()) {
            this.size++;
            this.arr[this.b] = e;
            this.b = this.next(this.b);
        }
    }
    pop() {
        if (!this.isEmpty()) {
            this.size--;
            const e = this.arr[this.f];
            this.f = this.next(this.f);
            return e;
        }
    }
    front() { if (!this.isEmpty()) return this.arr[this.f]; }
    isFull() { return this.size==this.MAX_SIZE; }
    isEmpty() { return this.size==0; }
    next(i) { return (i + 1) % this.MAX_SIZE; }
    shuffle(){
        for(let i=0; i<this.size-1; i++){
            for(let j=i+1; j<this.size; j++){
                if(Math.random()>0.5){
                    let a=(i+this.f)%this.MAX_SIZE, b=(j+this.f)%this.MAX_SIZE;
                    let temp=this.arr[a];
                    this.arr[a]=this.arr[b];
                    this.arr[b]=temp;
                }
            }
        }
    }
}

const roomManager = new RoomManager();

wss.on('connection', (ws) => {
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case "host": roomManager.createRoom(ws);break;
                case "guest": roomManager.enterRoom(ws, Number(data.id)); break;
                default: ws.close(); break;
            }
        } catch (e) {
            ws.close();
            console.log(e);
        } 
    };
    ws.onclose = () => { };
    ws.onerror = (error) => { console.log(error) }
});

console.log("start")