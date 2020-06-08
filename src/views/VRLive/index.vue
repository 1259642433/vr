<template>
  <div class="vrlive">
    <div id="videoContainer" class="vr-video">
      <div class="video-wrapper">
        <div id="video" @mousemove="ControlVisible()">
        </div>
        <div class="vr-statistics">
          <p>type：{{playVariables.type || '???'}}</p>
          <p>status：{{playVariables.status || '???'}}</p>
          <p>currentTime: {{playVariables.currentTime}}</p>
          <p>totalTime: {{playVariables.totalTime}}</p>
        </div>
        <div class="vr-func">
          <div v-if="playVariables.status == 'pause'&&!playVariables.playClick"
            @click="player.play();playVariables.playClick=true" class="btns-play">
            <i class="iconfont icon-icon_play"></i>
          </div>
          <div v-else-if="playVariables.status == 'playing'&&!playVariables.playClick" @click="player.pause()"
            class="btns-pause">
            <i class="iconfont icon-ai07"></i>
          </div>
        </div>
        <div v-if="playVariables.status == 'loading'" class="vr-loading">
          <div class="border"></div>
          <div class="slow"></div>
          <div class="fast"></div>
        </div>
        <div class="vr-bar" v-if="playVariables.playClick" id="control">
          <div class="bg"></div>
          <div class="btns">
            <div v-if="playVariables.status === 'playing'" @click="player.pause()" class="btns-pause">
              <i class="iconfont icon-ai07"></i>
            </div>
            <div v-else @click="player.play()" class="btns-play">
              <i class="iconfont icon-icon_play"></i>
            </div>
          </div>
          <div v-if="playVariables.type == 'Normal'" class="progress-container">
            <div @click="jumpTo($event)" class="progress-wrapper">
              <div class="progress" id="progress-play"></div>
            </div>
            <div class="btn-wrapper">
              <div class="btn" id="progress-btn"></div>
            </div>
          </div>
          <div v-else class="type">
            <span class="statu-circle"></span>
            <span>{{playVariables.type}}</span>
          </div>
          <div @click="changeFullscreenStatu()" class="fullscreen">
            <i class="iconfont icon-quanping"></i>
          </div>
        </div>
      </div>
    </div>
    <div class="playType">
      <button>普通视频</button>
      <button>HLS</button>
      <!-- <button>rtmp</button> -->
      <button>FLV</button>
    </div>
    <div class="orientation">
      <p>
        陀螺仪数据:
      </p>
      <p>
        alpha(z轴):{{deviceOrientationData.alpha||'手机查看参数'}}
      </p>
      <p>
        beta(x轴):{{deviceOrientationData.beta||'手机查看参数'}}
      </p>
      <p>
        gamma(y轴):{{deviceOrientationData.gamma||'手机查看参数'}}
      </p>
    </div>
    <video src="https://www.wangwentehappy.tk/assets/video/1.mp4" preload="auto" controls></video>
  </div>
</template>

<script>
import * as THREE from 'three'
// const OrbitControls = require('three/examples/js/controls/OrbitControls')
import threeOrbitControls from 'three-orbit-controls'
// import { error } from 'three'
const OrbitControls = threeOrbitControls(THREE)

