import { PointerLockControls } from 'https://cdn.skypack.dev/three@v0.136.0/examples/jsm/controls/PointerLockControls.js';

var APP = {

	Player: function () {

		var renderer = new THREE.WebGLRenderer( { antialias: true } );
		renderer.setPixelRatio( window.devicePixelRatio ); // TODO: Use player.setPixelRatio()
		renderer.outputEncoding = THREE.sRGBEncoding;

		var loader = new THREE.ObjectLoader();
		var camera, scene, controls;

		var vrButton = VRButton.createButton( renderer ); // eslint-disable-line no-undef

		var events = {};

		var dom = document.createElement( 'div' );
		dom.appendChild( renderer.domElement );

		this.dom = dom;

		this.width = 500;
		this.height = 500;

		let moveForward = false;
		let moveBackward = false;
		let moveLeft = false;
		let moveRight = false;

		const velocity = new THREE.Vector3();
		const direction = new THREE.Vector3();

		this.load = function ( json ) {

			var project = json.project;

			if ( project.vr !== undefined ) renderer.xr.enabled = project.vr;
			if ( project.shadows !== undefined ) renderer.shadowMap.enabled = project.shadows;
			if ( project.shadowType !== undefined ) renderer.shadowMap.type = project.shadowType;
			if ( project.toneMapping !== undefined ) renderer.toneMapping = project.toneMapping;
			if ( project.toneMappingExposure !== undefined ) renderer.toneMappingExposure = project.toneMappingExposure;
			if ( project.physicallyCorrectLights !== undefined ) renderer.physicallyCorrectLights = project.physicallyCorrectLights;

			this.setScene( loader.parse( json.scene ) );
			this.setCamera( loader.parse( json.camera ) );

			events = {
				init: [],
				start: [],
				stop: [],
				keydown: [],
				keyup: [],
				pointerdown: [],
				pointerup: [],
				pointermove: [],
				update: []
			};

			var scriptWrapParams = 'player,renderer,scene,camera';
			var scriptWrapResultObj = {};

			for ( var eventKey in events ) {

				scriptWrapParams += ',' + eventKey;
				scriptWrapResultObj[ eventKey ] = eventKey;

			}

			var scriptWrapResult = JSON.stringify( scriptWrapResultObj ).replace( /\"/g, '' );

			for ( var uuid in json.scripts ) {

				var object = scene.getObjectByProperty( 'uuid', uuid, true );

				if ( object === undefined ) {

					console.warn( 'APP.Player: Script without object.', uuid );
					continue;

				}

				var scripts = json.scripts[ uuid ];

				for ( var i = 0; i < scripts.length; i ++ ) {

					var script = scripts[ i ];

					var functions = ( new Function( scriptWrapParams, script.source + '\nreturn ' + scriptWrapResult + ';' ).bind( object ) )( this, renderer, scene, camera );

					for ( var name in functions ) {

						if ( functions[ name ] === undefined ) continue;

						if ( events[ name ] === undefined ) {

							console.warn( 'APP.Player: Event type not supported (', name, ')' );
							continue;

						}

						events[ name ].push( functions[ name ].bind( object ) );

					}

				}

			}

			dispatch( events.init, arguments );

			controls = new PointerLockControls( camera, document.body );
			const blocker = document.getElementById( 'blocker' );
			const instructions = document.getElementById( 'instructions' );

			instructions.addEventListener( 'click', function () {
				controls.lock();
			} );

			controls.addEventListener( 'lock', function () {
				instructions.style.display = 'none';
				blocker.style.display = 'none';
			} );

			controls.addEventListener( 'unlock', function () {
				blocker.style.display = 'block';
				instructions.style.display = '';
			} );

			const onKeyDown = function ( event ) {
				switch ( event.code ) {
					case 'ArrowUp':
					case 'KeyW':
						moveForward = true;
						break;
					case 'ArrowLeft':
					case 'KeyA':
						moveLeft = true;
						break;
					case 'ArrowDown':
					case 'KeyS':
						moveBackward = true;
						break;
					case 'ArrowRight':
					case 'KeyD':
						moveRight = true;
						break;
					case 'Space':
						if ( canJump === true ) velocity.y += 350;
						canJump = false;
						break;
				}
			};

			const onKeyUp = function ( event ) {
				switch ( event.code ) {
					case 'ArrowUp':
					case 'KeyW':
						moveForward = false;
						break;
					case 'ArrowLeft':
					case 'KeyA':
						moveLeft = false;
						break;
					case 'ArrowDown':
					case 'KeyS':
						moveBackward = false;
						break;
					case 'ArrowRight':
					case 'KeyD':
						moveRight = false;
						break;
				}
			};

			document.addEventListener( 'keydown', onKeyDown );
			document.addEventListener( 'keyup', onKeyUp );

		};

		this.setCamera = function ( value ) {

			camera = value;
			camera.aspect = this.width / this.height;
			camera.updateProjectionMatrix();

		};

		this.setScene = function ( value ) {

			scene = value;

		};

		this.setPixelRatio = function ( pixelRatio ) {

			renderer.setPixelRatio( pixelRatio );

		};

		this.setSize = function ( width, height ) {

			this.width = width;
			this.height = height;

			if ( camera ) {

				camera.aspect = this.width / this.height;
				camera.updateProjectionMatrix();

			}

			if ( renderer ) {

				renderer.setSize( width, height );

			}

		};

		function dispatch( array, event ) {

			for ( var i = 0, l = array.length; i < l; i ++ ) {

				array[ i ]( event );

			}

		}

		var time, startTime, prevTime;

		function animate() {

			time = performance.now();

			try {

				dispatch( events.update, { time: time - startTime, delta: time - prevTime } );

			} catch ( e ) {

				console.error( ( e.message || e ), ( e.stack || '' ) );

			}

			if ( controls.isLocked === true ) {

				// raycaster.ray.origin.copy( controls.getObject().position );
				// raycaster.ray.origin.y -= 10;

				// const intersections = raycaster.intersectObjects( objects, false );

				// const onObject = intersections.length > 0;

				const delta = ( time - prevTime ) / 1000;

				velocity.x -= velocity.x * 10.0 * delta;
				velocity.z -= velocity.z * 10.0 * delta;

				velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

				direction.z = Number( moveForward ) - Number( moveBackward );
				direction.x = Number( moveRight ) - Number( moveLeft );
				direction.normalize(); // this ensures consistent movements in all directions

				if ( moveForward || moveBackward ) velocity.z -= direction.z * 40.0 * delta;
				if ( moveLeft || moveRight ) velocity.x -= direction.x * 40.0 * delta;

				// if ( onObject === true ) {

				// 	velocity.y = Math.max( 0, velocity.y );
				// 	canJump = true;

				// }

				controls.moveRight( - velocity.x * delta );
				controls.moveForward( - velocity.z * delta );

				// controls.getObject().position.y += ( velocity.y * delta ); // new behavior

				// if ( controls.getObject().position.y < 10 ) {

				// 	velocity.y = 0;
				// 	controls.getObject().position.y = 10;

				// 	canJump = true;

				// }

			}

			renderer.render( scene, camera );

			prevTime = time;

		}

		this.play = function () {

			if ( renderer.xr.enabled ) dom.append( vrButton );

			startTime = prevTime = performance.now();

			document.addEventListener( 'keydown', onKeyDown );
			document.addEventListener( 'keyup', onKeyUp );
			document.addEventListener( 'pointerdown', onPointerDown );
			document.addEventListener( 'pointerup', onPointerUp );
			document.addEventListener( 'pointermove', onPointerMove );

			dispatch( events.start, arguments );

			renderer.setAnimationLoop( animate );

		};

		this.stop = function () {

			if ( renderer.xr.enabled ) vrButton.remove();

			document.removeEventListener( 'keydown', onKeyDown );
			document.removeEventListener( 'keyup', onKeyUp );
			document.removeEventListener( 'pointerdown', onPointerDown );
			document.removeEventListener( 'pointerup', onPointerUp );
			document.removeEventListener( 'pointermove', onPointerMove );

			dispatch( events.stop, arguments );

			renderer.setAnimationLoop( null );

		};

		this.render = function ( time ) {

			dispatch( events.update, { time: time * 1000, delta: 0 /* TODO */ } );

			renderer.render( scene, camera );

		};

		this.dispose = function () {

			renderer.dispose();

			camera = undefined;
			scene = undefined;

		};

		//

		function onKeyDown( event ) {

			dispatch( events.keydown, event );

		}

		function onKeyUp( event ) {

			dispatch( events.keyup, event );

		}

		function onPointerDown( event ) {

			dispatch( events.pointerdown, event );

		}

		function onPointerUp( event ) {

			dispatch( events.pointerup, event );

		}

		function onPointerMove( event ) {

			dispatch( events.pointermove, event );

		}

	}

};

export { APP };
