var version = "0.1";
var isdebug = false;
//entry point--------------------
window.onload = function(){
  document.getElementById('version').innerHTML=version;
  initbyquery();
  initdraw();
  initgame();
  initsound();
  window.onresize();
  setInterval(procAll, 1000/framerate); //enter gameloop
}
var initbyquery=function(){
  var urlsp = new URLSearchParams(window.location.search);
  if(urlsp.has('beats')){
    //comma separated string to array
    var str = urlsp.get('beats');
    var arr = str.split(',');
    parts = [];
    for(var i=0;i<arr.length;i++){
      //detect sqrt
      if(arr[i].indexOf("sqrt")>=0){
        var n = Number(arr[i].substring(4));
        parts.push(new Part(Math.sqrt(n), "√"+n));
      }else{
        parts.push(new Part(Number(arr[i]), arr[i]));
      }
    }
  }
}
//game loop ------------------
var gettime = function(){
  return (new Date()).getTime();
}
var framerate = 60; //[fps]
var t0=0;
var t1=0;
var t2=gettime();
var ela=0;
var el1=0;
var el2=0;
var procAll=function(){
  t1 = gettime();
  t0 = t2;
  procgame();
  procdraw();
  t2 = gettime();

  var d=0.9;
  el1=d*el1+(1-d)*Math.floor((t1-t0));
  el2=d*el2+(1-d)*Math.floor((t2-t1));
  ela=d*ela+(1-d)*Math.floor((t1-t0+t2-t1));
  if(isdebug){
    document.getElementById("debugspan").innerHTML=
      "("+Math.floor(el1)+", "+Math.floor(el2)+")/"+Math.floor(ela);
  }
}
//game -----------------
var pos = 0;
var cycle = 3;
var parts=[];
var Part = function(nbeat, str){
  this.nbeat = nbeat;
  this.note = new Array(0);
  var i=0;
  var t=0;
  do{
    this.note[i]=t;
    i++;
    t+=1/nbeat;
  }while(t<=1);
  this.note[i]=t;
  this.str = str;
}
var initgame=function(){
  var notes;
  if(parts.length==0){
    parts.push(new Part(3, "3"));
    parts.push(new Part(Math.sqrt(23), "√23"));
  }
}
var isgamestart = false;
var ispause = false;
var procgame=function(){
  if(isgamestart && !ispause){
    pos += 1/framerate/cycle;
    for(var p=0;p<parts.length;p++){
      var part = parts[p];
      for(var i=0;i<part.note.length-1;i++){
        if(pos>=part.note[i]+1/part.nbeat){
          // remove note
          part.note.splice(i,1);
          // add new note
          part.note.push(part.note[part.note.length-1]+1/part.nbeat);
          // sound
          playsound(p);
        }
      }
    }
  }
}
var initsound = function(){
  audioctx = new (window.AudioContext || window.webkitAudioContext)();
  document.getElementById("outcanvas").addEventListener("click", function(){
    if(!isgamestart){
      audioctx.resume().then(function(){
        isgamestart = true;
      });
    }else{
      ispause = !ispause;
    }
  });
}
var playsound = function(p){
  var part = parts[p];
  var freq = 440*Math.pow(2,p*5/12);
  var osc = audioctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.connect(audioctx.destination);
  osc.start();
  osc.stop(audioctx.currentTime+0.25/part.nbeat);
}
// debugout ------------------------
var isdebugout = false; // false for release
var debugout = function(str){
  if(isdebugout){
    console.log(str);
  }
}
var debug;
// graphics ------------------------
var ctx;
var can;
var canlen;
var reqdraw = true;
//init
var initdraw=function(){
  can = document.getElementById("outcanvas");
  ctx = can.getContext('2d');
}
//proc
var procdraw = function(){
  //polygon
  ctx.fillStyle  ="black";
  ctx.fillRect  (0,0,can.width, can.height);
  for(var p=0;p<parts.length;p++){
    var part = parts[p];
    var note = part.note;
    var str = part.str;
    var py = can.height/2;
    var px = can.width/parts.length*(p+0.5);
    var pw = can.width/parts.length*0.5;
    var pr = can.width/parts.length*0.3;
    ctx.strokeStyle = "white";
    for(var i=0;i<note.length-1;i++){
      var x0 = px+pr*Math.cos(2*Math.PI*note[i  ]-Math.PI/2);
      var y0 = py+pr*Math.sin(2*Math.PI*note[i  ]-Math.PI/2);
      var x1 = px+pr*Math.cos(2*Math.PI*note[i+1]-Math.PI/2);
      var y1 = py+pr*Math.sin(2*Math.PI*note[i+1]-Math.PI/2);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    //text
    ctx.fillStyle = "white";
    ctx.font = "40px 'Arial'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(str, px, py);
    //pos on the edge of polygon
    var ppos  = pos;
    var ipos0 =  Math.floor(pos*part.nbeat)   /part.nbeat;
    var ipos1 = (Math.floor(pos*part.nbeat)+1)/part.nbeat;
    var fpos  = ppos*part.nbeat-ipos0*part.nbeat;
    var x0 = px+pr*Math.cos(2*Math.PI*ipos0-Math.PI/2);
    var y0 = py+pr*Math.sin(2*Math.PI*ipos0-Math.PI/2);
    var x1 = px+pr*Math.cos(2*Math.PI*ipos1-Math.PI/2);
    var y1 = py+pr*Math.sin(2*Math.PI*ipos1-Math.PI/2);
    var x = x0*(1-fpos)+x1*fpos;
    var y = y0*(1-fpos)+y1*fpos;
    var rx = px+pr*Math.cos(2*Math.PI*ppos-Math.PI/2);
    var ry = py+pr*Math.sin(2*Math.PI*ppos-Math.PI/2);
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI*2, false);
    ctx.fill();

    //ctx.fillStyle = "blue";
    //ctx.beginPath();
    //ctx.arc(rx, ry, 10, 0, Math.PI*2, false);
    //ctx.fill();
  }
}
window.onresize = function(){ //browser resize
  var agent = navigator.userAgent;
  var wx = document.documentElement.clientWidth;
  var wy = document.documentElement.clientHeight;
  var cx = [(wx- 10)*0.9, 20].max();
  var cy = [(wy-120)*0.9, 20].max();
  canlen = [cx,cy].min();
  document.getElementById("outcanvas").width = canlen;
  document.getElementById("outcanvas").height= canlen;
};

