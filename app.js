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
	        window.app.$apply();
	        return;
	      }

	      console.log("details for input", place);
	      scope.stop._place = place;

	      //UI update
	      app.map.setCenter(place.geometry.location);
	      app.map.setZoom( 17 );
	      if(app.markers[-1] != null){
	      	app.markers[-1].setPosition(place.geometry.location);
	      }else{
	      	var marker = new google.maps.Marker({
	      		position: place.geometry.location,
	      		map: app.map,
	      	});
	      	app.markers[-1] = marker;
	      }
	      app.$apply();

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
.directive('googleAutocomplete', function () {
	return {
		restrict: 'E',
		scope: {'stop': '=', 'changed': '&'},
		replace: true,        
		template: "<input type='text' ng-model='stop._input_address'>",
		link: function (scope, element, attrs) {
			if(!scope.stop) scope.stop = {};
			var autocomplete = new google.maps.places.Autocomplete(element[0]);
			autocomplete.addListener('place_changed', function() {
				var place = autocomplete.getPlace();
				if (!place.geometry) {
	        // User entered the name of a Place that was not suggested and
	        // pressed the Enter key, or the Place Details request failed.
	        console.log("No details available for input: '" + place.name + "'");
	        scope.changed(scope.stop, null);
	        return;
	      }
	      console.log("details for input", place);
	      scope.stop.place = place;
	      scope.changed(scope.stop, place);
	    });
		}
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
    disableDoubleClickZoom: false,
    streetViewControl: false,
    mapTypeControl: true,
    mapTypeControlOptions: {
    	position: google.maps.ControlPosition.TOP_RIGHT
    },
  });


  var directionsService = new google.maps.DirectionsService;
  var directionsDisplay = new google.maps.DirectionsRenderer({
  	draggable: true,
  	map: map,
  	suppressMarkers : true,
  });
  directionsDisplay.addListener('directions_changed', function() {
  	app.computeTotalDistance(directionsDisplay.getDirections());
  });

  function deleteAllMarkers() {
  	app.markers.forEach(function(marker){
  		marker.setMap(null);
  		marker = null;
  	}); 
  	app.markers = [];
  }

  /**
  * default app configuration 
  */
  var	config = {
  	minRoutes: 1,
  	maxRoutes: 9,
  	initFee: 24,
  	adminFee: 5,
  	distanceFee: 1.6,
  	durationFee: 0.4,
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
	app.markers = [];
	app.data = data;
	app.config = config;
	app.modal = {};
	window.app = app;

	app.init = function(){
		console.log('init');
		google.maps.event.addDomListener(window, 'load', initInterface);
	}

	app.reset = function(){
		app.modal = {
			header: null,
			body: "重新設定路程?",
			callback: function(){
				deleteAllMarkers();
				app.data.stops = [];
				app.data.customers = [{name:'乘客1', pick: null, drop: null}, {name:'乘客2', pick: null, drop: null}];
				$('#messageModal').modal('hide');
			},
		}
		$('#messageModal').modal();
	}

	function initInterface() {
		console.log('initInterface');
    // Create the DIV to hold the control and call the makeInfoBox() constructor
    // passing in this DIV.
    //var panel = document.getElementById('panel');
    //map.controls[google.maps.ControlPosition.TOP_LEFT].push(panel);

    // Listen for clicks and add the location of the click to firebase.
    map.addListener('click', function(e) {
    	var geocoder = new google.maps.Geocoder;
    	var geometry = {
    		location:{
    			lat: e.latLng.lat(),
    			lng: e.latLng.lng(),
    		}
    	};
    	console.log(geometry);
    	geocoder.geocode(geometry, function(results, status) {
    		if (status === 'OK') {
    			if (results[1]) {
    				var place = results[1];
    				//console.log(results);
    				if(app.markers[-1] != null){
    					app.markers[-1].setPosition(place.geometry.location);
    				}else{
    					var marker = new google.maps.Marker({
    						position: place.geometry.location,
    						map: app.map,
    					});
    					app.markers[-1] = marker;
    				}
    				app.data.stops.forEach(function(stop){
    					if(stop.isEditing){
    						stop._input_address = place.formatted_address;
    						stop._place = place;
    						return;
    					}
    				})
    				app.data.new_stop._input_address = place.formatted_address;
    				app.data.new_stop._place = place;
    				app.$apply();
    			} else {
    				console.log('No results found');
    			}
    		} else {
    			console.log('Geocoder failed due to: ' + status);
    		}
    	});
    });

    initAuthentication();
  }
  app.inputAddressCheck = function(){
  	if(app.data.new_stop._place == null || app.data.new_stop._input_address != app.data.new_stop._place.name){
  		console.log("auto predict use input address")
  		new google.maps.places.AutocompleteService().getPlacePredictions({ 
  			input: app.data.new_stop._input_address, 
  			componentRestrictions :{country: 'hk'} 
  		}, function(results, status){
  			if (status == google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
  				console.log(results);
  				new google.maps.places.PlacesService(map).getDetails({
  					placeId: results[0].place_id
  				}, function(place, status) {
  					if (status === google.maps.places.PlacesServiceStatus.OK) {
  						if(app.markers[-1] != null){
  							app.markers[-1].setPosition(place.geometry.location);
  						}else{
  							var marker = new google.maps.Marker({
  								position: place.geometry.location,
  								map: app.map,
  							});
  							app.markers[-1] = marker;
  						}
  						app.map.setCenter(place.geometry.location);
  						app.map.setZoom( 17 );
  						app.data.new_stop._place = place;
  						app.data.new_stop._input_address = place.name;
  						app.$apply();
  					}else{
  						app.modal = {
  							header: null,
  							body: "地址無效, 請重新輸入",
  							callback: null,
  						}
  						$('#messageModal').modal();
  						app.$apply();
  					}
  				});
  			}else{
  				app.modal = {
  					header: null,
  					body: "地址無效, 請重新輸入",
  					callback: null,
  				}
  				$('#messageModal').modal();
  				app.$apply();
  			}
  		});
  	}
  }
  app.autocompleteChanged = function(stop, place){
  	//var deferred = $.Deferred();
  	//return deferred.promise();
  	console.log('stop', stop);
  	console.log('place', place);
  }

  app.addCustomer = function(){
  	var totalCustomers = app.data.customers.length;
  	if(totalCustomers >= app.config.maxRoutes)
  		return;

  	var newCustomer = {name:'乘客' + (totalCustomers+1), pick: null, drop: null};
  	app.data.customers.push(newCustomer);
  }
  app.removeCustomer = function(customer){
  	var totalCustomers = app.data.customers.length;
  	if(totalCustomers <= app.config.minRoutes)
  		return; 

  	app.modal = {
  		header: null,
  		body: "移除 "+customer.name +" ?",
  		callback: function(){
  			for(i = 0; i < totalCustomers; i++){
  				if(app.data.customers[i].$$hashKey === customer.$$hashKey){
  					app.data.customers.splice(i, 1);
  					$('#messageModal').modal('hide');
  					return;
  				}
  			}
  		},
  	}
  	$('#messageModal').modal();

  }

  app.addStop = function() {
  	console.log('addStop', app.data.new_stop);
  	var place = app.data.new_stop._place;
  	if(!place){
  		app.modal = {
  			header: null,
  			body: "地址無效, 請重新輸入",
  			callback: null,
  		}
  		$('#messageModal').modal();
  		return console.log("invalid address");
  	} 

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
  	/*
  	if(!hasCustomer){
  		app.modal = {
  			header: null,
  			body: "選擇最少一位上落車乘客",
  			callback: null,
  		}
  		$('#messageModal').modal();
  		return console.log("Assign at least one customer");
  	} 
  	*/
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

  	app.data.stops.push(stop);
		//calcular the distance
		app.getDirections();
		/*
		getDistance(app.data.stops[last_stop].location, stop.location).then(function(response){
			console.log('getDistance', response);
			stop.distance = response.rows[0].elements[0].distance.value;
			stop.duration = response.rows[0].elements[0].duration.value;
			app.updateRouteFee();
			app.$apply();
		}).fail(function(status){
			stop.distance = null;
		});
		*/

		//clear the temp var
		delete app.data.new_stop._input_address;
		delete app.data.new_stop._place;

		//UI markInfoMarkerOnMap
		app.markInfoMarkerOnMap(stop, app.data.stops.length-1);

		//store data
		dataStore();
	}

	app.updateStop = function(stop, place){
		stop.place_id = place.place_id;
		//stop.name = place.name;
		stop.formatted_address = place.formatted_address;
		if(!stop.location) stop.location = {};
		stop.location.lat = place.geometry.location.lat();
		stop.location.lng = place.geometry.location.lng();
	}

	app.markInfoMarkerOnMap = function(stop, stop_no){
		//mark the start point marker
		var marker_info = {
			position: stop.location,
			map: map,
			draggable: true,
			title: "第"+(stop_no+1)+"站",
			icon: 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+(stop_no+1)+'|FE6256|000000'
		};
		var marker = new google.maps.Marker(marker_info);
		marker.addListener('dragend', function(event){
			console.log('dragend', event);
			stop.location.lat = event.latLng.lat();
			stop.location.lng = event.latLng.lng();
			stop.name = null;
			app.getDirections();
		});
		//markersArray.push(marker);
		app.markers[stop_no] = marker;
	}

	app.editStop = function(stop, stop_no) {
		console.log('editStop', stop);
		if(stop.isEditing){
			stop.isEditing = false;
			var hasUpdate = false;
			app.data.customers.forEach(function(customer){
				if(customer.pick != customer._pick || customer.drop != customer._drop){
					hasUpdate = true;
				}
				customer.pick = customer._pick;
				customer.drop = customer._drop;
				delete customer._pick;
				delete customer._drop;
			});
			if(hasUpdate){
				app.updateRouteFee();
				//store data
				dataStore();
			}
			if(stop._place != null){
				app.updateStop(stop, stop._place);
				stop.input_address = stop._input_address;
				stop.name = stop._place.name;
				delete stop._input_address;
				delete stop._place;

				app.getDirections();

				//store data
				dataStore();
				/*
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
				*/
			}
		}else{
			stop.isEditing = true;
			//create temp var for editing
			stop._input_address = stop.formatted_address;
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

  app.removeStop = function(stop_no){
  	app.data.customers.forEach(function(customer){
  		if(customer.pick == stop_no){
  			customer.pick = null;
  			customer.drop = null;
  		}
  		if(customer.drop == stop_no){
  			customer.drop = null;
  		}
  	});
  	app.data.stops[stop_no].marker.setMap(null);
  	app.data.stops.splice(stop_no, 1);
  	app.getDirections();
  	app.$apply();
  }

  app.getDirections = function(){
  	var totalStop = app.data.stops.length;
  	if(totalStop < 2) return;
  	
  	var origin = app.data.stops[0].location;
  	var destination = app.data.stops[totalStop - 1].location;
  	var waypoints = [];
  	for(i = 1; i < totalStop - 1; i++){
  		waypoints.push({
  			location:{
  				lat:app.data.stops[i].location.lat,
  				lng:app.data.stops[i].location.lng
  			},
  			stopover: true
  		});
  	}
  	directionsService.route({
  		origin: origin,
  		destination: destination,
  		waypoints: waypoints,
  		travelMode: 'DRIVING',
  	}, function(response, status) {
  		if (status === 'OK') {
  			directionsDisplay.setDirections(response);
  		} else {
  			console.log('Could not display directions due to: ' + status);
  		}
  	});

  	//mark marker on map
  	app.data.stops.forEach(function(stop, stop_no){
  		if(app.markers[stop_no] == null){
  			app.markInfoMarkerOnMap(stop, stop_no);
  		}else{
  			app.markers[stop_no].setPosition(stop.location);
  		}
  	});
  	//temp marker for store new address
  	if(app.markers[-1] != null){
  		app.markers[-1].setMap(null);
  	}
  }

  app.computeTotalDistance = function(result) {
  	var total = 0;
  	var myroute = result.routes[0];
  	for (var i = 0; i < myroute.legs.length; i++) {
  		total += myroute.legs[i].distance.value;
  		app.data.stops[i].formatted_address = myroute.legs[i].start_address;
  		app.data.stops[i].location.lat = myroute.legs[i].start_location.lat();
  		app.data.stops[i].location.lng = myroute.legs[i].start_location.lng();
  		app.data.stops[i+1].distance = myroute.legs[i].distance.value;
  		app.data.stops[i+1].duration = myroute.legs[i].duration.value;
  		app.data.stops[i+1].formatted_address = myroute.legs[i].end_address;
  		app.data.stops[i+1].location.lat = myroute.legs[i].end_location.lat();
  		app.data.stops[i+1].location.lng = myroute.legs[i].end_location.lng();
  	}
  	total = total / 1000;
  	console.log(result, total + ' km');
  	app.updateRouteFee();
  	app.$apply();

		//store data
		var waypoints = [];
		result.request.waypoints.forEach(function(waypoint){
			waypoints.push({location:{
				lat: waypoint.location.lat(),
				lng: waypoint.location.lng(),
			}})
		})
		app.data.waypoints = waypoints;
		dataStore();

  	/*
  	//update map address
  	var service = new google.maps.places.PlacesService(map);
  	app.data.stops.forEach(function(stop, i){
  		if(result.geocoded_waypoints[i].geocoder_status == 'OK'){
  			service.getDetails({
  				placeId: result.geocoded_waypoints[i].place_id,
  			}, function(place, status) {
  				if (status === google.maps.places.PlacesServiceStatus.OK) { 
  					//console.log(place); 
  					app.updateStop(stop, place);
  					app.$apply();
  				}
  			});
  		}
  	});
  	*/
  }
  /*
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


  			var originList = response.originAddresses;
  			var destinationList = response.destinationAddresses;
				
  			var outputDiv = document.getElementById('output');
  			outputDiv.innerHTML = '';
  			
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
  					
  					outputDiv.innerHTML += originList[i] + ' to ' + destinationList[j] +
  					': ' + results[j].distance.text + ' in ' +
  					results[j].duration.text + '<br>';
  					
  				}
  			}

  			deferred.resolve(response);

  			//UI
  			var directionsService = new google.maps.DirectionsService;
  			var directionsDisplay = new google.maps.DirectionsRenderer;
  			directionsDisplay.setMap(map);
  			directionsService.route({
  				origin: origin, 
  				destination: destination,
  				travelMode: 'DRIVING'
  			}, function(response, status) {
  				if (status === 'OK') {
  					console.log(response);
  					directionsDisplay.setDirections(response);
  				} else {
  					console.log('Directions request failed due to ' + status);
  				}
  			});
  		}
  	}

  	var service = new google.maps.DistanceMatrixService;
  	service.getDistanceMatrix(apiConfig, apiResponse);
  	return deferred.promise();
  }
  */

  app.updateRouteFee = function(){
  	app.data.customers.forEach(function(customer){
  		if(customer.pick != null && customer.drop != null){
  			//customer.pickAddress = app.data.stops[customer.pick].formatted_address + ', ' + app.data.stops[customer.pick].name;
  			//customer.dropAddress = app.data.stops[customer.drop].formatted_address + ', ' + app.data.stops[customer.drop].name;

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
  			customer.durationFee = Math.trunc(Math.max(0,customer.totalDuration/60-60)) * app.config.durationFee;
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

		    //onAuthSuccess();
		    app.$apply();

		    //console.log(window.localStorage.getItem(app.data.routeId));
		    if(QueryString.routeId != null){
		    	var ref = firebase.database().ref(QueryString.routeId+'/');
		    	ref.once('value', function(snap) {
	          console.log('firebase data', snap.val());  // Add click with same timestamp.
	          if(snap.val() != null){
	          	app.data = angular.fromJson(snap.val());
	          	app.getDirections();
	          	app.$apply();
	          }else{
	          	loadLocalData();
	          }
	        }, function(err) {
	        	console.warn(err);
	        	loadLocalData();
	        });
		    }else{
		    	var ref = firebase.database().ref(app.data.routeId+'/');
		    	ref.once('value', function(snap) {
	          console.log('own firebase data', snap.val());  // Add click with same timestamp.
	          if(snap.val() != null){
	          	app.data = angular.fromJson(snap.val());
	          	app.getDirections();
	          	app.$apply();
	          }else{
	          	loadLocalData();
	          }
	        }, function(err) {
	        	console.warn(err);
	        	loadLocalData();
	        });
		    } 
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
  */



  /**
   * Updates the last_message/ path with the current timestamp.
   * @param {function(Date)} addClick After the last message timestamp has been updated,
   *     this function is called with the current timestamp to add the
   *     click to the firebase.
   */
   function getTimestamp(cb) {
    // Reference to location for saving the last click time.
    var ref = firebase.database().ref('last_message/' + app.data.routeId);

    ref.onDisconnect().remove();  // Delete reference from firebase on disconnect.

    // Set value to timestamp.
    ref.set(firebase.database.ServerValue.TIMESTAMP, function(err) {
      if (err) {  // Write to last message was unsuccessful.
      	console.log(err);
      } else {  // Write to last message was successful.
      	ref.once('value', function(snap) {
          cb(snap.val());  // Add click with same timestamp.
        }, function(err) {
        	console.warn(err);
        });
      }
    });
  }

  function dataStore(){
  	console.log('storing data');
  	//store locally
  	window.localStorage.setItem(app.data.routeId, angular.toJson(app.data));
		//store in firebase
		addToFirebase();
	}
	function loadLocalData(){
		console.log('load Local Data');
		if(window.localStorage.getItem(app.data.routeId) != null){
			app.data = angular.fromJson(window.localStorage.getItem(app.data.routeId));
			app.getDirections();
			app.$apply();
		}else{
			console.log('using default config data');
			dataStore();
		}
	}
	function loadFirebaseData(){

	}
  /**
   * Adds a click to firebase.
   * @param {Object} data The data to be added to firebase.
   *     It contains the lat, lng, sender and timestamp.
   */
   function addToFirebase() {
   	getTimestamp(function(timestamp) {
      // Add the new timestamp to the record data.
      app.data.timestamp = timestamp;
      var ref = firebase.database().ref(app.data.routeId+'/');
      ref.set(angular.toJson(app.data), function(err) {
        if (err) {  // Data was not written to firebase.
        	console.warn(err);
        } else {  // Write to last message was successful.
        	ref.once('value', function(snap) {
	          console.log('data stored');  // Add click with same timestamp.
	        }, function(err) {
	        	console.warn(err);
	        });
        }
      });
    });
   }

   app.intToAlpha = function(i){
   	return String.fromCharCode(65 + i);
   }

   var QueryString = function () {
	  // This function is anonymous, is executed immediately and 
	  // the return value is assigned to QueryString!
	  var query_string = {};
	  var query = window.location.search.substring(1);
	  var vars = query.split("&");
	  for (var i=0;i<vars.length;i++) {
	  	var pair = vars[i].split("=");
	        // If first entry with this name
	        if (typeof query_string[pair[0]] === "undefined") {
	        	query_string[pair[0]] = decodeURIComponent(pair[1]);
	        // If second entry with this name
	      } else if (typeof query_string[pair[0]] === "string") {
	      	var arr = [ query_string[pair[0]],decodeURIComponent(pair[1]) ];
	      	query_string[pair[0]] = arr;
	        // If third or later entry with this name
	      } else {
	      	query_string[pair[0]].push(decodeURIComponent(pair[1]));
	      }
	    } 
	    return query_string;
	  }();
	}]);

