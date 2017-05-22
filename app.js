angular.module('app', [])
.directive('autocompleteInput', function () {
	return {
		scope: {'stop': '='},
		link: function (scope, element, attrs) {
			//console.log(scope, element, attrs);
			if(!scope.stop) scope.stop = {};
			//scope.autocompleteInit(element, scope.stop);

			//var inputId = "searchbox-new";
			//if(stop != null){
			//	inputId = 'searchbox-'+stop.stop_no;
			//}
			//var input = document.getElementById(inputId);
			//console.log(inputId, input);
			var autocomplete = new google.maps.places.Autocomplete(element[0]);
			autocomplete.addListener('place_changed', function() {
				var place = autocomplete.getPlace();
				if (!place.geometry) {
	        // User entered the name of a Place that was not suggested and
	        // pressed the Enter key, or the Place Details request failed.
	        console.log("No details available for input: '" + place.name + "'");
	        scope.stop._place = null;
	        return;
	      }

	      console.log("details for input", place);
	      scope.stop._place = place;
	      window.app.$apply();
	      /*
	      if(attrs.stopNo == "-1"){
	      	app.addStop(place)
	      }else{
	      	app.editStop(place, attrs.stopNo);
	      }
	      */
	    });
		},
	};
})
.controller('AppController', ['$scope', function($scope) {


  /**
  * Creates a map object with a click listener and a heatmap.
  */
  var map = new google.maps.Map(document.getElementById('map'), {
  	center: {lat: 22.2935255, lng: 114.2310156},
  	zoom: 15,
  	styles: [{
  		featureType: 'poi',
      stylers: [{ visibility: 'off' }]  // Turn off POI.
    }],
    disableDoubleClickZoom: true,
    streetViewControl: false,
  });

  /**
  * default app configuration 
  */
  var	config = {
  	minRoutes: 1,
  	maxRoutes: 9,
  	initFee: 29,
  	adminFee: 5,
  	distanceFee: 1.6,
  	durationFee: 32,
  	sharedDiscount: 0.6,
  };

  /**
	*	final data structure
  * Data object to be written to Firebase.
  */
  var data = {
  	timestamp: null,
  	routeId : "",
  	//routes: 2,
  	new_stop : {},
  	stops: [],
  	customers : [{name:'乘客1', pick: null, drop: null}, {name:'乘客2', pick: null, drop: null}]
  };

	//a global variable used on all funciton
	var app = $scope;
	app.map = map;
	app.data = data;
	app.config = config;
	window.app = app;

	app.init = function(){
		console.log('init');
		google.maps.event.addDomListener(window, 'load', initInterface);
	}

	function makeInfoBox(controlDiv, map) {
    // Set CSS for the control border.
    var controlUI = document.createElement('div');
    controlUI.style.boxShadow = 'rgba(0, 0, 0, 0.298039) 0px 1px 4px -1px';
    controlUI.style.backgroundColor = '#fff';
    controlUI.style.border = '2px solid #fff';
    controlUI.style.borderRadius = '2px';
    controlUI.style.marginBottom = '22px';
    controlUI.style.marginTop = '10px';
    controlUI.style.textAlign = 'center';
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior.
    var controlText = document.createElement('div');
    controlText.style.color = 'rgb(25,25,25)';
    controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
    controlText.style.fontSize = '100%';
    controlText.style.padding = '6px';
    controlText.textContent = 'The map shows all clicks made in the last 10 minutes.';
    controlUI.appendChild(controlText);
  }

  function initInterface() {
  	console.log('initInterface');
    // Create the DIV to hold the control and call the makeInfoBox() constructor
    // passing in this DIV.
    var infoBoxDiv = document.createElement('div');
    makeInfoBox(infoBoxDiv, map);
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(infoBoxDiv);

    // Listen for clicks and add the location of the click to firebase.
    map.addListener('click', function(e) {
    	data.lat = e.latLng.lat();
    	data.lng = e.latLng.lng();
    	//addToFirebase(data);
    });

    // Create a heatmap.
    var heatmap = new google.maps.visualization.HeatmapLayer({
    	data: [],
    	map: map,
    	radius: 16
    });

    initAuthentication(initFirebase.bind(undefined, heatmap));

  }

  app.addCustomer = function(){
  	var totalCustomers = app.data.customers.length;
  	if(totalCustomers >= app.config.maxRoutes)
  		return;

  	var newCustomer = {name:'乘客' + (totalCustomers+1), pick: null, drop: null};
  	app.data.customers.push(newCustomer);
  }
  app.removeCustomer = function(hashKey){
  	var totalCustomers = app.data.customers.length;
  	if(totalCustomers <= app.config.minRoutes)
  		return; 

  	for(i = 0; i < totalCustomers; i++){
  		if(app.data.customers[i].$$hashKey === hashKey){
  			app.data.customers.splice(i, 1);
  			return;
  		}
  	}
  }

  app.addStop = function() {
  	console.log('addStop', app.data.new_stop);
  	var place = app.data.new_stop._place;
  	if(!place) return console.log("invalid address");

  	var hasCustomer = false;
  	app.data.customers.forEach(function(customer){
  		if(customer._pick >= 0){
  			customer.pick = customer._pick;
  			delete customer._pick;
  			hasCustomer = true;
  		}
  		if(customer._drop >= 0){
  			customer.drop = customer._drop;
  			delete customer._drop;
  			hasCustomer = true;
  		}
  	});
  	if(!hasCustomer) return console.log("Assign at least one customer");

  	var stop = {
  		stop_no : data.stops.length + 1,
  		input_address: app.data.new_stop._input_address,
  		name: place.name,
  		formatted_address: place.formatted_address,
  		location : {
  			lat : place.geometry.location.lat(),
  			lng : place.geometry.location.lng(),
  		},
  	};

		//calcular the distance
		if(app.data.stops.length >= 1){
			var last_stop = app.data.stops.length - 1;
			getDistance(app.data.stops[last_stop].location, stop.location).then(function(response){
				console.log('getDistance', response);
				stop.distance = response.rows[0].elements[0].distance.value;
				stop.duration = response.rows[0].elements[0].duration.value;
				app.updateRouteFee();
				app.$apply();
			}).fail(function(status){
				stop.distance = null;
			});
		}

		app.data.stops.push(stop);

		//apply new data change
		//app.$apply();

		//clear the temp var
		delete app.data.new_stop._input_address;
		delete app.data.new_stop._place;

	}

	app.editStop = function(stop, stop_no) {
		console.log('editStop', stop);
		if(stop.isEditing){
			stop.isEditing = false;
			if(stop._place != null){
				stop.input_address = stop._input_address;
				stop.name =  stop._place.name;
				stop.formatted_address =  stop._place.formatted_address;
				stop.location.lat =  stop._place.geometry.location.lat();
				stop.location.lng =  stop._place.geometry.location.lng();
				delete stop._input_address;
				delete stop._place;

				//get new distance for previous stop and next stop
				var prev_stop = app.data.stops[stop_no-1];
				if(prev_stop){
					getDistance(prev_stop.location, stop.location).then(function(response){
						console.log('getDistance prev', response);
						stop.distance = response.rows[0].elements[0].distance.value;
						stop.duration = response.rows[0].elements[0].duration.value;

						var next_stop = app.data.stops[stop_no+1];
						if(next_stop){
							return getDistance(stop.location, next_stop.location).then(function(response){
								console.log('getDistance next', response);
								next_stop.distance = response.rows[0].elements[0].distance.value;
								next_stop.duration = response.rows[0].elements[0].duration.value;
								app.updateRouteFee();
								app.$apply();
							}).fail(function(status){
								next_stop.distance = null;
							});
						}else{
							app.updateRouteFee();
							app.$apply();
						}
					}).fail(function(status){
						stop.distance = null;
					});
				}
			}
			app.data.customers.forEach(function(customer){
				customer.pick = customer._pick;
				customer.drop = customer._drop;
				delete customer._pick;
				delete customer._drop;
			});
		}else{
			stop.isEditing = true;
			//create temp var for editing
			stop._input_address = stop.input_address;
			app.data.customers.forEach(function(customer){
				if(customer._pick == null){
					customer._pick = customer.pick;
				}
				if(customer._drop == null){
					customer._drop = customer.drop;
				}
			});
		} 
		/*
    // If the place has a geometry, then present it on a map.
    if (place.geometry.viewport) {
    	map.fitBounds(place.geometry.viewport);
    } else {
    	map.setCenter(place.geometry.location);
      map.setZoom(17);  // Why 17? Because it looks good.
    }
    var marker = new google.maps.Marker({
    	map: map,
    	anchorPoint: new google.maps.Point(0, -29)
    });
    */
    //marker.setIcon(/** @type {google.maps.Icon} */({
    /*
    	url: place.icon,
    	size: new google.maps.Size(71, 71),
    	origin: new google.maps.Point(0, 0),
    	anchor: new google.maps.Point(17, 34),
    	scaledSize: new google.maps.Size(35, 35)
    }));
    marker.setPosition(place.geometry.location);
    marker.setVisible(true);

    var address = '';
    if (place.address_components) {
    	address = [
    	(place.address_components[0] && place.address_components[0].short_name || ''),
    	(place.address_components[1] && place.address_components[1].short_name || ''),
    	(place.address_components[2] && place.address_components[2].short_name || '')
    	].join(' ');
    }
    */
  }

  function getDistance(origin, destination){

  	var deferred = $.Deferred();

  	var apiConfig = {
  		origins: [origin],
  		destinations: [destination],
  		travelMode: 'DRIVING',
  		unitSystem: google.maps.UnitSystem.METRIC,
  		avoidHighways: false,
  		avoidTolls: false
  	};

  	var apiResponse = function(response, status) {
  		if (status !== 'OK') {
  			console.log('Error was: ' + status);
  			deferred.reject(status);
  		} else {
  			var bounds = new google.maps.LatLngBounds;
  			var geocoder = new google.maps.Geocoder;

  			var markersArray = [];
  			function deleteMarkers(markersArray) {
  				for (var i = 0; i < markersArray.length; i++) {
  					markersArray[i].setMap(null);
  				}
  				markersArray = [];
  			}

  			var originList = response.originAddresses;
  			var destinationList = response.destinationAddresses;
				/*
  			var outputDiv = document.getElementById('output');
  			outputDiv.innerHTML = '';
  			*/
  			deleteMarkers(markersArray);

  			var destinationIcon = 'https://chart.googleapis.com/chart?' +
  			'chst=d_map_pin_letter&chld=D|FF0000|000000';
  			var originIcon = 'https://chart.googleapis.com/chart?' +
  			'chst=d_map_pin_letter&chld=O|FFFF00|000000';
  			var showGeocodedAddressOnMap = function(asDestination) {
  				var icon = asDestination ? destinationIcon : originIcon;
  				return function(results, status) {
  					if (status === 'OK') {
  						map.fitBounds(bounds.extend(results[0].geometry.location));
  						markersArray.push(new google.maps.Marker({
  							map: map,
  							position: results[0].geometry.location,
  							icon: icon
  						}));
  					} else {
  						deferred.reject('Geocode was not successful due to: ' + status);
  						//alert('Geocode was not successful due to: ' + status);
  					}
  				};
  			};

  			for (var i = 0; i < originList.length; i++) {
  				var results = response.rows[i].elements;
  				geocoder.geocode({'address': originList[i]},
  					showGeocodedAddressOnMap(false));
  				for (var j = 0; j < results.length; j++) {
  					//add hotfix
  					if( results[j].status == "ZERO_RESULTS" ){
  						deferred.reject('Result was not successful due to: ZERO_RESULTS');
  					}

  					geocoder.geocode({'address': destinationList[j]},
  						showGeocodedAddressOnMap(true));
  					/*
  					outputDiv.innerHTML += originList[i] + ' to ' + destinationList[j] +
  					': ' + results[j].distance.text + ' in ' +
  					results[j].duration.text + '<br>';
  					*/
  				}
  			}

  			deferred.resolve(response);
  		}
  	}

  	var service = new google.maps.DistanceMatrixService;
  	service.getDistanceMatrix(apiConfig, apiResponse);
  	return deferred.promise();
  }

  app.updateRouteFee = function(){
  	app.data.customers.forEach(function(customer){
  		if(customer.pick != null && customer.drop != null){
  			customer.pickAddress = app.data.stops[customer.pick].formatted_address + ', ' + app.data.stops[customer.pick].name;
  			customer.dropAddress = app.data.stops[customer.drop].formatted_address + ', ' + app.data.stops[customer.drop].name;

  			customer.totalDistance = 0; 
  			customer.totalDuration = 0; 
  			for(i = customer.pick + 1; i <= customer.drop; i++){
  				if(!app.data.stops[i].distance || !app.data.stops[i].duration){
  					customer.totalDistance = -1;
  					customer.totalDuration = -1; 
  					break;
  				}
  				customer.totalDistance += app.data.stops[i].distance;
  				customer.totalDuration += app.data.stops[i].duration;
  			}

  			//fee calcution
  			customer.distanceFee = Math.trunc(customer.totalDistance/1000 + 1) * app.config.distanceFee; 
  			customer.durationFee = Math.trunc(customer.totalDuration/3600) * app.config.durationFee;
  			customer.totalFee = app.config.initFee + app.config.adminFee + customer.distanceFee + customer.durationFee;

  			//shared route discount
  			customer.sharedDiscount = 0;
  			if(app.data.customers.length > 1){
  				customer.sharedDiscount = customer.totalFee * (1-app.config.sharedDiscount);
  				customer.totalFee -= customer.sharedDiscount;
  			}
  		}
  	})
  }

  /**
  * Starting point for running the program. Authenticates the user.
  * @param {function()} onAuthSuccess - Called when authentication succeeds.
  */
  function initAuthentication(onAuthSuccess) {
  	/*
  	firebase.authAnonymously(function(error, authData) {
  		if (error) {
  			console.log('Login Failed!', error);
  		} else {
  			data.sender = authData.uid;
  			onAuthSuccess();
  		}
    }, {remember: 'sessionOnly'});  // Users will get a new id for every session.
    */
    firebase.auth().signInAnonymously().catch(function(error) {
		  // Handle Errors here.
		  var errorCode = error.code;
		  var errorMessage = error.message;
		  console.log('Login Failed!', error);
		});
    firebase.auth().onAuthStateChanged(function(user) {
    	if (user) {
		    // User is signed in.
		    console.log('Logged in!', user);
		    app.data.isAnonymous = user.isAnonymous;
		    app.data.routeId = user.uid;
		    onAuthSuccess();
		    app.$apply();
		  } else {
		    // User is signed out.
		    console.log('Logged out!', 'error');
		  }
		  // ...
		});
  }

  /**
   * Set up a Firebase with deletion on clicks older than expirySeconds
   * @param {!google.maps.visualization.HeatmapLayer} heatmap The heatmap to
   * which points are added from Firebase.
   */
   function initFirebase(heatmap) {

    // 10 minutes before current time.
    var startTime = new Date().getTime() - (60 * 10 * 1000);

    // Reference to the clicks in Firebase.
    var clicks = firebase.database().ref('clicks');

    // Listener for when a click is added.
    clicks.orderByChild('timestamp').startAt(startTime).on('child_added',
    	function(snapshot) {

        // Get that click from firebase.
        var newPosition = snapshot.val();
        var point = new google.maps.LatLng(newPosition.lat, newPosition.lng);
        var elapsed = new Date().getTime() - newPosition.timestamp;

        // Add the point to  the heatmap.
        heatmap.getData().push(point);

        // Requests entries older than expiry time (10 minutes).
        var expirySeconds = Math.max(60 * 1 * 1000 - elapsed, 0);
        // Set client timeout to remove the point after a certain time.
        window.setTimeout(function() {
          // Delete the old point from the database.
          snapshot.ref.remove();
        }, expirySeconds);
      }
      );

    // Remove old data from the heatmap when a point is removed from firebase.
    clicks.on('child_removed', function(snapshot, prevChildKey) {
    	var heatmapData = heatmap.getData();
    	var i = 0;
    	while (snapshot.val().lat != heatmapData.getAt(i).lat()
    		|| snapshot.val().lng != heatmapData.getAt(i).lng()) {
    		i++;
    }
    heatmapData.removeAt(i);
  });
  }

  /**
   * Updates the last_message/ path with the current timestamp.
   * @param {function(Date)} addClick After the last message timestamp has been updated,
   *     this function is called with the current timestamp to add the
   *     click to the firebase.
   */
   function getTimestamp(addClick) {
    // Reference to location for saving the last click time.
    var ref = firebase.database().ref('last_message/' + app.data.routeId);

    ref.onDisconnect().remove();  // Delete reference from firebase on disconnect.

    // Set value to timestamp.
    ref.set(firebase.database.ServerValue.TIMESTAMP, function(err) {
      if (err) {  // Write to last message was unsuccessful.
      	console.log(err);
      } else {  // Write to last message was successful.
      	ref.once('value', function(snap) {
          addClick(snap.val());  // Add click with same timestamp.
        }, function(err) {
        	console.warn(err);
        });
      }
    });
  }

  /**
   * Adds a click to firebase.
   * @param {Object} data The data to be added to firebase.
   *     It contains the lat, lng, sender and timestamp.
   */
   function addToFirebase(data) {
   	getTimestamp(function(timestamp) {
      // Add the new timestamp to the record data.
      app.data.timestamp = timestamp;
      var ref = firebase.database().ref('clicks').push(app.data, function(err) {
        if (err) {  // Data was not written to firebase.
        	console.warn(err);
        }
      });
    });
   }
 }]);