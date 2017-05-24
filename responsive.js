$(document).ready(function(){
	var wideAtleast = 600; //at least 600px
	var isWide = true;
	if($(window).width() <= wideAtleast || isMobile()){
		isWide = false;
	}

	function isMobile(){
		if( navigator.userAgent.match(/Android/i)
			|| navigator.userAgent.match(/webOS/i)
			|| navigator.userAgent.match(/iPhone/i)
			|| navigator.userAgent.match(/iPad/i)
			|| navigator.userAgent.match(/iPod/i)
			|| navigator.userAgent.match(/BlackBerry/i)
			|| navigator.userAgent.match(/Windows Phone/i)
			){
			return true;
	}else{
		return false;
	}
}
setScreen();

$(window).resize(function(){
	if ($(window).width() <= wideAtleast || isMobile()){	
		if(isWide){
			isWide = false;
			setScreen();
		}
	}else{
		if(!isWide){
			isWide = true;
			setScreen();
		}
	}
});

function setScreen(){
	var panel = document.getElementById('panel');
	var mapTab = document.getElementById('map-tab');
	if(isWide){
			//panel.style.float = "left";
			panel.style.width = "400px";
			panel.style.position = "relative";
			panel.style.height = "100%";
			mapTab.style.display = "none";
		}else{
			//panel.style.float = "none";
			panel.style.width = "100%";
			panel.style.position = "absolute";
			panel.style.height = "auto";
			mapTab.style.display = "block";
		}

	}
});