export default {
  name: 'VRLive',
  data () {
    return {
      camera: null,
      scene: null,
      renderer: null,
      mesh: null,
      video: null,
      controls: null,
      deviceOrientationData: {},
      hls: null,
      player: {},
      videoContainer: '',
      playVariables: {
        /*
              视频类型
              Normal:加载中,
              HLS:视频播放中,包括视频中间加载后继续播放
              FLV:暂停或用户未点开始按钮 (http-flv,websocket-flv)
            */
        /*
          测试地址
          http://localhost:8000/wwt/.flv
          http://ivi.bupt.edu.cn/hls/cctv3hd.m3u8
          https://www.wangwentehappy.tk/assets/video/1.mp4
       */
        type: 'Normal',
        source: '',
        /*
              播放状态，与视频播放状态对应
              loading:加载中,
              playing:视频播放中,包括视频中间加载后继续播放
              pause:暂停或用户未点开始按钮
        */
        status: 'pause',
        playClick: false,
        // 控件显示状态
        currentTime: 0,
        progress: 0,
        fullscreenStatu: false,
        error: {
          code: 0,
          msg: ''
        }
      }
    }
  },
  watch: {
    playVariables (val) {

    }
    // 'player.currentTime': {
    //   handler (val) {
    //     console.log(val)
    //     this.player.currentTime = 500
    //   },
    //   deep: true
    // }
  },
  mounted () {
    this.videoContainer = document.getElementById('videoContainer')
    this.init()
    console.log(screen)
    console.log(screen.orientation)
    // alert(orientation)
  },
  methods: {
    init () {
      const container = document.getElementById('video')
      this.initScene()
      this.initCamera(container)
      this.initRenderer(container)
      this.initContent()
      this.initControls(container)
      this.render()
      // this.addMouseEvent(container)
      // window.addEventListener('deviceorientation', function (event) {
      //   this.deviceOrientationData = event
      // }.bind(this), false)
      window.addEventListener('resize', function () {
        this.onWindowResize(container)
      }.bind(this))
    },
    initScene () {
      this.scene = new THREE.Scene()
    },
    initCamera (el) {
      this.camera = new THREE.PerspectiveCamera(75, el.clientWidth / el.clientHeight, 1, 1100)
      this.camera.position.set(1, 0, 0)
    },
    initRenderer (el) {
      this.renderer = new THREE.WebGLRenderer()
      this.renderer.setSize(el.offsetWidth, el.offsetHeight)
      el.appendChild(this.renderer.domElement)
    },
    initVideo () {
      this.video = document.createElement('video')
      this.video.preload = 'auto'
      this.video.muted = true
      this.video.crossOrigin = 'anonymous'
      this.video.addEventListener('waiting', function (event) {
        this.playVariables.status = 'loading'
      }.bind(this))
      this.video.addEventListener('playing', function (event) {
        this.playVariables.status = 'playing'
      }.bind(this))
      this.video.addEventListener('pause', function (event) {
        this.playVariables.status = 'pause'
      }.bind(this))
      this.video.addEventListener('canplay', function (event) {
        this.playVariables.duration = this.player.duration
        if (this.playVariables.status === 'loading') {
          this.playVariables.status = 'playing'
        }
      }.bind(this))
      if (this.playVariables.type === 'normal') {
        this.video.addEventListener('timeupdate', function (event) {
          this.playVariables.currentTime = Math.floor(this.player.currentTime)
          this.playVariables.totalTime = this.playVariables.totalTime ? this.playVariables.totalTime : Math.floor(
            this.player.duration)
          this.playVariables.progress = this.playVariables.currentTime / this.playVariables.totalTime
          document.getElementById('progress-play').style.width = (this.playVariables.progress) * 100 + '%'
          document.getElementById('progress-btn').style.marginLeft = (this.playVariables.progress) * 100 + '%'
        }.bind(this))
      }
      // 判断视频类型
      if (this.playVariables.type === 'FLV') {
        this.getFLV('http://localhost:8000/wwt/.flv', this.video)
      } else if (this.playVariables.type === 'HLS') {
        this.getHLS('http://ivi.bupt.edu.cn/hls/cctv3hd.m3u8', this.video)
      } else if (this.playVariables.type === 'Normal') {
        this.getNormalVideo('https://www.wangwentehappy.tk/assets/video/1.mp4', this.video)
      } else {
        this.playVariables.error.code = 1
        this.playVariables.error.msg = '未知的视频类型'
      }
    },
    initContent () {
      this.initVideo()
      var geometry = new THREE.SphereBufferGeometry(300, 90, 90)
      geometry.scale(-1, 1, 1)
      var texture = new THREE.VideoTexture(this.video)
      texture.minFilter = THREE.LinearFilter
      texture.format = THREE.RGBFormat
      var material = new THREE.MeshBasicMaterial({
        map: texture
      })
      this.mesh = new THREE.Mesh(geometry, material)
      this.mesh.position.set(0, 0, 0)
      console.log(this.mesh)
      // this.mesh.rotation.x = Math.PI / 2
      // this.mesh.rotation.y = Math.PI / 2
      // this.mesh.rotation.z = Math.PI / 2
      this.scene.add(this.mesh)
    },
    initControls (el) {
      this.controls = new OrbitControls(this.camera, el)
      // this.controls.target = new THREE.Vector3(0, Math.PI, 0)
      this.controls.rotateSpeed = 0.05
      this.controls.enableDamping = true
      this.controls.dampingFactor = 0.05
    },
    render () {
      requestAnimationFrame(this.render)
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    },
    getNormalVideo (sourceURL, el) {
      const source = document.createElement('source')
      source.src = sourceURL
      source.type = 'video/mp4'
      el.appendChild(source)
      this.player = el
    },
    getHLS (sourceURL, el) {
      const Hls = require('hls.js')
      if (Hls.isSupported()) {
        this.hls = new Hls()
        this.hls.loadSource(sourceURL)
        this.hls.attachMedia(el)
        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('加载成功')
        })
        this.hls.on(Hls.Events.ERROR, (event, data) => {
          console.log('加载失败')
        })
      }
      this.player = el
    },
    // abandoned 对接rtmp流
    // 非原生video标签。
    // confuse object?如何渲染?
    // getRTMP (sourceURL, el) {
    //   el.id = 'rtmpVideo'
    //   console.log(el)
    //   this.player = videojs(el, {
    //     sources: [{
    //       src: sourceURL
    //     }]
    //   })
    //   this.player.on('ready', function () {
    //     console.log('准备就绪')
    //   })
    // },
    getFLV (sourceURL, el) {
      const flv = require('flv.js').default
      if (flv.isSupported()) {
        var flvPlayer = flv.createPlayer({
          type: 'flv',
          url: sourceURL
        })
        flvPlayer.attachMediaElement(el)
        flvPlayer.load()
        this.player = flvPlayer
      }
    },
    onWindowResize (el) {
      this.camera.aspect = el.clientWidth / el.clientHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(el.clientWidth, el.clientHeight)
    },
    ControlVisible () {
      const control = document.getElementById('control')
      if (this.playVariables.status === 'playing') {
        if (control.classList.contains('control-hidden')) {
          control.classList.remove('control-hidden')
          setTimeout(() => {
            control.classList.add('control-hidden')
          }, 0)
        } else {
          control.classList.add('control-hidden')
        }
      }
    },
    // jumpTo ($e) {
    //   console.log(e)
    // }
    async changeFullscreenStatu () {
      if (this.playVariables.fullscreenStatu) {
        this.exitFullscreen()
        screen.orientation.unlock()
        this.videoContainer.classList.remove('fullScreen-mobile')
      } else {
        this.fullScreen()
        // 只在谷歌浏览器下生效
        screen.orientation.lock('landscape-primary')
        // screen.lockOrientationUniversal = screen.lockOrientation || screen.mozLockOrientation || screen.msLockOrientation
        // new ScreenOrientation().lock('landscape-secondary')
        // console.log(screen)
        // screen.msLockOrientation.lock('landscape-primary')
        this.videoContainer.classList.add('fullScreen-mobile')
      }
      this.playVariables.fullscreenStatu = !this.playVariables.fullscreenStatu
    },
    fullScreen () {
      const el = this.videoContainer
      if (el.requestFullscreen) {
        el.requestFullscreen()
      } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen()
      } else if (el.webkitRequestFullScreen) {
        el.webkitRequestFullScreen()
      }
    },
    exitFullscreen () {
      const el = document
      el.exitFullscreen()
      if (el.exitFullscreen) {
        el.exitFullscreen()
      } else if (el.mozCancelFullScreen) {
        el.mozCancelFullScreen()
      } else if (el.webkitCancelFullScreen) {
        el.webkitCancelFullScreen()
      }
    }
    // abandoned 对接鼠标移动事件
    // addMouseEvent (el) {
    //   const pre = {
    //     x: '',
    //     y: ''
    //   }
    //   // const cur = {
    //   //   x: '',
    //   //   y: ''
    //   // }
    //   let isDown = false
    //   const self = this
    //   el.onmousedown = function (event) {
    //     isDown = true
    //   }
    //   el.onmouseup = function (event) {
    //     isDown = false
    //   }
    //   el.onmousemove = function (event) {
    //     if (isDown) {
    //       console.log(event)
    //       console.log(pre)
    //       console.log(self.camera)
    //       if (event.movementY && !event.movementX) {
    //         self.camera.rotation.x -= event.movementY / 500
    //       } else if (!event.movementY && event.movementX) {
    //         self.camera.rotation.y += event.movementX / 500
    //       } else {
    //         pre.x = event.clientX
    //       }
    //       pre.y = event.clientY
    //     }
    //   }
    // }
  }
}

