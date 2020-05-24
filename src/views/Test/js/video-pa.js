(function () { function r (e, n, t) { function o (i, f) { if (!n[i]) { if (!e[i]) { var c = typeof require === 'function' && require; if (!f && c) return c(i, !0); if (u) return u(i, !0); var a = new Error("Cannot find module '" + i + "'"); throw a.code = 'MODULE_NOT_FOUND', a } var p = n[i] = { exports: {} }; e[i][0].call(p.exports, function (r) { var n = e[i][1][r]; return o(n || r) }, p, p.exports, r, e, n, t) } return n[i].exports } for (var u = typeof require === 'function' && require, i = 0; i < t.length; i++)o(t[i]); return o } return r })()({
  1: [function (require, module, exports) {
  /*! npm.im/intervalometer */
    'use strict'

    Object.defineProperty(exports, '__esModule', { value: true })

    function intervalometer (cb, request, cancel, requestParameter) {
      var requestId
      var previousLoopTime
      function loop (now) {
      // must be requested before cb() because that might call .stop()
        requestId = request(loop, requestParameter)

        // called with "ms since last call". 0 on start()
        cb(now - (previousLoopTime || now))

        previousLoopTime = now
      }
      return {
        start: function start () {
          if (!requestId) { // prevent double starts
            loop(0)
          }
        },
        stop: function stop () {
          cancel(requestId)
          requestId = null
          previousLoopTime = 0
        }
      }
    }

    function frameIntervalometer (cb) {
      return intervalometer(cb, requestAnimationFrame, cancelAnimationFrame)
    }

    function timerIntervalometer (cb, delay) {
      return intervalometer(cb, setTimeout, clearTimeout, delay)
    }

    exports.intervalometer = intervalometer
    exports.frameIntervalometer = frameIntervalometer
    exports.timerIntervalometer = timerIntervalometer
  }, {}],
  2: [function (require, module, exports) {
  /*! npm.im/iphone-inline-video */
    'use strict'

    function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex.default : ex }

    var Symbol = _interopDefault(require('poor-mans-symbol'))
    var intervalometer = require('intervalometer')

    function preventEvent (element, eventName, toggleProperty, preventWithProperty) {
      function handler (e) {
        if (Boolean(element[toggleProperty]) === Boolean(preventWithProperty)) {
          e.stopImmediatePropagation()
          // console.log(eventName, 'prevented on', element);
        }
        delete element[toggleProperty]
      }
      element.addEventListener(eventName, handler, false)

      // Return handler to allow to disable the prevention. Usage:
      // const preventionHandler = preventEvent(el, 'click');
      // el.removeEventHandler('click', preventionHandler);
      return handler
    }

    function proxyProperty (object, propertyName, sourceObject, copyFirst) {
      function get () {
        return sourceObject[propertyName]
      }
      function set (value) {
        sourceObject[propertyName] = value
      }

      if (copyFirst) {
        set(object[propertyName])
      }

      Object.defineProperty(object, propertyName, { get: get, set: set })
    }

    function proxyEvent (object, eventName, sourceObject) {
      sourceObject.addEventListener(eventName, function () { return object.dispatchEvent(new Event(eventName)) })
    }

    function dispatchEventAsync (element, type) {
      Promise.resolve().then(function () {
        element.dispatchEvent(new Event(type))
      })
    }

    // iOS 10 adds support for native inline playback + silent autoplay
    var isWhitelisted = 'object-fit' in document.head.style && /iPhone|iPod/i.test(navigator.userAgent) && !matchMedia('(-webkit-video-playable-inline)').matches

    var ಠ = Symbol()
    var ಠevent = Symbol()
    var ಠplay = Symbol('nativeplay')
    var ಠpause = Symbol('nativepause')

    /**
     * UTILS
     */

    function getAudioFromVideo (video) {
      var audio = new Audio()
      proxyEvent(video, 'play', audio)
      proxyEvent(video, 'playing', audio)
      proxyEvent(video, 'pause', audio)
      audio.crossOrigin = video.crossOrigin

      // 'data:' causes audio.networkState > 0
      // which then allows to keep <audio> in a resumable playing state
      // i.e. once you set a real src it will keep playing if it was if .play() was called
      audio.src = video.src || video.currentSrc || 'data:'

      // if (audio.src === 'data:') {
      //   TODO: wait for video to be selected
      // }
      return audio
    }

    var lastRequests = []
    var requestIndex = 0
    var lastTimeupdateEvent

    function setTime (video, time, rememberOnly) {
    // allow one timeupdate event every 200+ ms
      if ((lastTimeupdateEvent || 0) + 200 < Date.now()) {
        video[ಠevent] = true
        lastTimeupdateEvent = Date.now()
      }
      if (!rememberOnly) {
        video.currentTime = time
      }
      lastRequests[++requestIndex % 3] = time * 100 | 0 / 100
    }

    function isPlayerEnded (player) {
      return player.driver.currentTime >= player.video.duration
    }

    function update (timeDiff) {
      var player = this
      // console.log('update', player.video.readyState, player.video.networkState, player.driver.readyState, player.driver.networkState, player.driver.paused);
      if (player.video.readyState >= player.video.HAVE_FUTURE_DATA) {
        if (!player.hasAudio) {
          player.driver.currentTime = player.video.currentTime + ((timeDiff * player.video.playbackRate) / 1000)
          if (player.video.loop && isPlayerEnded(player)) {
            player.driver.currentTime = 0
          }
        }
        setTime(player.video, player.driver.currentTime)
      } else if (player.video.networkState === player.video.NETWORK_IDLE && !player.video.buffered.length) {
      // this should happen when the source is available but:
      // - it's potentially playing (.paused === false)
      // - it's not ready to play
      // - it's not loading
      // If it hasAudio, that will be loaded in the 'emptied' handler below
        player.video.load()
        // console.log('Will load');
      }

      // console.assert(player.video.currentTime === player.driver.currentTime, 'Video not updating!');

      if (player.video.ended) {
        delete player.video[ಠevent] // allow timeupdate event
        player.video.pause(true)
      }
    }

    /**
     * METHODS
     */

    function play () {
    // console.log('play');
      var video = this
      var player = video[ಠ]

      // if it's fullscreen, use the native player
      if (video.webkitDisplayingFullscreen) {
        video[ಠplay]()
        return
      }

      if (player.driver.src !== 'data:' && player.driver.src !== video.src) {
      // console.log('src changed on play', video.src);
        setTime(video, 0, true)
        player.driver.src = video.src
      }

      if (!video.paused) {
        return
      }
      player.paused = false

      if (!video.buffered.length) {
      // .load() causes the emptied event
      // the alternative is .play()+.pause() but that triggers play/pause events, even worse
      // possibly the alternative is preventing this event only once
        video.load()
      }

      player.driver.play()
      player.updater.start()

      if (!player.hasAudio) {
        dispatchEventAsync(video, 'play')
        if (player.video.readyState >= player.video.HAVE_ENOUGH_DATA) {
        // console.log('onplay');
          dispatchEventAsync(video, 'playing')
        }
      }
    }
    function pause (forceEvents) {
    // console.log('pause');
      var video = this
      var player = video[ಠ]

      player.driver.pause()
      player.updater.stop()

      // if it's fullscreen, the developer the native player.pause()
      // This is at the end of pause() because it also
      // needs to make sure that the simulation is paused
      if (video.webkitDisplayingFullscreen) {
        video[ಠpause]()
      }

      if (player.paused && !forceEvents) {
        return
      }

      player.paused = true
      if (!player.hasAudio) {
        dispatchEventAsync(video, 'pause')
      }
      if (video.ended) {
        video[ಠevent] = true
        dispatchEventAsync(video, 'ended')
      }
    }

    /**
     * SETUP
     */

    function addPlayer (video, hasAudio) {
      var player = video[ಠ] = {}
      player.paused = true // track whether 'pause' events have been fired
      player.hasAudio = hasAudio
      player.video = video
      player.updater = intervalometer.frameIntervalometer(update.bind(player))

      if (hasAudio) {
        player.driver = getAudioFromVideo(video)
      } else {
        video.addEventListener('canplay', function () {
          if (!video.paused) {
          // console.log('oncanplay');
            dispatchEventAsync(video, 'playing')
          }
        })
        player.driver = {
          src: video.src || video.currentSrc || 'data:',
          muted: true,
          paused: true,
          pause: function () {
            player.driver.paused = true
          },
          play: function () {
            player.driver.paused = false
            // media automatically goes to 0 if .play() is called when it's done
            if (isPlayerEnded(player)) {
              setTime(video, 0)
            }
          },
          get ended () {
            return isPlayerEnded(player)
          }
        }
      }

      // .load() causes the emptied event
      video.addEventListener('emptied', function () {
      // console.log('driver src is', player.driver.src);
        var wasEmpty = !player.driver.src || player.driver.src === 'data:'
        if (player.driver.src && player.driver.src !== video.src) {
        // console.log('src changed to', video.src);
          setTime(video, 0, true)
          player.driver.src = video.src
          // playing videos will only keep playing if no src was present when .play()’ed
          if (wasEmpty) {
            player.driver.play()
          } else {
            player.updater.stop()
          }
        }
      }, false)

      // stop programmatic player when OS takes over
      video.addEventListener('webkitbeginfullscreen', function () {
        if (!video.paused) {
        // make sure that the <audio> and the syncer/updater are stopped
          video.pause()

          // play video natively
          video[ಠplay]()
        } else if (hasAudio && !player.driver.buffered.length) {
        // if the first play is native,
        // the <audio> needs to be buffered manually
        // so when the fullscreen ends, it can be set to the same current time
          player.driver.load()
        }
      })
      if (hasAudio) {
        video.addEventListener('webkitendfullscreen', function () {
        // sync audio to new video position
          player.driver.currentTime = video.currentTime
          // console.assert(player.driver.currentTime === video.currentTime, 'Audio not synced');
        })

        // allow seeking
        video.addEventListener('seeking', function () {
          if (lastRequests.indexOf(video.currentTime * 100 | 0 / 100) < 0) {
          // console.log('User-requested seeking');
            player.driver.currentTime = video.currentTime
          }
        })
      }
    }

    function overloadAPI (video) {
      var player = video[ಠ]
      video[ಠplay] = video.play
      video[ಠpause] = video.pause
      video.play = play
      video.pause = pause
      proxyProperty(video, 'paused', player.driver)
      proxyProperty(video, 'muted', player.driver, true)
      proxyProperty(video, 'playbackRate', player.driver, true)
      proxyProperty(video, 'ended', player.driver)
      proxyProperty(video, 'loop', player.driver, true)
      preventEvent(video, 'seeking')
      preventEvent(video, 'seeked')
      preventEvent(video, 'timeupdate', ಠevent, false)
      preventEvent(video, 'ended', ಠevent, false) // prevent occasional native ended events
    }

    function enableInlineVideo (video, hasAudio, onlyWhitelisted) {
      if (hasAudio === void 0) hasAudio = true
      if (onlyWhitelisted === void 0) onlyWhitelisted = true

      if ((onlyWhitelisted && !isWhitelisted) || video[ಠ]) {
        return
      }
      addPlayer(video, hasAudio)
      overloadAPI(video)
      video.classList.add('IIV')
      if (!hasAudio && video.autoplay) {
        video.play()
      }
      if (!/iPhone|iPod|iPad/.test(navigator.platform)) {
        console.warn('iphone-inline-video is not guaranteed to work in emulated environments')
      }
    }

    enableInlineVideo.isWhitelisted = isWhitelisted

    module.exports = enableInlineVideo
  }, { intervalometer: 1, 'poor-mans-symbol': 3 }],
  3: [function (require, module, exports) {
    'use strict'

    var index = typeof Symbol === 'undefined' ? function (description) {
      return '@' + (description || '@') + Math.random()
    } : Symbol

    module.exports = index
  }, {}],
  4: [function (require, module, exports) {
  /**
     *
     * (c) Wensheng Yan <yanwsh@gmail.com>
     * Date: 10/30/16
     *
     * For the full copyright and license information, please view the LICENSE
     * file that was distributed with this source code.
     */
    'use strict'

    Object.defineProperty(exports, '__esModule', {
      value: true
    })

    var _Detector = require('../lib/Detector')

    var _Detector2 = _interopRequireDefault(_Detector)

    var _MobileBuffering = require('../lib/MobileBuffering')

    var _MobileBuffering2 = _interopRequireDefault(_MobileBuffering)

    var _Util = require('../lib/Util')

    var _Util2 = _interopRequireDefault(_Util)

    function _interopRequireDefault (obj) { return obj && obj.__esModule ? obj : { default: obj } }

    var HAVE_CURRENT_DATA = 2

    var BaseCanvas = function BaseCanvas (baseComponent, THREE) {
      var settings = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {}

      return {
        constructor: function init (player, options) {
          this.settings = options
          // basic settings
          this.width = player.el().offsetWidth, this.height = player.el().offsetHeight
          this.lon = options.initLon, this.lat = options.initLat, this.phi = 0, this.theta = 0
          this.videoType = options.videoType
          this.clickToToggle = options.clickToToggle
          this.mouseDown = false
          this.isUserInteracting = false

          // define render
          this.renderer = new THREE.WebGLRenderer()
          this.renderer.setPixelRatio(window.devicePixelRatio)
          this.renderer.setSize(this.width, this.height)
          this.renderer.autoClear = false
          this.renderer.setClearColor(0x000000, 1)

          // define texture, on ie 11, we need additional helper canvas to solve rendering issue.
          var video = settings.getTech(player)
          this.supportVideoTexture = _Detector2.default.supportVideoTexture()
          this.liveStreamOnSafari = _Detector2.default.isLiveStreamOnSafari(video)
          if (this.liveStreamOnSafari) this.supportVideoTexture = false
          if (!this.supportVideoTexture) {
            this.helperCanvas = player.addChild('HelperCanvas', {
              video: video,
              width: options.helperCanvas.width ? options.helperCanvas.width : this.width,
              height: options.helperCanvas.height ? options.helperCanvas.height : this.height
            })
            var context = this.helperCanvas.el()
            this.texture = new THREE.Texture(context)
          } else {
            this.texture = new THREE.Texture(video)
          }

          video.style.visibility = 'hidden'

          this.texture.generateMipmaps = false
          this.texture.minFilter = THREE.LinearFilter
          this.texture.maxFilter = THREE.LinearFilter
          this.texture.format = THREE.RGBFormat

          this.el_ = this.renderer.domElement
          this.el_.classList.add('vjs-video-canvas')

          options.el = this.el_
          baseComponent.call(this, player, options)

          this.attachControlEvents()
          this.player().on('play', function () {
            this.time = new Date().getTime()
            this.startAnimation()
          }.bind(this))
        },

        attachControlEvents: function attachControlEvents () {
          this.on('mousemove', this.handleMouseMove.bind(this))
          this.on('touchmove', this.handleTouchMove.bind(this))
          this.on('mousedown', this.handleMouseDown.bind(this))
          this.on('touchstart', this.handleTouchStart.bind(this))
          this.on('mouseup', this.handleMouseUp.bind(this))
          this.on('touchend', this.handleTouchEnd.bind(this))
          if (this.settings.scrollable) {
            this.on('mousewheel', this.handleMouseWheel.bind(this))
            this.on('MozMousePixelScroll', this.handleMouseWheel.bind(this))
          }
          this.on('mouseenter', this.handleMouseEnter.bind(this))
          this.on('mouseleave', this.handleMouseLease.bind(this))
          this.on('dispose', this.handleDispose.bind(this))
        },

        handleDispose: function handleDispose (event) {
          this.off('mousemove', this.handleMouseMove.bind(this))
          this.off('touchmove', this.handleTouchMove.bind(this))
          this.off('mousedown', this.handleMouseDown.bind(this))
          this.off('touchstart', this.handleTouchStart.bind(this))
          this.off('mouseup', this.handleMouseUp.bind(this))
          this.off('touchend', this.handleTouchEnd.bind(this))
          if (this.settings.scrollable) {
            this.off('mousewheel', this.handleMouseWheel.bind(this))
            this.off('MozMousePixelScroll', this.handleMouseWheel.bind(this))
          }
          this.off('mouseenter', this.handleMouseEnter.bind(this))
          this.off('mouseleave', this.handleMouseLease.bind(this))
          this.off('dispose', this.handleDispose.bind(this))
          this.stopAnimation()
        },

        startAnimation: function startAnimation () {
          this.render_animation = true
          this.animate()
        },

        stopAnimation: function stopAnimation () {
          this.render_animation = false
          if (this.requestAnimationId) {
            cancelAnimationFrame(this.requestAnimationId)
          }
        },

        handleResize: function handleResize () {
          this.width = this.player().el().offsetWidth, this.height = this.player().el().offsetHeight
          this.renderer.setSize(this.width, this.height)
        },

        handleMouseUp: function handleMouseUp (event) {
          this.mouseDown = false
          if (this.clickToToggle) {
            var clientX = event.clientX || event.changedTouches && event.changedTouches[0].clientX
            var clientY = event.clientY || event.changedTouches && event.changedTouches[0].clientY
            if (typeof clientX === 'undefined' || clientY === 'undefined') return
            var diffX = Math.abs(clientX - this.onPointerDownPointerX)
            var diffY = Math.abs(clientY - this.onPointerDownPointerY)
            if (diffX < 0.1 && diffY < 0.1) this.player().paused() ? this.player().play() : this.player().pause()
          }
        },

        handleMouseDown: function handleMouseDown (event) {
          event.preventDefault()
          var clientX = event.clientX || event.touches && event.touches[0].clientX
          var clientY = event.clientY || event.touches && event.touches[0].clientY
          if (typeof clientX === 'undefined' || clientY === 'undefined') return
          this.mouseDown = true
          this.onPointerDownPointerX = clientX
          this.onPointerDownPointerY = clientY
          this.onPointerDownLon = this.lon
          this.onPointerDownLat = this.lat
        },

        handleTouchStart: function handleTouchStart (event) {
          if (event.touches.length > 1) {
            this.isUserPinch = true
            this.multiTouchDistance = _Util2.default.getTouchesDistance(event.touches)
          }
          this.handleMouseDown(event)
        },

        handleTouchEnd: function handleTouchEnd (event) {
          this.isUserPinch = false
          this.handleMouseUp(event)
        },

        handleMouseMove: function handleMouseMove (event) {
          var clientX = event.clientX || event.touches && event.touches[0].clientX
          var clientY = event.clientY || event.touches && event.touches[0].clientY
          if (typeof clientX === 'undefined' || clientY === 'undefined') return
          if (this.settings.clickAndDrag) {
            if (this.mouseDown) {
              this.lon = (this.onPointerDownPointerX - clientX) * 0.2 + this.onPointerDownLon
              this.lat = (clientY - this.onPointerDownPointerY) * 0.2 + this.onPointerDownLat
            }
          } else {
            var x = clientX - this.el_.offsetLeft
            var y = clientY - this.el_.offsetTop
            this.lon = x / this.width * 430 - 225
            this.lat = y / this.height * -180 + 90
          }
        },

        handleTouchMove: function handleTouchMove (event) {
        // handle single touch event,
          if (!this.isUserPinch || event.touches.length <= 1) {
            this.handleMouseMove(event)
          }
        },

        handleMobileOrientation: function handleMobileOrientation (event, x, y) {
          var portrait = typeof event.portrait !== 'undefined' ? event.portrait : window.matchMedia('(orientation: portrait)').matches
          var landscape = typeof event.landscape !== 'undefined' ? event.landscape : window.matchMedia('(orientation: landscape)').matches
          var orientation = event.orientation || window.orientation

          if (portrait) {
            this.lon = this.lon - y * this.settings.mobileVibrationValue
            this.lat = this.lat + x * this.settings.mobileVibrationValue
          } else if (landscape) {
            var orientationDegree = -90
            if (typeof orientation !== 'undefined') {
              orientationDegree = orientation
            }

            this.lon = orientationDegree == -90 ? this.lon + x * this.settings.mobileVibrationValue : this.lon - x * this.settings.mobileVibrationValue
            this.lat = orientationDegree == -90 ? this.lat + y * this.settings.mobileVibrationValue : this.lat - y * this.settings.mobileVibrationValue
          }
        },

        handleMobileOrientationDegrees: function handleMobileOrientationDegrees (event) {
          if (typeof event.rotationRate === 'undefined') return
          var x = event.rotationRate.alpha * Math.PI / 180
          var y = event.rotationRate.beta * Math.PI / 180
          this.handleMobileOrientation(event, x, y)
        },

        handleMobileOrientationRadians: function handleMobileOrientationRadians (event) {
          if (typeof event.rotationRate === 'undefined') return
          var x = event.rotationRate.alpha
          var y = event.rotationRate.beta
          this.handleMobileOrientation(event, x, y)
        },

        handleMouseWheel: function handleMouseWheel (event) {
          event.stopPropagation()
          event.preventDefault()
        },

        handleMouseEnter: function handleMouseEnter (event) {
          this.isUserInteracting = true
        },

        handleMouseLease: function handleMouseLease (event) {
          this.isUserInteracting = false
          if (this.mouseDown) {
            this.mouseDown = false
          }
        },

        animate: function animate () {
          if (!this.render_animation) return
          this.requestAnimationId = requestAnimationFrame(this.animate.bind(this))
          if (!this.player().paused()) {
            if (typeof this.texture !== 'undefined' && (!this.isPlayOnMobile && this.player().readyState() >= HAVE_CURRENT_DATA || this.isPlayOnMobile && this.player().hasClass('vjs-playing'))) {
              var ct = new Date().getTime()
              if (ct - this.time >= 30) {
                this.texture.needsUpdate = true
                this.time = ct
              }
              if (this.isPlayOnMobile) {
                var currentTime = this.player().currentTime()
                if (_MobileBuffering2.default.isBuffering(currentTime)) {
                  if (!this.player().hasClass('vjs-panorama-mobile-inline-video-buffering')) {
                    this.player().addClass('vjs-panorama-mobile-inline-video-buffering')
                  }
                } else {
                  if (this.player().hasClass('vjs-panorama-mobile-inline-video-buffering')) {
                    this.player().removeClass('vjs-panorama-mobile-inline-video-buffering')
                  }
                }
              }
            }
          }
          this.render()
        },

        render: function render () {
          if (!this.isUserInteracting) {
            var symbolLat = this.lat > this.settings.initLat ? -1 : 1
            var symbolLon = this.lon > this.settings.initLon ? -1 : 1
            if (this.settings.backToVerticalCenter) {
              this.lat = this.lat > this.settings.initLat - Math.abs(this.settings.returnStepLat) && this.lat < this.settings.initLat + Math.abs(this.settings.returnStepLat) ? this.settings.initLat : this.lat + this.settings.returnStepLat * symbolLat
            }
            if (this.settings.backToHorizonCenter) {
              this.lon = this.lon > this.settings.initLon - Math.abs(this.settings.returnStepLon) && this.lon < this.settings.initLon + Math.abs(this.settings.returnStepLon) ? this.settings.initLon : this.lon + this.settings.returnStepLon * symbolLon
            }
          }
          this.lat = Math.max(this.settings.minLat, Math.min(this.settings.maxLat, this.lat))
          this.lon = Math.max(this.settings.minLon, Math.min(this.settings.maxLon, this.lon))
          this.phi = THREE.Math.degToRad(90 - this.lat)
          this.theta = THREE.Math.degToRad(this.lon)

          if (!this.supportVideoTexture) {
            this.helperCanvas.update()
          }
          this.renderer.clear()
        },

        playOnMobile: function playOnMobile () {
          this.isPlayOnMobile = true
          if (this.settings.autoMobileOrientation) {
            if (_Util2.default.getChromeVersion() >= 66) {
            // Chrome is using degrees instead of radians
              window.addEventListener('devicemotion', this.handleMobileOrientationDegrees.bind(this))
            } else {
              window.addEventListener('devicemotion', this.handleMobileOrientationRadians.bind(this))
            }
          }
        },

        el: function el () {
          return this.el_
        }
      }
    }

    exports.default = BaseCanvas
  }, { '../lib/Detector': 6, '../lib/MobileBuffering': 8, '../lib/Util': 11 }],
  5: [function (require, module, exports) {
    'use strict'

    Object.defineProperty(exports, '__esModule', {
      value: true
    })

    var _BaseCanvas = require('./BaseCanvas')

    var _BaseCanvas2 = _interopRequireDefault(_BaseCanvas)

    var _Util = require('./Util')

    var _Util2 = _interopRequireDefault(_Util)

    function _interopRequireDefault (obj) { return obj && obj.__esModule ? obj : { default: obj } }

    /**
     * Created by yanwsh on 4/3/16.
     */

    var Canvas = function Canvas (baseComponent, THREE) {
      var settings = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {}

      var parent = (0, _BaseCanvas2.default)(baseComponent, THREE, settings)

      return _Util2.default.extend(parent, {
        constructor: function init (player, options) {
          parent.constructor.call(this, player, options)

          this.VRMode = false
          // define scene
          this.scene = new THREE.Scene()
          // define camera
          this.camera = new THREE.PerspectiveCamera(options.initFov, this.width / this.height, 1, 2000)
          this.camera.target = new THREE.Vector3(0, 0, 0)

          // define geometry
          var geometry = this.videoType === 'equirectangular' ? new THREE.SphereGeometry(500, 60, 40) : new THREE.SphereBufferGeometry(500, 60, 40).toNonIndexed()
          if (this.videoType === 'fisheye') {
            var normals = geometry.attributes.normal.array
            var uvs = geometry.attributes.uv.array
            for (var i = 0, l = normals.length / 3; i < l; i++) {
              var x = normals[i * 3 + 0]
              var y = normals[i * 3 + 1]
              var z = normals[i * 3 + 2]

              var r = Math.asin(Math.sqrt(x * x + z * z) / Math.sqrt(x * x + y * y + z * z)) / Math.PI
              if (y < 0) r = 1 - r
              var theta = x == 0 && z == 0 ? 0 : Math.acos(x / Math.sqrt(x * x + z * z))
              if (z < 0) theta = theta * -1
              uvs[i * 2 + 0] = -0.8 * r * Math.cos(theta) + 0.5
              uvs[i * 2 + 1] = 0.8 * r * Math.sin(theta) + 0.5
            }
            geometry.rotateX(options.rotateX)
            geometry.rotateY(options.rotateY)
            geometry.rotateZ(options.rotateZ)
          } else if (this.videoType === 'dual_fisheye') {
            var _normals = geometry.attributes.normal.array
            var _uvs = geometry.attributes.uv.array
            var _l = _normals.length / 3
            for (var _i = 0; _i < _l / 2; _i++) {
              var _x2 = _normals[_i * 3 + 0]
              var _y = _normals[_i * 3 + 1]
              var _z = _normals[_i * 3 + 2]

              var _r = _x2 == 0 && _z == 0 ? 1 : Math.acos(_y) / Math.sqrt(_x2 * _x2 + _z * _z) * (2 / Math.PI)
              _uvs[_i * 2 + 0] = _x2 * options.dualFish.circle1.rx * _r * options.dualFish.circle1.coverX + options.dualFish.circle1.x
              _uvs[_i * 2 + 1] = _z * options.dualFish.circle1.ry * _r * options.dualFish.circle1.coverY + options.dualFish.circle1.y
            }
            for (var _i2 = _l / 2; _i2 < _l; _i2++) {
              var _x3 = _normals[_i2 * 3 + 0]
              var _y2 = _normals[_i2 * 3 + 1]
              var _z2 = _normals[_i2 * 3 + 2]

              var _r2 = _x3 == 0 && _z2 == 0 ? 1 : Math.acos(-_y2) / Math.sqrt(_x3 * _x3 + _z2 * _z2) * (2 / Math.PI)
              _uvs[_i2 * 2 + 0] = -_x3 * options.dualFish.circle2.rx * _r2 * options.dualFish.circle2.coverX + options.dualFish.circle2.x
              _uvs[_i2 * 2 + 1] = _z2 * options.dualFish.circle2.ry * _r2 * options.dualFish.circle2.coverY + options.dualFish.circle2.y
            }
            geometry.rotateX(options.rotateX)
            geometry.rotateY(options.rotateY)
            geometry.rotateZ(options.rotateZ)
          }
          geometry.scale(-1, 1, 1)
          // define mesh
          this.mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: this.texture }))
          // this.mesh.scale.x = -1;
          this.scene.add(this.mesh)
        },

        enableVR: function enableVR () {
          this.VRMode = true
          if (typeof vrHMD !== 'undefined') {
            var eyeParamsL = vrHMD.getEyeParameters('left')
            var eyeParamsR = vrHMD.getEyeParameters('right')

            this.eyeFOVL = eyeParamsL.recommendedFieldOfView
            this.eyeFOVR = eyeParamsR.recommendedFieldOfView
          }

          this.cameraL = new THREE.PerspectiveCamera(this.camera.fov, this.width / 2 / this.height, 1, 2000)
          this.cameraR = new THREE.PerspectiveCamera(this.camera.fov, this.width / 2 / this.height, 1, 2000)
        },

        disableVR: function disableVR () {
          this.VRMode = false
          this.renderer.setViewport(0, 0, this.width, this.height)
          this.renderer.setScissor(0, 0, this.width, this.height)
        },

        handleResize: function handleResize () {
          parent.handleResize.call(this)
          this.camera.aspect = this.width / this.height
          this.camera.updateProjectionMatrix()
          if (this.VRMode) {
            this.cameraL.aspect = this.camera.aspect / 2
            this.cameraR.aspect = this.camera.aspect / 2
            this.cameraL.updateProjectionMatrix()
            this.cameraR.updateProjectionMatrix()
          }
        },

        handleMouseWheel: function handleMouseWheel (event) {
          parent.handleMouseWheel(event)
          // WebKit
          if (event.wheelDeltaY) {
            this.camera.fov -= event.wheelDeltaY * 0.05
            // Opera / Explorer 9
          } else if (event.wheelDelta) {
            this.camera.fov -= event.wheelDelta * 0.05
            // Firefox
          } else if (event.detail) {
            this.camera.fov += event.detail * 1.0
          }
          this.camera.fov = Math.min(this.settings.maxFov, this.camera.fov)
          this.camera.fov = Math.max(this.settings.minFov, this.camera.fov)
          this.camera.updateProjectionMatrix()
          if (this.VRMode) {
            this.cameraL.fov = this.camera.fov
            this.cameraR.fov = this.camera.fov
            this.cameraL.updateProjectionMatrix()
            this.cameraR.updateProjectionMatrix()
          }
        },

        handleTouchMove: function handleTouchMove (event) {
          parent.handleTouchMove.call(this, event)
          if (this.isUserPinch) {
            var currentDistance = _Util2.default.getTouchesDistance(event.touches)
            event.wheelDeltaY = (currentDistance - this.multiTouchDistance) * 2
            this.handleMouseWheel.call(this, event)
            this.multiTouchDistance = currentDistance
          }
        },

        render: function render () {
          parent.render.call(this)
          this.camera.target.x = 500 * Math.sin(this.phi) * Math.cos(this.theta)
          this.camera.target.y = 500 * Math.cos(this.phi)
          this.camera.target.z = 500 * Math.sin(this.phi) * Math.sin(this.theta)
          this.camera.lookAt(this.camera.target)

          if (!this.VRMode) {
            this.renderer.render(this.scene, this.camera)
          } else {
            var viewPortWidth = this.width / 2
            var viewPortHeight = this.height
            if (typeof vrHMD !== 'undefined') {
              this.cameraL.projectionMatrix = _Util2.default.fovToProjection(this.eyeFOVL, true, this.camera.near, this.camera.far)
              this.cameraR.projectionMatrix = _Util2.default.fovToProjection(this.eyeFOVR, true, this.camera.near, this.camera.far)
            } else {
              var lonL = this.lon + this.settings.VRGapDegree
              var lonR = this.lon - this.settings.VRGapDegree

              var thetaL = THREE.Math.degToRad(lonL)
              var thetaR = THREE.Math.degToRad(lonR)

              var targetL = _Util2.default.deepCopy(this.camera.target)
              targetL.x = 500 * Math.sin(this.phi) * Math.cos(thetaL)
              targetL.z = 500 * Math.sin(this.phi) * Math.sin(thetaL)
              this.cameraL.lookAt(targetL)

              var targetR = _Util2.default.deepCopy(this.camera.target)
              targetR.x = 500 * Math.sin(this.phi) * Math.cos(thetaR)
              targetR.z = 500 * Math.sin(this.phi) * Math.sin(thetaR)
              this.cameraR.lookAt(targetR)
            }
            // render left eye
            this.renderer.setViewport(0, 0, viewPortWidth, viewPortHeight)
            this.renderer.setScissor(0, 0, viewPortWidth, viewPortHeight)
            this.renderer.render(this.scene, this.cameraL)

            // render right eye
            this.renderer.setViewport(viewPortWidth, 0, viewPortWidth, viewPortHeight)
            this.renderer.setScissor(viewPortWidth, 0, viewPortWidth, viewPortHeight)
            this.renderer.render(this.scene, this.cameraR)
          }
        }
      })
    }

    exports.default = Canvas
  }, { './BaseCanvas': 4, './Util': 11 }],
  6: [function (require, module, exports) {
    'use strict'

    Object.defineProperty(exports, '__esModule', {
      value: true
    })
    /**
     * @author alteredq / http://alteredqualia.com/
     * @author mr.doob / http://mrdoob.com/
     */

    // in case it's running on node.js
    var win = {}

    if (typeof window !== 'undefined') {
      win = window
    }

    var Detector = {

      canvas: !!win.CanvasRenderingContext2D,
      webgl: (function () {
        try {
          var canvas = document.createElement('canvas'); return !!(win.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
        } catch (e) {
          return false
        }
      }()),
      workers: !!win.Worker,
      fileapi: win.File && win.FileReader && win.FileList && win.Blob,

      Check_Version: function Check_Version () {
        var rv = -1 // Return value assumes failure.

        if (navigator.appName == 'Microsoft Internet Explorer') {
          var ua = navigator.userAgent
          var re = new RegExp('MSIE ([0-9]{1,}[\\.0-9]{0,})')

          if (re.exec(ua) !== null) {
            rv = parseFloat(RegExp.$1)
          }
        } else if (navigator.appName == 'Netscape') {
        /// in IE 11 the navigator.appVersion says 'trident'
        /// in Edge the navigator.appVersion does not say trident
          if (navigator.appVersion.indexOf('Trident') !== -1) rv = 11; else {
            var ua = navigator.userAgent
            var re = new RegExp('Edge\/([0-9]{1,}[\\.0-9]{0,})')
            if (re.exec(ua) !== null) {
              rv = parseFloat(RegExp.$1)
            }
          }
        }

        return rv
      },

      supportVideoTexture: function supportVideoTexture () {
      // ie 11 and edge 12 doesn't support video texture.
        var version = this.Check_Version()
        return version === -1 || version >= 13
      },

      isLiveStreamOnSafari: function isLiveStreamOnSafari (videoElement) {
      // live stream on safari doesn't support video texture
        var videoSources = [].slice.call(videoElement.querySelectorAll('source'))
        var result = false
        if (videoElement.src && videoElement.src.indexOf('.m3u8') > -1) {
          videoSources.push({
            src: videoElement.src,
            type: 'application/x-mpegURL'
          })
        }
        for (var i = 0; i < videoSources.length; i++) {
          var currentVideoSource = videoSources[i]
          if ((currentVideoSource.type === 'application/x-mpegURL' || currentVideoSource.type === 'application/vnd.apple.mpegurl') && /(Safari|AppleWebKit)/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor)) {
            result = true
            break
          }
        }
        return result
      },

      getWebGLErrorMessage: function getWebGLErrorMessage () {
        var element = document.createElement('div')
        element.id = 'webgl-error-message'

        if (!this.webgl) {
          element.innerHTML = win.WebGLRenderingContext ? ['Your graphics card does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br />', 'Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.'].join('\n') : ['Your browser does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br/>', 'Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.'].join('\n')
        }

        return element
      },

      addGetWebGLMessage: function addGetWebGLMessage (parameters) {
        var parent, id, element

        parameters = parameters || {}

        parent = parameters.parent !== undefined ? parameters.parent : document.body
        id = parameters.id !== undefined ? parameters.id : 'oldie'

        element = Detector.getWebGLErrorMessage()
        element.id = id

        parent.appendChild(element)
      }

    }

    exports.default = Detector
  }, {}],
  7: [function (require, module, exports) {
    'use strict'

    Object.defineProperty(exports, '__esModule', {
      value: true
    })
    /**
     * Created by wensheng.yan on 5/23/16.
     */
    var HelperCanvas = function HelperCanvas (baseComponent) {
      var element = document.createElement('canvas')
      element.className = 'vjs-video-helper-canvas'
      return {
        constructor: function init (player, options) {
          this.videoElement = options.video
          this.width = options.width
          this.height = options.height

          element.width = this.width
          element.height = this.height
          element.style.display = 'none'
          options.el = element

          this.context = element.getContext('2d')
          this.context.drawImage(this.videoElement, 0, 0, this.width, this.height)
          baseComponent.call(this, player, options)
        },

        getContext: function getContext () {
          return this.context
        },

        update: function update () {
          this.context.drawImage(this.videoElement, 0, 0, this.width, this.height)
        },

        el: function el () {
          return element
        }
      }
    }

    exports.default = HelperCanvas
  }, {}],
  8: [function (require, module, exports) {
    'use strict'

    Object.defineProperty(exports, '__esModule', {
      value: true
    })
    /**
     * Created by yanwsh on 6/6/16.
     */
    var MobileBuffering = {
      prev_currentTime: 0,
      counter: 0,

      isBuffering: function isBuffering (currentTime) {
        if (currentTime == this.prev_currentTime) this.counter++; else this.counter = 0
        this.prev_currentTime = currentTime
        if (this.counter > 10) {
        // not let counter overflow
          this.counter = 10
          return true
        }
        return false
      }
    }

    exports.default = MobileBuffering
  }, {}],
  9: [function (require, module, exports) {
    'use strict'

    Object.defineProperty(exports, '__esModule', {
      value: true
    })

    var _typeof = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol' ? function (obj) { return typeof obj } : function (obj) { return obj && typeof Symbol === 'function' && obj.constructor === Symbol && obj !== Symbol.prototype ? 'symbol' : typeof obj }

    /**
     * Created by yanwsh on 4/4/16.
     */

    var Notice = function Notice (baseComponent) {
      var element = document.createElement('div')
      element.className = 'vjs-video-notice-label'

      return {
        constructor: function init (player, options) {
          if (_typeof(options.NoticeMessage) == 'object') {
            element = options.NoticeMessage
            options.el = options.NoticeMessage
          } else if (typeof options.NoticeMessage === 'string') {
            element.innerHTML = options.NoticeMessage
            options.el = element
          }

          baseComponent.call(this, player, options)
        },

        el: function el () {
          return element
        }
      }
    }

    exports.default = Notice
  }, {}],
  10: [function (require, module, exports) {
  /**
     *
     * (c) Wensheng Yan <yanwsh@gmail.com>
     * Date: 10/21/16
     *
     * For the full copyright and license information, please view the LICENSE
     * file that was distributed with this source code.
     */
    'use strict'

    Object.defineProperty(exports, '__esModule', {
      value: true
    })

    var _BaseCanvas = require('./BaseCanvas')

    var _BaseCanvas2 = _interopRequireDefault(_BaseCanvas)

    var _Util = require('./Util')

    var _Util2 = _interopRequireDefault(_Util)

    function _interopRequireDefault (obj) { return obj && obj.__esModule ? obj : { default: obj } }

    var ThreeDCanvas = function ThreeDCanvas (baseComponent, THREE) {
      var settings = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {}

      var parent = (0, _BaseCanvas2.default)(baseComponent, THREE, settings)
      return _Util2.default.extend(parent, {
        constructor: function init (player, options) {
          parent.constructor.call(this, player, options)
          // only show left part by default
          this.VRMode = false
          // define scene
          this.scene = new THREE.Scene()

          var aspectRatio = this.width / this.height
          // define camera
          this.cameraL = new THREE.PerspectiveCamera(options.initFov, aspectRatio, 1, 2000)
          this.cameraL.target = new THREE.Vector3(0, 0, 0)

          this.cameraR = new THREE.PerspectiveCamera(options.initFov, aspectRatio / 2, 1, 2000)
          this.cameraR.position.set(1000, 0, 0)
          this.cameraR.target = new THREE.Vector3(1000, 0, 0)

          var geometryL = new THREE.SphereBufferGeometry(500, 60, 40).toNonIndexed()
          var geometryR = new THREE.SphereBufferGeometry(500, 60, 40).toNonIndexed()

          var uvsL = geometryL.attributes.uv.array
          var normalsL = geometryL.attributes.normal.array
          for (var i = 0; i < normalsL.length / 3; i++) {
            uvsL[i * 2 + 1] = uvsL[i * 2 + 1] / 2
          }

          var uvsR = geometryR.attributes.uv.array
          var normalsR = geometryR.attributes.normal.array
          for (var i = 0; i < normalsR.length / 3; i++) {
            uvsR[i * 2 + 1] = uvsR[i * 2 + 1] / 2 + 0.5
          }

          geometryL.scale(-1, 1, 1)
          geometryR.scale(-1, 1, 1)

          this.meshL = new THREE.Mesh(geometryL, new THREE.MeshBasicMaterial({ map: this.texture }))

          this.meshR = new THREE.Mesh(geometryR, new THREE.MeshBasicMaterial({ map: this.texture }))
          this.meshR.position.set(1000, 0, 0)

          this.scene.add(this.meshL)

          if (options.callback) options.callback()
        },

        handleResize: function handleResize () {
          parent.handleResize.call(this)
          var aspectRatio = this.width / this.height
          if (!this.VRMode) {
            this.cameraL.aspect = aspectRatio
            this.cameraL.updateProjectionMatrix()
          } else {
            aspectRatio /= 2
            this.cameraL.aspect = aspectRatio
            this.cameraR.aspect = aspectRatio
            this.cameraL.updateProjectionMatrix()
            this.cameraR.updateProjectionMatrix()
          }
        },

        handleMouseWheel: function handleMouseWheel (event) {
          parent.handleMouseWheel(event)
          // WebKit
          if (event.wheelDeltaY) {
            this.cameraL.fov -= event.wheelDeltaY * 0.05
            // Opera / Explorer 9
          } else if (event.wheelDelta) {
            this.cameraL.fov -= event.wheelDelta * 0.05
            // Firefox
          } else if (event.detail) {
            this.cameraL.fov += event.detail * 1.0
          }
          this.cameraL.fov = Math.min(this.settings.maxFov, this.cameraL.fov)
          this.cameraL.fov = Math.max(this.settings.minFov, this.cameraL.fov)
          this.cameraL.updateProjectionMatrix()
          if (this.VRMode) {
            this.cameraR.fov = this.cameraL.fov
            this.cameraR.updateProjectionMatrix()
          }
        },

        enableVR: function enableVR () {
          this.VRMode = true
          this.scene.add(this.meshR)
          this.handleResize()
        },

        disableVR: function disableVR () {
          this.VRMode = false
          this.scene.remove(this.meshR)
          this.handleResize()
        },

        render: function render () {
          parent.render.call(this)
          this.cameraL.target.x = 500 * Math.sin(this.phi) * Math.cos(this.theta)
          this.cameraL.target.y = 500 * Math.cos(this.phi)
          this.cameraL.target.z = 500 * Math.sin(this.phi) * Math.sin(this.theta)
          this.cameraL.lookAt(this.cameraL.target)

          if (this.VRMode) {
            var viewPortWidth = this.width / 2
            var viewPortHeight = this.height
            this.cameraR.target.x = 1000 + 500 * Math.sin(this.phi) * Math.cos(this.theta)
            this.cameraR.target.y = 500 * Math.cos(this.phi)
            this.cameraR.target.z = 500 * Math.sin(this.phi) * Math.sin(this.theta)
            this.cameraR.lookAt(this.cameraR.target)

            // render left eye
            this.renderer.setViewport(0, 0, viewPortWidth, viewPortHeight)
            this.renderer.setScissor(0, 0, viewPortWidth, viewPortHeight)
            this.renderer.render(this.scene, this.cameraL)

            // render right eye
            this.renderer.setViewport(viewPortWidth, 0, viewPortWidth, viewPortHeight)
            this.renderer.setScissor(viewPortWidth, 0, viewPortWidth, viewPortHeight)
            this.renderer.render(this.scene, this.cameraR)
          } else {
            this.renderer.render(this.scene, this.cameraL)
          }
        }
      })
    }

    exports.default = ThreeDCanvas
  }, { './BaseCanvas': 4, './Util': 11 }],
  11: [function (require, module, exports) {
    'use strict'

    Object.defineProperty(exports, '__esModule', {
      value: true
    })
    /**
     * Created by wensheng.yan on 4/4/16.
     */
    function whichTransitionEvent () {
      var t
      var el = document.createElement('fakeelement')
      var transitions = {
        transition: 'transitionend',
        OTransition: 'oTransitionEnd',
        MozTransition: 'transitionend',
        WebkitTransition: 'webkitTransitionEnd'
      }

      for (t in transitions) {
        if (el.style[t] !== undefined) {
          return transitions[t]
        }
      }
    }

    function mobileAndTabletcheck () {
      var check = false;
      (function (a) {
        if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true
      })(navigator.userAgent || navigator.vendor || window.opera)
      return check
    }

    function isIos () {
      return (/iPhone|iPad|iPod/i.test(navigator.userAgent)
      )
    }

    function isRealIphone () {
      return (/iPhone|iPod/i.test(navigator.platform)
      )
    }

    // adopt code from: https://github.com/MozVR/vr-web-examples/blob/master/threejs-vr-boilerplate/js/VREffect.js
    function fovToNDCScaleOffset (fov) {
      var pxscale = 2.0 / (fov.leftTan + fov.rightTan)
      var pxoffset = (fov.leftTan - fov.rightTan) * pxscale * 0.5
      var pyscale = 2.0 / (fov.upTan + fov.downTan)
      var pyoffset = (fov.upTan - fov.downTan) * pyscale * 0.5
      return { scale: [pxscale, pyscale], offset: [pxoffset, pyoffset] }
    }

    function fovPortToProjection (fov, rightHanded, zNear, zFar) {
      rightHanded = rightHanded === undefined ? true : rightHanded
      zNear = zNear === undefined ? 0.01 : zNear
      zFar = zFar === undefined ? 10000.0 : zFar

      var handednessScale = rightHanded ? -1.0 : 1.0

      // start with an identity matrix
      var mobj = new THREE.Matrix4()
      var m = mobj.elements

      // and with scale/offset info for normalized device coords
      var scaleAndOffset = fovToNDCScaleOffset(fov)

      // X result, map clip edges to [-w,+w]
      m[0 * 4 + 0] = scaleAndOffset.scale[0]
      m[0 * 4 + 1] = 0.0
      m[0 * 4 + 2] = scaleAndOffset.offset[0] * handednessScale
      m[0 * 4 + 3] = 0.0

      // Y result, map clip edges to [-w,+w]
      // Y offset is negated because this proj matrix transforms from world coords with Y=up,
      // but the NDC scaling has Y=down (thanks D3D?)
      m[1 * 4 + 0] = 0.0
      m[1 * 4 + 1] = scaleAndOffset.scale[1]
      m[1 * 4 + 2] = -scaleAndOffset.offset[1] * handednessScale
      m[1 * 4 + 3] = 0.0

      // Z result (up to the app)
      m[2 * 4 + 0] = 0.0
      m[2 * 4 + 1] = 0.0
      m[2 * 4 + 2] = zFar / (zNear - zFar) * -handednessScale
      m[2 * 4 + 3] = zFar * zNear / (zNear - zFar)

      // W result (= Z in)
      m[3 * 4 + 0] = 0.0
      m[3 * 4 + 1] = 0.0
      m[3 * 4 + 2] = handednessScale
      m[3 * 4 + 3] = 0.0

      mobj.transpose()

      return mobj
    }

    function fovToProjection (fov, rightHanded, zNear, zFar) {
      var DEG2RAD = Math.PI / 180.0

      var fovPort = {
        upTan: Math.tan(fov.upDegrees * DEG2RAD),
        downTan: Math.tan(fov.downDegrees * DEG2RAD),
        leftTan: Math.tan(fov.leftDegrees * DEG2RAD),
        rightTan: Math.tan(fov.rightDegrees * DEG2RAD)
      }

      return fovPortToProjection(fovPort, rightHanded, zNear, zFar)
    }

    function extend (superClass) {
      var subClassMethods = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {}

      for (var method in superClass) {
        if (superClass.hasOwnProperty(method) && !subClassMethods.hasOwnProperty(method)) {
          subClassMethods[method] = superClass[method]
        }
      }
      return subClassMethods
    }

    function deepCopy (obj) {
      var to = {}

      for (var name in obj) {
        to[name] = obj[name]
      }

      return to
    }

    function getTouchesDistance (touches) {
      return Math.sqrt((touches[0].clientX - touches[1].clientX) * (touches[0].clientX - touches[1].clientX) + (touches[0].clientY - touches[1].clientY) * (touches[0].clientY - touches[1].clientY))
    }

    function getChromeVersion () {
      var match = navigator.userAgent.match(/.*Chrome\/([0-9]+)/)
      return match ? parseInt(match[1], 10) : null
    }

    exports.default = {
      whichTransitionEvent: whichTransitionEvent,
      mobileAndTabletcheck: mobileAndTabletcheck,
      isIos: isIos,
      isRealIphone: isRealIphone,
      fovToProjection: fovToProjection,
      extend: extend,
      deepCopy: deepCopy,
      getTouchesDistance: getTouchesDistance,
      getChromeVersion: getChromeVersion
    }
  }, {}],
  12: [function (require, module, exports) {
    'use strict'

    Object.defineProperty(exports, '__esModule', {
      value: true
    })
    /**
     * Created by yanwsh on 8/13/16.
     */

    var VRButton = function VRButton (ButtonComponent) {
      return {
        constructor: function init (player, options) {
          ButtonComponent.call(this, player, options)
        },

        buildCSSClass: function buildCSSClass () {
          return 'vjs-VR-control ' + ButtonComponent.prototype.buildCSSClass.call(this)
        },

        handleClick: function handleClick () {
          var canvas = this.player().getChild('Canvas')
          !canvas.VRMode ? canvas.enableVR() : canvas.disableVR()
          canvas.VRMode ? this.addClass('enable') : this.removeClass('enable')
          canvas.VRMode ? this.player().trigger('VRModeOn') : this.player().trigger('VRModeOff')
        },

        controlText_: 'VR'
      }
    }

    exports.default = VRButton
  }, {}],
  13: [function (require, module, exports) {
  /**
     * Created by yanwsh on 4/3/16.
     */
    'use strict'

    Object.defineProperty(exports, '__esModule', {
      value: true
    })

    var _Util = require('./lib/Util')

    var _Util2 = _interopRequireDefault(_Util)

    var _Detector = require('./lib/Detector')

    var _Detector2 = _interopRequireDefault(_Detector)

    function _interopRequireDefault (obj) { return obj && obj.__esModule ? obj : { default: obj } }

    var runOnMobile = typeof window !== 'undefined' ? _Util2.default.mobileAndTabletcheck() : false

    // Default options for the plugin.
    var defaults = {
      clickAndDrag: runOnMobile,
      showNotice: true,
      NoticeMessage: 'Please use your mouse drag and drop the video.',
      autoHideNotice: 3000,
      // limit the video size when user scroll.
      scrollable: true,
      initFov: 75,
      maxFov: 105,
      minFov: 51,
      // initial position for the video
      initLat: 0,
      initLon: -180,
      // A float value back to center when mouse out the canvas. The higher, the faster.
      returnStepLat: 0.5,
      returnStepLon: 2,
      backToVerticalCenter: !runOnMobile,
      backToHorizonCenter: !runOnMobile,
      clickToToggle: false,

      // limit viewable zoom
      minLat: -85,
      maxLat: 85,

      minLon: -Infinity,
      maxLon: Infinity,

      videoType: 'equirectangular',

      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,

      autoMobileOrientation: false,
      mobileVibrationValue: runOnMobile && _Util2.default.isIos() ? 0.022 : 1,

      VREnable: true,
      VRGapDegree: 2.5,

      closePanorama: false,

      helperCanvas: {},

      dualFish: {
        width: 1920,
        height: 1080,
        circle1: {
          x: 0.240625,
          y: 0.553704,
          rx: 0.23333,
          ry: 0.43148,
          coverX: 0.913,
          coverY: 0.9
        },
        circle2: {
          x: 0.757292,
          y: 0.553704,
          rx: 0.232292,
          ry: 0.4296296,
          coverX: 0.913,
          coverY: 0.9308
        }
      }
    }

    function playerResize (player) {
      var canvas = player.getChild('Canvas')
      return function () {
        player.el().style.width = window.innerWidth + 'px'
        player.el().style.height = window.innerHeight + 'px'
        canvas.handleResize()
      }
    }

    function fullscreenOnIOS (player, clickFn) {
      var resizeFn = playerResize(player)
      player.controlBar.fullscreenToggle.off('tap', clickFn)
      player.controlBar.fullscreenToggle.on('tap', function fullscreen () {
        var canvas = player.getChild('Canvas')
        if (!player.isFullscreen()) {
        // set to fullscreen
          player.isFullscreen(true)
          player.enterFullWindow()
          resizeFn()
          window.addEventListener('devicemotion', resizeFn)
        } else {
          player.isFullscreen(false)
          player.exitFullWindow()
          player.el().style.width = ''
          player.el().style.height = ''
          canvas.handleResize()
          window.removeEventListener('devicemotion', resizeFn)
        }
      })
    }

    /**
     * Function to invoke when the player is ready.
     *
     * This is a great place for your plugin to initialize itself. When this
     * function is called, the player will have its DOM and child components
     * in place.
     *
     * @function onPlayerReady
     * @param    {Player} player
     * @param    {Object} [options={}]
     */
    var onPlayerReady = function onPlayerReady (player, options, settings) {
      player.addClass('vjs-panorama')
      if (!_Detector2.default.webgl) {
        PopupNotification(player, {
          NoticeMessage: _Detector2.default.getWebGLErrorMessage(),
          autoHideNotice: options.autoHideNotice
        })
        if (options.callback) {
          options.callback()
        }
        return
      }
      player.addChild('Canvas', _Util2.default.deepCopy(options))
      var canvas = player.getChild('Canvas')
      if (runOnMobile) {
        var videoElement = settings.getTech(player)
        if (_Util2.default.isRealIphone()) {
          var makeVideoPlayableInline = require('iphone-inline-video')
          // ios 10 support play video inline
          videoElement.setAttribute('playsinline', '')
          makeVideoPlayableInline(videoElement, true)
        }
        if (_Util2.default.isIos()) {
          fullscreenOnIOS(player, settings.getFullscreenToggleClickFn(player))
        }
        player.addClass('vjs-panorama-mobile-inline-video')
        player.removeClass('vjs-using-native-controls')
        canvas.playOnMobile()
      }
      if (options.showNotice) {
        player.on('playing', function () {
          PopupNotification(player, _Util2.default.deepCopy(options))
        })
      }
      if (options.VREnable) {
        player.controlBar.addChild('VRButton', {}, player.controlBar.children().length - 1)
      }
      canvas.hide()
      player.on('play', function () {
        canvas.show()
      })
      player.on('fullscreenchange', function () {
        canvas.handleResize()
      })
      if (options.callback) options.callback()
    }

    var PopupNotification = function PopupNotification (player) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
        NoticeMessage: ''
      }

      var notice = player.addChild('Notice', options)

      if (options.autoHideNotice > 0) {
        setTimeout(function () {
          if (!notice.el_) {
            return
          }
          notice.addClass('vjs-video-notice-fadeOut')
          var transitionEvent = _Util2.default.whichTransitionEvent()
          var hide = function hide () {
            notice.hide()
            notice.removeClass('vjs-video-notice-fadeOut')
            notice.off(transitionEvent, hide)
          }
          notice.on(transitionEvent, hide)
        }, options.autoHideNotice)
      }
    }

    var plugin = function plugin () {
      var settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {}

      /**
         * A video.js plugin.
         *
         * In the plugin function, the value of `this` is a video.js `Player`
         * instance. You cannot rely on the player being in a "ready" state here,
         * depending on how the plugin is invoked. This may or may not be important
         * to you; if not, remove the wait for "ready"!
         *
         * @function panorama
         * @param    {Object} [options={}]
         *           An object of options left to the plugin author to define.
         */
      var videoTypes = ['equirectangular', 'fisheye', '3dVideo', 'dual_fisheye']
      var panorama = function panorama (options) {
        var _this = this

        if (settings.mergeOption) options = settings.mergeOption(defaults, options)
        if (typeof settings._init === 'undefined' || typeof settings._init !== 'function') {
          console.error('plugin must implement init function().')
          return
        }
        if (videoTypes.indexOf(options.videoType) == -1) options.videoType = defaults.videoType
        settings._init(options)
        /* implement callback function when videojs is ready */
        this.ready(function () {
          onPlayerReady(_this, options, settings)
        })
      }

      // Include the version number.
      panorama.VERSION = '0.1.7'

      return panorama
    }

    exports.default = plugin
  }, { './lib/Detector': 6, './lib/Util': 11, 'iphone-inline-video': 2 }],
  14: [function (require, module, exports) {
    'use strict'

    var _Canvas = require('./lib/Canvas')

    var _Canvas2 = _interopRequireDefault(_Canvas)

    var _ThreeCanvas = require('./lib/ThreeCanvas')

    var _ThreeCanvas2 = _interopRequireDefault(_ThreeCanvas)

    var _Notice = require('./lib/Notice')

    var _Notice2 = _interopRequireDefault(_Notice)

    var _HelperCanvas = require('./lib/HelperCanvas')

    var _HelperCanvas2 = _interopRequireDefault(_HelperCanvas)

    var _VRButton = require('./lib/VRButton')

    var _VRButton2 = _interopRequireDefault(_VRButton)

    var _plugin = require('./plugin')

    var _plugin2 = _interopRequireDefault(_plugin)

    function _interopRequireDefault (obj) { return obj && obj.__esModule ? obj : { default: obj } }

    function getTech (player) {
      return player.tech({ IWillNotUseThisInPlugins: true }).el()
    }

    function getFullscreenToggleClickFn (player) {
      return player.controlBar.fullscreenToggle.handleClick
    }

    var component = videojs.getComponent('Component')

    var notice = (0, _Notice2.default)(component)
    videojs.registerComponent('Notice', videojs.extend(component, notice))

    var helperCanvas = (0, _HelperCanvas2.default)(component)
    videojs.registerComponent('HelperCanvas', videojs.extend(component, helperCanvas))

    var button = videojs.getComponent('Button')
    var vrBtn = (0, _VRButton2.default)(button)
    videojs.registerComponent('VRButton', videojs.extend(button, vrBtn))

    // Register the plugin with video.js.
    videojs.plugin('panorama', (0, _plugin2.default)({
      _init: function _init (options) {
        var canvas = options.videoType !== '3dVideo' ? (0, _Canvas2.default)(component, window.THREE, {
          getTech: getTech
        }) : (0, _ThreeCanvas2.default)(component, window.THREE, {
          getTech: getTech
        })
        videojs.registerComponent('Canvas', videojs.extend(component, canvas))
      },
      mergeOption: function mergeOption (defaults, options) {
        return videojs.mergeOptions(defaults, options)
      },
      getTech: getTech,
      getFullscreenToggleClickFn: getFullscreenToggleClickFn
    }))
  }, { './lib/Canvas': 5, './lib/HelperCanvas': 7, './lib/Notice': 9, './lib/ThreeCanvas': 10, './lib/VRButton': 12, './plugin': 13 }]
}, {}, [14])
// # sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvaW50ZXJ2YWxvbWV0ZXIvZGlzdC9pbnRlcnZhbG9tZXRlci5jb21tb24tanMuanMiLCJub2RlX21vZHVsZXMvaXBob25lLWlubGluZS12aWRlby9kaXN0L2lwaG9uZS1pbmxpbmUtdmlkZW8uY29tbW9uLWpzLmpzIiwibm9kZV9tb2R1bGVzL3Bvb3ItbWFucy1zeW1ib2wvZGlzdC9wb29yLW1hbnMtc3ltYm9sLmNvbW1vbi1qcy5qcyIsInNyYy9zY3JpcHRzL2xpYi9CYXNlQ2FudmFzLmpzIiwic3JjL3NjcmlwdHMvbGliL0NhbnZhcy5qcyIsInNyYy9zY3JpcHRzL2xpYi9EZXRlY3Rvci5qcyIsInNyYy9zY3JpcHRzL2xpYi9IZWxwZXJDYW52YXMuanMiLCJzcmMvc2NyaXB0cy9saWIvTW9iaWxlQnVmZmVyaW5nLmpzIiwic3JjL3NjcmlwdHMvbGliL05vdGljZS5qcyIsInNyYy9zY3JpcHRzL2xpYi9UaHJlZUNhbnZhcy5qcyIsInNyYy9zY3JpcHRzL2xpYi9VdGlsLmpzIiwic3JjL3NjcmlwdHMvbGliL1ZSQnV0dG9uLmpzIiwic3JjL3NjcmlwdHMvcGx1Z2luLmpzIiwic3JjL3NjcmlwdHMvcGx1Z2luX3Y1LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7Ozs7Ozs7O0FBUUE7Ozs7OztBQUVBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRUEsSUFBTSxvQkFBb0IsQ0FBMUI7O0FBRUEsSUFBSSxhQUFhLFNBQWIsVUFBYSxDQUFVLGFBQVYsRUFBeUIsS0FBekIsRUFBK0M7QUFBQSxRQUFmLFFBQWUsdUVBQUosRUFBSTs7QUFDNUQsV0FBTztBQUNILHFCQUFhLFNBQVMsSUFBVCxDQUFjLE1BQWQsRUFBc0IsT0FBdEIsRUFBOEI7QUFDdkMsaUJBQUssUUFBTCxHQUFnQixPQUFoQjtBQUNBO0FBQ0EsaUJBQUssS0FBTCxHQUFhLE9BQU8sRUFBUCxHQUFZLFdBQXpCLEVBQXNDLEtBQUssTUFBTCxHQUFjLE9BQU8sRUFBUCxHQUFZLFlBQWhFO0FBQ0EsaUJBQUssR0FBTCxHQUFXLFFBQVEsT0FBbkIsRUFBNEIsS0FBSyxHQUFMLEdBQVcsUUFBUSxPQUEvQyxFQUF3RCxLQUFLLEdBQUwsR0FBVyxDQUFuRSxFQUFzRSxLQUFLLEtBQUwsR0FBYSxDQUFuRjtBQUNBLGlCQUFLLFNBQ
