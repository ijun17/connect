class ConnectPage extends WebPage{
    remotePath;
    fileBuffer=[];
    CHUNK_SIZE = 16000;
    constructor(){super()}
    init(manager){
        this.setInnerHTML(`
        <div id="topbar"><div class="wrapper">connected</div></div>

        <div class="loader display-none"><div></div></div>

        <div class="center-column" style="width:100vw; height:100vh;">
            <div class="wrapper">
                <div class="create-buttons display-none" style="margin-top:100px;">
                    <button class="create-file-button">파일 생성</button>
                    <button class="create-folder-button">폴더 생성</button>
                </div>
                <div class="folder-view"></div>
                <div class="overlay display-none"></div>
                <div class="file-view display-none"></div>
            </div>
        </div>
        <div class="popup" id="popup">
            <div>
                <span class="close-btn">&times;</span><br>
                <div class="popup-content"></div>
            </div>
        </div>
        `)
        multi.resetEvent();
        multi.ondatachannelclose=()=>{
            manager.setPage("main-page");
        }
        multi.ondatachannelmessage=(message)=>{
            let msg = JSON.parse(message);
            switch(msg.type){
                case "info":this.showInfo(msg.userAgent,msg.startPath);break;
                case "response folder":this.showForder(msg.folder,msg.path); break;
                case "response file":this.showFile(msg.file); break;
                case "request folder":this.responseFolder(msg.path); break;
                case "request file":this.responseFile(msg.path); break;
                case "save folder":this.saveFolder(msg.path,msg.name); break;
                case "save file":this.saveFile(msg.path,msg.name,msg.content); break;
                case "message": this.openPopup(`<p>${msg.message}</p>`);break;
                case "error":this.openPopup(`<p>${msg.message}</p>`);break;
            }
        }


        this.addEvent(".overlay","click",()=>{
            this.get(".overlay").classList.add("display-none")
            this.get(".file-view").classList.add("display-none")
        })
        this.addEvent(".close-btn","click",this.closePopup.bind(this))
        this.addEvent(".overlay","click",this.closePopup.bind(this))
        this.addEvent(".folder-view","click",(e)=>{
            if(e.target.classList.contains("file")){
                const path = this.remotePath+'/'+e.target.innerText;
                if(e.target.classList.contains("file-folder")) this.requestFolder(path);
                else if(e.target.classList.contains("file-file")){
                    this.requestFile(path);
                    this.get(".loader").classList.remove("display-none")
                }
                else if(e.target.classList.contains("up-folder"))this.requestFolder(this.remotePath.substring(0, this.remotePath.lastIndexOf('/')));
            }
        })
        this.addEvent(".create-file-button","click",()=>{
            this.showFile({name:"",content:"",end:true})
        })
        this.addEvent(".create-folder-button","click",()=>{
            this.openPopup(`
                <input type="text" id="folder-popup-input" placeholder="폴더 이름">
                <button id="folder-popup-button">생성</button>
            `)
            this.addEvent("#folder-popup-button","click",()=>{
                let folderName =  this.get("#folder-popup-input").value;
                multi.send(JSON.stringify({type:"save folder", path:this.remotePath, name:folderName}))
            })
        })
        
        this.closePopup()

        this.remotePath=null;
        this.currentMessage=null;
        if(this.isMobile()){
            let path = Native.getStartFolderPath();
            this.responseFolder(path)
            // setTimeout(()=>{this.responseFolder(path)},1000);
        }
        return this.container;
    }







    isMobile(){
        return typeof Native !== 'undefined'
    }

    responseFolder(path){
        console.log(path)
        if(!this.isMobile())return;
        const folder = Native.getFolder(path)
        if(folder){
            multi.send(JSON.stringify({
                type:"response folder",
                folder:JSON.parse(folder),
                path:path
            }))
        }else{
            multi.send(JSON.stringify({
                type:"error",
                message:"폴더에 접근할 수 없습니다."
            }))
        }
        
    }

    responseFile(path){
        console.log(path)
        if(!this.isMobile())return;
        const content = Native.getFile(path);
        const name=path.split('/').pop();
        for(let i=0; i<=content.length;i+=this.CHUNK_SIZE){
            multi.send(JSON.stringify({
                type:"response file",
                file:{
                    name:name, 
                    end:(i+this.CHUNK_SIZE>=content.length), 
                    content:content.slice(i, i+this.CHUNK_SIZE)
                }
            }))
            
        }
    }

    saveFile(path,name, content){
        if(!this.isMobile())return;
        Native.saveFile(path+"/"+name,content);
        this.responseFolder(path)
    }

    saveFolder(path,name){
        if(!this.isMobile())return;
        Native.saveFolder(path+"/"+name);
        this.responseFolder(path)
    }

    requestFolder(path){
        multi.send(JSON.stringify({
            type:"request folder",
            path:path
        }))
    }

    requestFile(path){
        multi.send(JSON.stringify({
            type:"request file",
            path:path
        }))
    }

    showForder(folder,path){
        this.get(".create-buttons").classList.remove("display-none");
        this.remotePath = path
        const div = this.get(".folder-view")
        let innerHTML=`<div class="file up-folder">..</div>`;
        folder.sort((a,b)=>{return a.name.localeCompare(b.name)})
        folder.sort((a,b)=>{
            if(a.type==b.type)return 0;
            return (a.type=="folder" && b.type=="file")?-1:1
        })
        for(let file of folder){
            const color=file.type=="folder"?"beige":"white";
            innerHTML += `<div class="file file-${file.type}" style="background:${color};">${file.name}</div>`;
        }
        div.innerHTML=innerHTML;
    }

    showFile(file){
        this.fileBuffer.push(file.content)
        if(!file.end) return
        this.get(".loader").classList.add("display-none")
        const recieved = this.fileBuffer.join('')
        this.fileBuffer = [];
    
        const div = this.get(".file-view")
        const name = file.name
        const extension = file.name.split('.').pop();
        const isImage = ["jpg","jpeg","png"].includes(extension)
        if(isImage){
            div.innerHTML=`
            <input id="file-title" type="text" value="${name}">
            <div>
                <button id="file-download-button">다운로드</button>
            </div>
            <div><img src="data:image/${extension};base64,${recieved}"/></div>
            `

            this.addEvent("#file-download-button","click",()=>{
                this.downloadFile(this.get("#file-title").value,this.base64ToBytes(recieved))
            })

        }else{
            const content = new TextDecoder().decode(this.base64ToBytes(recieved))
            div.innerHTML=`
            <input id="file-title" type="text" value="${name}">
            <div>
                <button id="file-save-button">저장</button>
                <button id="file-download-button">다운로드</button>
            </div>
            <textarea id="file-content">${content}</textarea>
            `
            this.addEvent("#file-save-button","click",()=>{
                multi.send(JSON.stringify({
                    type:"save file",
                    path:this.remotePath,
                    name:this.get("#file-title").value,
                    content:btoa(unescape(encodeURIComponent(this.get("#file-content").value)))
                }))
            })

            this.addEvent("#file-download-button","click",()=>{
                let base64 = btoa(unescape(encodeURIComponent(this.get("#file-content").value)))
                this.downloadFile(this.get("#file-title").value, this.base64ToBytes(base64))
            })
        }
        this.get(".overlay").classList.remove("display-none");
        this.get(".file-view").classList.remove("display-none");
    }

    closeFile(){
        this.get(".overlay").classList.add("display-none");
        this.get(".file-view").classList.add("display-none");
    }

    base64ToBytes(base64) {
        const binString = atob(base64);
        return Uint8Array.from(binString, (m) => m.codePointAt(0));
      }
      
    bytesToBase64(bytes) {
        const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join("");
        return btoa(binString);
    }

    openPopup(content) {
        this.get('.overlay').classList.remove('display-none');
        this.get('#popup').classList.remove('display-none');
        this.get(".popup-content").innerHTML=content;
    }

    closePopup() {
        this.get('.overlay').classList.add('display-none');
        this.get('#popup').classList.add('display-none');
        this.get(".file-view").classList.add("display-none");
    }

    downloadFile(fileName, contentBytes) {
        const blob = new Blob([contentBytes], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(link.href);
    }
}