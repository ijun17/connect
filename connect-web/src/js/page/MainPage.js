class MainPage extends WebPage{
    constructor(){super()}
    init(manager){
        this.setInnerHTML(`
        <div id="topbar"><div class="wrapper">connect</div></div>
        <div class="center" style="width:100vw; height:100vh;">
            <div class="wrapper">
                <div class="room-form">
                    <div class="room-button-container">
                        <button class="create-room-button">방 만들기</button>
                        <button class="enter-room-button">방 들어가기</button>
                    </div>
                    <div class="room-input-container">
                        <div class="create-room-input-container">
                            <input class="create-room-input" placeholder="로딩 중" readonly>
                            <p>다른 사람에게 이 코드를 보여주세요</p>
                        </div>
                        <div class="enter-room-input-container">
                            <input class="enter-room-input" placeholder="방 아이디">
                            <p>방 아이디를 입력하세요</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="overlay" id="overlay"></div>
        <div class="popup" id="popup">
            <div>
                <span class="close-btn">&times;</span><br>
                <p class="popup-content">This is a popup message.</p>
            </div>
        </div>
        `)
        let roomForm = null

        const createRoomButton = this.get(".create-room-button")
        const enterRoomButton = this.get(".enter-room-button")
        const createRoomInputContainer = this.get(".create-room-input-container");
        const enterRoomInputContainer = this.get(".enter-room-input-container");
        const createRoomInput = this.get(".create-room-input")
        const enterRoomInput = this.get(".enter-room-input")

        let clickEnterRoomButton=()=>{
            if(roomForm=="enter")return
            roomForm = "enter"
            multi.onwebsocketclose=()=>{}
            multi.disconnectToSignalingServer();
            createRoomButton.classList.remove("room-button-click");
            enterRoomButton.classList.add("room-button-click");
            createRoomInputContainer.style.display = "none";
            enterRoomInputContainer.style.display = "block";
            enterRoomInput.value = "";
        }

        let clickCreateRoomButton=()=>{
            if(roomForm=="create")return
            roomForm = "create"
            multi.onwebsocketclose = () => {
                this.openPopup("서버와의 연결이 끊어졌습니다.")
                clickEnterRoomButton()
            }
            multi.onroomcreated = (id) => {
                if (id == -1) {
                    this.openPopup("방이 꽉찼습니다.")
                    clickEnterRoomButton()
                } else createRoomInput.value = id;
            }
            multi.ondatachannelopen = () => { multi.resetEvent();manager.setPage("connect-page"); }
        
            multi.createRoom();
            createRoomButton.classList.add("room-button-click");
            enterRoomButton.classList.remove("room-button-click");
            createRoomInputContainer.style.display = "block";
            enterRoomInputContainer.style.display = "none";
            createRoomInput.value = "";
        }

        let enterRoom=(event)=>{
            if (event.key === 'Enter') {
                multi.enterRoom(Number(enterRoomInput.value));
                multi.onroomenterfail = () => {this.openPopup("연결을 실패했습니다.")}
                multi.onwebsocketclose = () => {this.openPopup("연결을 실패했습니다.")}
                multi.ondatachannelopen = () => { manager.setPage("connect-page") }
            }
        }

        multi.resetEvent();
        clickEnterRoomButton();
        enterRoomButton.addEventListener("click",clickEnterRoomButton.bind(this))
        createRoomButton.addEventListener("click",clickCreateRoomButton.bind(this))
        enterRoomInput.addEventListener("keyup",enterRoom.bind(this))
        this.addEvent(".close-btn","click",this.closePopup.bind(this))
        this.addEvent(".overlay","click",this.closePopup.bind(this))
        this.closePopup()

        return this.container;
    }

    openPopup(content) {
        this.get('#overlay').classList.remove('display-none');
        this.get('#popup').classList.remove('display-none');
        this.get(".popup-content").innerText=content;
    }

    closePopup() {
        this.get('#overlay').classList.add('display-none');
        this.get('#popup').classList.add('display-none');
    }
}