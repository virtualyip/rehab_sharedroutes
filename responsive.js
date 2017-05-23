$(document).ready(function(){
	var isWide = true;
	if($(window).width() <= 768){
		isWide = false;
	}
	setScreen();

	$(window).resize(function(){
		if ($(window).width() <= 768){	
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