</script>

<style lang="scss" scoped>
  .vrlive {
    overflow-y: visible;

    .vr-video {
      position: relative;
      .video-wrapper{
        height: calc(100vw / 16 * 9);
      }
      #video {
        height: 100%;
        &:hover {
          .control {
            display: block;
            animation: mousehover 3s;
            animation-delay: 5s;
            animation-fill-mode: forwards;
          }
        }

      }

      .control-hidden {
        visibility: visible;
        opacity: 1;
        animation: mousehover 2s;
        animation-delay: 3s;
        animation-fill-mode: forwards;
      }

      @keyframes mousehover {
        100% {
          visibility: hidden;
          opacity: 0;
        }
      }

      .vr {
        &-func {
          position: absolute;
          z-index: 2;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          height: 50px;
          font-size: 16px;

          .btns-play,
          .btns-pause {
            i {
              font-size: 4em;
              color: rgba(255, 255, 255, 1);
              transition: color .3s;
            }

            &:hover {
              cursor: pointer;

              i {
                color: rgba(255, 255, 255, 0.6);
              }
            }
          }
        }

        &-loading {
          position: absolute;
          z-index: 2;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          width: 3em;
          height: 3em;

          .border {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: 0.45em solid rgba(99, 149, 168, 0.5);
            border-radius: 50%;
          }

          .slow {
            position: absolute;
            z-index: 2;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-width: 0.45em;
            border-style: solid;
            border: 0.45em solid rgba(0, 0, 0, 0);
            border-top-color: rgb(7, 186, 241);
            animation: slow 1.5s linear infinite;
            border-radius: 50%;
          }

          .fast {
            position: absolute;
            z-index: 1;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-width: 0.45em;
            border-style: solid;
            border: 0.45em solid rgba(0, 0, 0, 0);
            border-top-color: rgb(10, 126, 161);
            animation: fast 0.75s linear infinite;
            border-radius: 50%;
          }

          @keyframes slow {
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes fast {
            0% {
              transform: rotate(0deg);
            }

            25% {
              transform: rotate(45deg);
            }

            50% {
              border-top-color: rgb(195, 236, 248);
            }

            75% {
              transform: rotate(315deg);
            }

            100% {
              transform: rotate(360deg);
            }
          }
        }

        &-bar {
          position: absolute;
          z-index: 10;
          bottom: 0;
          display: flex;
          align-items: center;
          padding: 1em 1em;
          box-sizing: border-box;
          width: 100%;
          background-image: linear-gradient(to top, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0));

          .btns {
            padding: 0.5em;

            &-play,
            &-pause {
              i {
                color: white;
              }
            }

            &:hover {
              cursor: pointer;
            }
          }

          .progress-container {
            position: relative;
            flex-grow: 1;
            display: flex;
            align-items: center;
            padding: 0 1em;

            .progress-wrapper {
              position: relative;
              width: 100%;
              height: 0.2em;
              border-radius: 30px;
              background-color: rgba(150, 150, 150, 1);
              overflow: hidden;

              .progress {
                position: absolute;
                width: 0%;
                height: 100%;
                background-color: rgb(22, 175, 236);
                transition: width .5s;
              }

              &:hover {
                cursor: pointer;
              }
            }

            .btn-wrapper {
              position: absolute;
              z-index: 9;
              left: 1em;
              width: calc(100% - 2em);

              .btn {
                margin-left: 0;
                width: 0.8em;
                height: 0.8em;
                border-radius: 50%;
                background-color: white;
              }
            }
          }

          .type {
            padding: 0 2em;
            font-size: 0.95em;
            font-weight: 300;
            color: white;

            .statu-circle {}
          }

          .fullscreen {
            i {
              font-size: 1.4em;
              color: white;
            }

            &:hover {
              cursor: pointer;
            }
          }
        }

        &-statistics {
          position: absolute;
          z-index: 1;
          top: 1em;
          left: 1em;
          padding: 0.2em 1em;
          font-size: 13px;
          color: white;
          background-color: rgba(0, 0, 0, 0.4);
          border-radius: 0.2em;
        }
      }

    }

    .fullScreen-mobile {
      .video-wrapper{
        position: absolute;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        // transform-origin:top left;
        // transform: rotate(90deg) translate(-0vh, -100vw);
      }
      #video {

      }
    }

    .orientation {
      padding: 0 20px;
      font-size: 14px;
      color: white;
    }

    .playType {
      display: flex;
      justify-content: center;
      margin-top: 30px;
      width: 100vw;

      button {
        margin-right: 20px;
        padding: 10px 15px;
        font-size: 15px;
        color: white;
        background-image: linear-gradient(135deg, #ABDCFF 10%, #0396FF 100%);
        border-radius: 5px;
        transition: all .3s;

        &:hover {
          transform: translateY(-2px);
          background-image: linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%);
          box-shadow: 0 2px 5px #40bad5;
        }
      }
    }

    video {
      display: block;
      margin-top: 20px;
      width: 100%;

    }
  }

</style>
