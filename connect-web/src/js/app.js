const root = document.getElementById("root")
const webPageManager = new WebPageManager(root)
const multi = new SimpleWebRTC("wss://tawkor.xyz:8083","stun:stun.l.google.com:19302")

const Native = (typeof Android !== "undefined" ? Android : undefined)

webPageManager.addPage("main-page",new MainPage())
webPageManager.addPage("connect-page",new ConnectPage())


function init(){
    webPageManager.setPage("main-page")
}

init();